import React from "react";
import { Alert } from "react-native";
import { cleanup, fireEvent, render, userEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockAudioState = { isRecording: false, durationMillis: 2300 };

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));
jest.mock("@clerk/expo", () => ({ useAuth: () => ({ getToken: jest.fn() }) }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-audio", () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })) },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(async () => {}),
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(async () => {}),
    record: jest.fn(() => { mockAudioState.isRecording = true; }),
    stop: jest.fn(async () => { mockAudioState.isRecording = false; }),
    get uri() { return "file:///legacy-recording.m4a"; },
    get isRecording() { return mockAudioState.isRecording; },
  })),
  useAudioRecorderState: jest.fn(() => mockAudioState),
  useAudioPlayer: jest.fn(() => ({ pause: jest.fn(), play: jest.fn(), replace: jest.fn() })),
  useAudioPlayerStatus: jest.fn(() => ({ playing: false, didJustFinish: false })),
}));
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 2048 })),
  deleteAsync: jest.fn(async () => {}),
  createUploadTask: jest.fn(() => ({
    uploadAsync: jest.fn(async () => ({ status: 200 })),
  })),
}));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));
jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#191919", foreground: "#fff", card: "#222", primary: "#c9a439",
    primaryForeground: "#191919", muted: "#333", mutedForeground: "#888",
    border: "#444", accent: "#c9a439",
  }),
}));
jest.mock("@workspace/api-client-react", () => require("./__mocks__/api-client-react"));

function withProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

let Screen: React.ComponentType;
let mockApi: typeof import("./__mocks__/api-client-react");
let alertSpy: jest.SpyInstance;
let uploadCounter = 0;

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react");
  Screen = require("../app/(tabs)/life/legacy-letters").default;
});

beforeEach(async () => {
  await cleanup();
  mockApi.__reset();
  uploadCounter = 0;
  mockAudioState.isRecording = false;
  jest.spyOn(require("expo-document-picker"), "getDocumentAsync").mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///attachment.mp4", name: "attachment.mp4", mimeType: "video/mp4", size: 1200 }],
  } as never);
  mockApi.requestUploadUrl.mockImplementation(async ({ name, purpose }: any) => ({
    uploadURL: "https://example.com/upload",
    objectPath: `/objects/uploads/1/${purpose === "legacy-letter" ? "legacy-letters/" : ""}new-${++uploadCounter}-${name}`,
  }));
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

async function openLetterForm() {
  const user = userEvent.setup();
  const screen = await render(withProviders(<Screen />));
  await user.press(screen.getByLabelText("Create legacy letter"));
  await user.type(screen.getByPlaceholderText("Letter title"), "A letter for later");
  await user.type(screen.getByPlaceholderText("To (name)"), "Alex");
  return { ...screen, user };
}

describe("Legacy Letters save flows", () => {
  it("saves written letters without uploading media", async () => {
    const create = jest.fn(async (_args: any) => ({ id: 1 }));
    mockApi.useCreateLegacyLetter.mockImplementation(() => ({ mutateAsync: create, isPending: false }) as never);
    const { user, getByPlaceholderText, getByText } = await openLetterForm();

    await user.type(getByPlaceholderText("Write your letter…"), "Always remember this.");
    await user.press(getByText("Save as Draft"));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]?.data).toMatchObject({
      mediaType: "text",
      content: "Always remember this.",
      mediaUrl: null,
    });
    expect(mockApi.requestUploadUrl).not.toHaveBeenCalled();
    expect(mockApi.cleanupLegacyLetterUpload).not.toHaveBeenCalled();
  });

  it("saves a recorded voice letter with its uploaded object path", async () => {
    const create = jest.fn(async (_args: any) => ({ id: 2 }));
    mockApi.useCreateLegacyLetter.mockImplementation(() => ({ mutateAsync: create, isPending: false }) as never);
    const { user, getByLabelText, getByText, queryByText } = await openLetterForm();

    await user.press(getByText("Voice Recording"));
    await user.press(getByLabelText("Start voice letter recording"));
    await waitFor(() => expect(getByLabelText("Stop voice letter recording")).toBeTruthy());
    await user.press(getByLabelText("Stop voice letter recording"));
    await waitFor(() => expect(getByText(/legacy-voice-/)).toBeTruthy());
    await user.press(getByText("Save as Draft"));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]?.data).toMatchObject({
      mediaType: "voice",
      mediaUrl: expect.stringMatching(/^\/objects\/uploads\/1\//),
      mediaDurationSec: 2,
    });
    expect(mockApi.cleanupLegacyLetterUpload).not.toHaveBeenCalled();
  });

  it("saves a video attachment with its uploaded object path", async () => {
    const create = jest.fn(async (_args: any) => ({ id: 3 }));
    mockApi.useCreateLegacyLetter.mockImplementation(() => ({ mutateAsync: create, isPending: false }) as never);
    const { user, getByLabelText, getByText } = await openLetterForm();

    await user.press(getByText("Video"));
    await user.press(getByLabelText("Attach video file"));
    await waitFor(() => expect(getByText("attachment.mp4")).toBeTruthy());
    await user.press(getByText("Save as Draft"));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]?.data).toMatchObject({
      mediaType: "video",
      mediaUrl: expect.stringMatching(/^\/objects\/uploads\/1\//),
    });
    expect(mockApi.requestUploadUrl).toHaveBeenCalledWith(expect.objectContaining({
      purpose: "legacy-letter",
    }));
    expect(mockApi.cleanupLegacyLetterUpload).not.toHaveBeenCalled();
  });

  it("cleans up a definitely rejected upload and allows retry with a fresh upload", async () => {
    const failure = Object.assign(new Error("Letter validation failed"), { status: 400 });
    const create = jest.fn(async (_args: any) => ({ id: 4 }))
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ id: 4 });
    mockApi.useCreateLegacyLetter.mockImplementation(() => ({ mutateAsync: create, isPending: false }) as never);
    const { user, getByLabelText, getByText } = await openLetterForm();

    await user.press(getByText("Voice Recording"));
    (require("expo-document-picker").getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///retry-audio.mp3", name: "retry-audio.mp3", mimeType: "audio/mpeg", size: 900 }],
    });
    await user.press(getByLabelText("Attach audio file"));
    await waitFor(() => expect(getByText("retry-audio.mp3")).toBeTruthy());
    await user.press(getByText("Save as Draft"));

    await waitFor(() => expect(mockApi.cleanupLegacyLetterUpload).toHaveBeenCalledWith({
      objectPath: "/objects/uploads/1/legacy-letters/new-1-retry-audio.mp3",
    }));
    expect(alertSpy).toHaveBeenCalledWith("Couldn't save letter", "Letter validation failed");
    expect(getByText("retry-audio.mp3")).toBeTruthy();

    await user.press(getByText("Save as Draft"));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1]?.[0]?.data.mediaUrl).toBe("/objects/uploads/1/legacy-letters/new-2-retry-audio.mp3");
    expect(mockApi.cleanupLegacyLetterUpload).toHaveBeenCalledTimes(1);
  });

  it("reuses the same uploaded object for a retry after an ambiguous server error", async () => {
    const failure = Object.assign(new Error("Server error"), { status: 500 });
    const create = jest.fn(async (_args: any) => ({ id: 5 }))
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ id: 5 });
    mockApi.useCreateLegacyLetter.mockImplementation(() => ({ mutateAsync: create, isPending: false }) as never);
    const { user, getByLabelText, getByText } = await openLetterForm();

    await user.press(getByText("Video"));
    await user.press(getByLabelText("Attach video file"));
    await waitFor(() => expect(getByText("attachment.mp4")).toBeTruthy());
    await user.press(getByText("Save as Draft"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't save letter", "Server error"));
    expect(mockApi.cleanupLegacyLetterUpload).not.toHaveBeenCalled();
    expect(mockApi.requestUploadUrl).toHaveBeenCalledTimes(1);

    await user.press(getByText("Save as Draft"));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(mockApi.requestUploadUrl).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]?.data.mediaUrl).toBe("/objects/uploads/1/legacy-letters/new-1-attachment.mp4");
    expect(create.mock.calls[1]?.[0]?.data.mediaUrl).toBe("/objects/uploads/1/legacy-letters/new-1-attachment.mp4");
    expect(mockApi.cleanupLegacyLetterUpload).not.toHaveBeenCalled();
  });

  it("retains an ambiguous upload when the user cancels because association is unresolved", async () => {
    const failure = Object.assign(new Error("Server error"), { status: 500 });
    const create = jest.fn(async (_args: any) => ({ id: 6 })).mockRejectedValueOnce(failure);
    mockApi.useCreateLegacyLetter.mockImplementation(() => ({ mutateAsync: create, isPending: false }) as never);
    const { user, getByLabelText, getByText, queryByText } = await openLetterForm();

    await user.press(getByText("Video"));
    await user.press(getByLabelText("Attach video file"));
    await waitFor(() => expect(getByText("attachment.mp4")).toBeTruthy());
    await user.press(getByText("Save as Draft"));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't save letter", "Server error"));

    await user.press(getByLabelText("Close letter editor"));

    expect(mockApi.cleanupLegacyLetterUpload).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Upload retained to protect your letter",
      expect.stringContaining("may have reached the server"),
    );
    await waitFor(() => expect(queryByText("Write a Letter")).toBeNull());
  });

  it("reports cancellation cleanup failure and keeps the unsaved attachment available", async () => {
    const failure = Object.assign(new Error("Letter validation failed"), { status: 400 });
    const create = jest.fn(async (_args: any) => ({ id: 8 })).mockRejectedValueOnce(failure);
    mockApi.useCreateLegacyLetter.mockImplementation(() => ({ mutateAsync: create, isPending: false }) as never);
    mockApi.cleanupLegacyLetterUpload
      .mockRejectedValueOnce(new Error("cleanup unavailable"))
      .mockRejectedValueOnce(new Error("cleanup unavailable"));
    const { user, getByLabelText, getByText } = await openLetterForm();

    await user.press(getByText("Video"));
    await user.press(getByLabelText("Attach video file"));
    await waitFor(() => expect(getByText("attachment.mp4")).toBeTruthy());
    await user.press(getByText("Save as Draft"));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      "Couldn't save letter",
      expect.stringContaining("uploaded attachment could not be removed"),
    ));

    await user.press(getByLabelText("Close letter editor"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      "Couldn't remove uploaded attachment",
      expect.stringContaining("try closing again"),
    ));
    expect(getByText("Write a Letter")).toBeTruthy();
    expect(getByText("attachment.mp4")).toBeTruthy();
  });

  it("does not replace or delete an attachment while its save outcome is ambiguous", async () => {
    const failure = Object.assign(new Error("Server error"), { status: 500 });
    const create = jest.fn(async (_args: any) => ({ id: 7 })).mockRejectedValueOnce(failure);
    mockApi.useCreateLegacyLetter.mockImplementation(() => ({ mutateAsync: create, isPending: false }) as never);
    const { user, getByLabelText, getByText, queryByText } = await openLetterForm();

    await user.press(getByText("Video"));
    await user.press(getByLabelText("Attach video file"));
    await waitFor(() => expect(getByText("attachment.mp4")).toBeTruthy());
    await user.press(getByText("Save as Draft"));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't save letter", "Server error"));

    (require("expo-document-picker").getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///replacement.mp4", name: "replacement.mp4", mimeType: "video/mp4", size: 1400 }],
    });
    await user.press(getByLabelText("Attach video file"));

    expect(mockApi.cleanupLegacyLetterUpload).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Couldn't replace attachment", expect.stringContaining("may have reached the server"));
    expect(getByText("attachment.mp4")).toBeTruthy();
    expect(queryByText("replacement.mp4")).toBeNull();
    expect(mockApi.requestUploadUrl).toHaveBeenCalledTimes(1);
  });

  it("never schedules preexisting media for cleanup when replacing an edit attachment fails", async () => {
    mockApi.__setLegacyLetters([{
      id: 41,
      title: "Existing letter",
      content: "",
      recipientName: "Alex",
      recipientRelation: null,
      mediaType: "video",
      mediaUrl: "/objects/uploads/1/preexisting-video",
      mediaDurationSec: null,
      triggerType: "manual",
      triggerDate: null,
      milestone: null,
      status: "draft",
      isSealed: false,
      deliveredAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);
    const failure = Object.assign(new Error("Update rejected"), { status: 400 });
    const update = jest.fn().mockRejectedValue(failure);
    mockApi.useUpdateLegacyLetter.mockImplementation(() => ({ mutateAsync: update, isPending: false }) as never);
    const user = userEvent.setup();
    const screen = await render(withProviders(<Screen />));

    await user.press(screen.getByText("Existing letter"));
    await user.press(screen.getByText("Edit Draft"));
    await user.press(screen.getByLabelText("Attach video file"));
    await waitFor(() => expect(screen.getByText("attachment.mp4")).toBeTruthy());
    await user.press(screen.getByText("Save Changes"));

    await waitFor(() => expect(mockApi.cleanupLegacyLetterUpload).toHaveBeenCalledWith({
      objectPath: "/objects/uploads/1/legacy-letters/new-1-attachment.mp4",
    }));
    expect(mockApi.cleanupLegacyLetterUpload).not.toHaveBeenCalledWith({
      objectPath: "/objects/uploads/1/preexisting-video",
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: 41,
      data: expect.objectContaining({
        mediaUrl: "/objects/uploads/1/legacy-letters/new-1-attachment.mp4",
      }),
    }));
  });

  it("reports cleanup failure explicitly and leaves the selected media available to retry", async () => {
    const failure = Object.assign(new Error("Letter validation failed"), { status: 400 });
    const create = jest.fn().mockRejectedValue(failure);
    mockApi.useCreateLegacyLetter.mockImplementation(() => ({ mutateAsync: create, isPending: false }) as never);
    mockApi.cleanupLegacyLetterUpload.mockRejectedValueOnce(new Error("cleanup unavailable"));
    const { user, getByLabelText, getByText } = await openLetterForm();

    await user.press(getByText("Video"));
    await user.press(getByLabelText("Attach video file"));
    await waitFor(() => expect(getByText("attachment.mp4")).toBeTruthy());
    await user.press(getByText("Save as Draft"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      "Couldn't save letter",
      expect.stringContaining("uploaded attachment could not be removed"),
    ));
    expect(getByText("attachment.mp4")).toBeTruthy();
  });
});
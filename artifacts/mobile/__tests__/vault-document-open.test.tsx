import React from "react";
import { Alert } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockDownload = jest.fn(async (...args: any[]) => ({ status: 200, uri: args[1] }));
const mockShare = jest.fn(async (..._args: any[]) => {});
const mockDeleteFile = jest.fn(async (..._args: any[]) => {});
let mockVaultItems: any[] = [];

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ getToken: jest.fn(async () => "test-token") }),
}));
jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#191919", foreground: "#F7F4EF", card: "#1F1F23",
    cardForeground: "#F7F4EF", primary: "#C9A439", primaryForeground: "#191919",
    muted: "#2A2A2E", mutedForeground: "#8A8A8F", border: "#333338",
    input: "#2A2A2E", text: "#F7F4EF", tint: "#C9A439", radius: 12,
  }),
}));
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: (...args: any[]) => mockShare(...args),
}));
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  downloadAsync: (...args: any[]) => mockDownload(...args),
  deleteAsync: (...args: any[]) => mockDeleteFile(...args),
  uploadAsync: jest.fn(async () => ({ status: 200 })),
  FileSystemUploadType: { BINARY_CONTENT: 0 },
}));
jest.mock("@workspace/api-client-react", () => {
  const api = require("./__mocks__/api-client-react");
  return {
    ...api,
    useGetVaultItems: () => ({ data: mockVaultItems, isLoading: false, refetch: jest.fn(), isRefetching: false }),
    useGetVaultContacts: () => ({ data: [], isLoading: false, refetch: jest.fn() }),
    useGetVaultFamilyItems: () => ({ data: [], refetch: jest.fn() }),
    useGetVaultFamilyMembers: () => ({ data: [], refetch: jest.fn() }),
    useGetVaultFamilyInvites: () => ({ data: [], refetch: jest.fn() }),
    useCreateVaultItem: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useUpdateVaultItem: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteVaultItem: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useCreateVaultContact: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useUpdateVaultContact: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteVaultContact: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useCreateVaultFamilyInvite: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useAcceptVaultFamilyInvite: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteVaultFamilyMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useRevokeVaultFamilyInvite: () => ({ mutateAsync: jest.fn(), isPending: false }),
    getUploadVaultFileUrl: (id: number) => `/vault/${id}/upload`,
    getGetVaultFileUrl: (id: number) => `/vault/${id}/file`,
    getBaseUrl: () => "https://api.example",
    getGetVaultItemsQueryKey: () => ["vaultItems"],
    getGetVaultContactsQueryKey: () => ["vaultContacts"],
    getGetVaultFamilyMembersQueryKey: () => ["vaultFamilyMembers"],
    getGetVaultFamilyItemsQueryKey: () => ["vaultFamilyItems"],
    getGetVaultFamilyInvitesQueryKey: () => ["vaultFamilyInvites"],
  };
});

function withProviders(ui: React.ReactElement) {
  return <QueryClientProvider client={new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })}>{ui}</QueryClientProvider>;
}

let VaultScreen: React.ComponentType;
let sharing: typeof import("expo-sharing");
let alertSpy: jest.SpyInstance;

beforeAll(() => {
  VaultScreen = require("../app/(tabs)/life/vault").default;
  sharing = require("expo-sharing");
});

beforeEach(() => {
  mockVaultItems = [];
  mockDownload.mockReset().mockImplementation(async (_url, uri) => ({ status: 200, uri }));
  mockShare.mockReset().mockResolvedValue(undefined);
  mockDeleteFile.mockReset().mockResolvedValue(undefined);
  (sharing.isAvailableAsync as jest.Mock).mockClear();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

describe("Vault native document open", () => {
  const item = {
    id: 42, name: "Insurance policy", category: "document", content: "",
    visibility: "private", fileUrl: "/objects/vault/42", mimeType: "application/pdf",
  };

  it("downloads the authorized file to a local URI and opens the native share sheet", async () => {
    mockVaultItems = [item];
    const screen = await render(withProviders(<VaultScreen />));
    expect(screen.getByText("Insurance policy")).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId("vault-open-file-42")));

    await waitFor(() => expect(mockShare).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/cache\/vault-42-/),
      expect.objectContaining({ mimeType: "application/pdf", dialogTitle: "Insurance policy" }),
    ));
    expect(mockDownload).toHaveBeenCalledWith(
      "https://api.example/vault/42/file",
      expect.stringMatching(/^file:\/\/\/cache\/vault-42-/),
      { headers: { Authorization: "Bearer test-token" } },
    );
    expect(mockDeleteFile).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/cache\/vault-42-/),
      { idempotent: true },
    );
    await screen.unmount();
  });

  it("reports an HTTP download error without opening the incomplete local file", async () => {
    mockVaultItems = [item];
    mockDownload.mockImplementationOnce(async () => ({ status: 403, uri: "file:///cache/forbidden.pdf" }));
    const screen = await render(withProviders(<VaultScreen />));
    expect(screen.getByText("Insurance policy")).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId("vault-open-file-42")));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't open file", "Secure download failed (403)."));
    expect(mockShare).not.toHaveBeenCalled();
    expect(mockDeleteFile).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/cache\/vault-42-/),
      { idempotent: true },
    );
    expect(sharing.isAvailableAsync).not.toHaveBeenCalled();
    await screen.unmount();
  });
});
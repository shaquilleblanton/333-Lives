/**
 * AI chat streaming. Regression for the TestFlight bug where every message
 * failed on device: React Native's global fetch returns no readable body, so
 * the chat must stream through expo/fetch and parse SSE lines correctly.
 */

const mockExpoFetch = jest.fn();
jest.mock("expo/fetch", () => ({ fetch: (...args: any[]) => mockExpoFetch(...args) }));
jest.mock("@workspace/api-client-react", () => ({ getBaseUrl: () => "https://333lives.app" }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder } = require("util");
import { streamMessage } from "../utils/aiStream";

if (typeof (globalThis as any).TextDecoder === "undefined") {
  (globalThis as any).TextDecoder = NodeTextDecoder;
}

function streamingResponse(chunks: string[], status = 200) {
  const enc = new NodeTextEncoder();
  let i = 0;
  return {
    ok: status >= 200 && status < 300,
    status,
    body: {
      getReader: () => ({
        read: async () =>
          i < chunks.length ? { done: false, value: enc.encode(chunks[i++]) } : { done: true, value: undefined },
      }),
    },
    text: async () => chunks.join(""),
  };
}

async function collect(gen: AsyncGenerator<string>) {
  const out: string[] = [];
  for await (const c of gen) out.push(c);
  return out;
}

const getToken = async () => "tok";

beforeEach(() => mockExpoFetch.mockReset());

it("streams through expo/fetch with auth and yields content in order", async () => {
  mockExpoFetch.mockResolvedValue(
    streamingResponse([
      'data: {"content":"Hel"}\n\ndata: {"con',
      'tent":"lo"}\n\n',
      'data: {"done":true}\n\n',
    ]),
  );

  const out = await collect(streamMessage(5, "hi", getToken));

  expect(out.join("")).toBe("Hello");
  const [url, init] = mockExpoFetch.mock.calls[0];
  expect(url).toBe("https://333lives.app/api/anthropic/conversations/5/messages");
  expect(init.headers.Authorization).toBe("Bearer tok");
  expect(JSON.parse(init.body)).toEqual({ content: "hi" });
});

it("falls back to reading the full reply when there is no readable body", async () => {
  mockExpoFetch.mockResolvedValue({
    ok: true,
    status: 200,
    body: undefined,
    text: async () => 'data: {"content":"Full "}\n\ndata: {"content":"reply"}\n\ndata: {"done":true}\n\n',
  });

  expect((await collect(streamMessage(1, "x", getToken))).join("")).toBe("Full reply");
});

it("throws when the server reports a stream error", async () => {
  mockExpoFetch.mockResolvedValue(streamingResponse(['data: {"error":"Stream failed"}\n\n']));
  await expect(collect(streamMessage(1, "x", getToken))).rejects.toThrow("Stream failed");
});

it("throws on a non-OK HTTP status", async () => {
  mockExpoFetch.mockResolvedValue(streamingResponse([], 401));
  await expect(collect(streamMessage(1, "x", getToken))).rejects.toThrow("401");
});

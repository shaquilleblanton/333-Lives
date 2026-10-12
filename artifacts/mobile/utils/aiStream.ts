import { getBaseUrl } from "@workspace/api-client-react";
import { Platform } from "react-native";
// React Native's global fetch has no streaming body (res.body is undefined on
// iOS/Android), so the chat stream must use Expo's WinterCG fetch instead.
import { fetch as expoFetch } from "expo/fetch";

/**
 * Sends a chat message and yields the assistant's reply as it streams in
 * (Server-Sent Events: `data: {"content": "..."}` lines, ending with `{"done": true}`).
 */
export async function* streamMessage(
  conversationId: number,
  content: string,
  getToken: () => Promise<string | null>
): AsyncGenerator<string, void, unknown> {
  const token = await getToken();
  const base = getBaseUrl();
  const url = `${base}/api/anthropic/conversations/${conversationId}/messages`;
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
  };
  const res = Platform.OS === "web" ? await fetch(url, init) : await expoFetch(url, init);

  if (!res.ok) {
    throw new Error(`Stream failed (${res.status})`);
  }

  // Parses SSE "data:" lines; returns true once the server signals done.
  function* parseLines(lines: string[]): Generator<string, boolean, unknown> {
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      let parsed: { content?: string; done?: boolean; error?: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.done) return true;
      if (parsed.content) yield parsed.content;
    }
    return false;
  }

  // Fallback: no readable stream available — read the whole reply at once.
  if (!res.body || typeof (res.body as any).getReader !== "function") {
    const text = await res.text();
    yield* parseLines(text.split("\n"));
    return;
  }

  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    if (yield* parseLines(lines)) return;
  }
  if (buffer) yield* parseLines([buffer]);
}

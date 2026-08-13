/**
 * Unit tests for purgeCloudflareCache()
 *
 * Mocks global fetch and environment variables so no live Cloudflare
 * credentials are needed. The Replit connector proxy is simulated by
 * controlling what fetch returns for each call.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { purgeCloudflareCache } from "../lib/cloudflareCachePurge.js";

// ── Fake connector proxy config ───────────────────────────────────────────

const FAKE_HOSTNAME = "connectors.replit.example";
const FAKE_IDENTITY = "repl-identity-token-abc123";
const FAKE_ZONE_ID = "zone-abc-123";
const DOMAIN = "333lives.app";

const EXPECTED_PROXY_BASE = `https://${FAKE_HOSTNAME}/api/v2/proxy`;
const EXPECTED_ZONE_URL = `${EXPECTED_PROXY_BASE}/client/v4/zones?name=${encodeURIComponent(DOMAIN)}`;
const EXPECTED_PURGE_URL = `${EXPECTED_PROXY_BASE}/client/v4/zones/${FAKE_ZONE_ID}/purge_cache`;

// ── Helpers ───────────────────────────────────────────────────────────────

function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

// ── Setup / teardown ──────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Set required env vars for buildProxyConfig()
  process.env.REPLIT_CONNECTORS_HOSTNAME = FAKE_HOSTNAME;
  process.env.REPL_IDENTITY = FAKE_IDENTITY;
  delete process.env.WEB_REPL_RENEWAL;

  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.REPLIT_CONNECTORS_HOSTNAME;
  delete process.env.REPL_IDENTITY;
  delete process.env.WEB_REPL_RENEWAL;
});

// ── Suite: zone lookup ────────────────────────────────────────────────────

describe("findZoneId (via purgeCloudflareCache)", () => {
  it("calls the correct Cloudflare zones endpoint through the proxy", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({ result: [{ id: FAKE_ZONE_ID, name: DOMAIN }], success: true }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({ result: { id: "purge-op-id" }, success: true }),
      );

    await purgeCloudflareCache();

    const [zoneLookupCall] = fetchMock.mock.calls;
    expect(zoneLookupCall[0]).toBe(EXPECTED_ZONE_URL);
  });

  it("sends the Connector-Name and auth headers on the zone lookup", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({ result: [{ id: FAKE_ZONE_ID, name: DOMAIN }], success: true }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({ result: { id: "purge-op-id" }, success: true }),
      );

    await purgeCloudflareCache();

    const [, zoneInit] = fetchMock.mock.calls[0];
    expect(zoneInit.headers["Connector-Name"]).toBe("cloudflare");
    expect(zoneInit.headers["X-Replit-Token"]).toBe(`repl ${FAKE_IDENTITY}`);
  });

  it("falls back to WEB_REPL_RENEWAL token when REPL_IDENTITY is absent", async () => {
    delete process.env.REPL_IDENTITY;
    process.env.WEB_REPL_RENEWAL = "depl-renewal-token-xyz";

    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({ result: [{ id: FAKE_ZONE_ID, name: DOMAIN }], success: true }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({ result: { id: "purge-op-id" }, success: true }),
      );

    await purgeCloudflareCache();

    const [, zoneInit] = fetchMock.mock.calls[0];
    expect(zoneInit.headers["X-Replit-Token"]).toBe("depl depl-renewal-token-xyz");
  });

  it("throws when the zone lookup response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(mockFetchResponse("Forbidden", 403));

    await expect(purgeCloudflareCache()).rejects.toThrow(
      /Cloudflare zone lookup failed \(403\)/,
    );
  });

  it("throws when no zone is returned for the domain", async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ result: [], success: true }),
    );

    await expect(purgeCloudflareCache()).rejects.toThrow(
      /No Cloudflare zone found for domain: 333lives\.app/,
    );
  });
});

// ── Suite: purge payload ──────────────────────────────────────────────────

describe("purgeCloudflareCache: purge request", () => {
  beforeEach(() => {
    // First call → zone lookup; second call → purge cache
    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({ result: [{ id: FAKE_ZONE_ID, name: DOMAIN }], success: true }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({ result: { id: "purge-op-id" }, success: true }),
      );
  });

  it("hits the correct purge_cache endpoint for the resolved zone", async () => {
    await purgeCloudflareCache();

    const purgeCall = fetchMock.mock.calls[1];
    expect(purgeCall[0]).toBe(EXPECTED_PURGE_URL);
  });

  it("sends a POST request", async () => {
    await purgeCloudflareCache();

    const [, purgeInit] = fetchMock.mock.calls[1];
    expect(purgeInit.method).toBe("POST");
  });

  it("includes all key URLs in the purge body", async () => {
    await purgeCloudflareCache();

    const [, purgeInit] = fetchMock.mock.calls[1];
    const body = JSON.parse(purgeInit.body as string);

    const expectedUrls = [
      `https://${DOMAIN}/`,
      `https://${DOMAIN}/pricing`,
      `https://${DOMAIN}/about`,
      `https://www.${DOMAIN}/`,
      `https://www.${DOMAIN}/pricing`,
      `https://www.${DOMAIN}/about`,
    ];

    expect(body.files).toEqual(expect.arrayContaining(expectedUrls));
    expect(body.files).toHaveLength(expectedUrls.length);
  });

  it("sends the Connector-Name header on the purge call", async () => {
    await purgeCloudflareCache();

    const [, purgeInit] = fetchMock.mock.calls[1];
    expect(purgeInit.headers["Connector-Name"]).toBe("cloudflare");
  });
});

// ── Suite: error handling ─────────────────────────────────────────────────

describe("purgeCloudflareCache: error handling", () => {
  it("throws when the purge response is not ok", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({ result: [{ id: FAKE_ZONE_ID, name: DOMAIN }], success: true }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse(
          { success: false, errors: [{ message: "Invalid zone" }] },
          400,
        ),
      );

    await expect(purgeCloudflareCache()).rejects.toThrow(
      /Cloudflare cache purge failed: Invalid zone/,
    );
  });

  it("throws when success=false even on a 200 response", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({ result: [{ id: FAKE_ZONE_ID, name: DOMAIN }], success: true }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({
          success: false,
          errors: [{ message: "Rate limited" }, { message: "Try again later" }],
        }),
      );

    await expect(purgeCloudflareCache()).rejects.toThrow(
      /Cloudflare cache purge failed: Rate limited; Try again later/,
    );
  });

  it("throws when REPLIT_CONNECTORS_HOSTNAME is missing", async () => {
    delete process.env.REPLIT_CONNECTORS_HOSTNAME;

    await expect(purgeCloudflareCache()).rejects.toThrow(
      /REPLIT_CONNECTORS_HOSTNAME is not set/,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when both identity tokens are missing", async () => {
    delete process.env.REPL_IDENTITY;
    delete process.env.WEB_REPL_RENEWAL;

    await expect(purgeCloudflareCache()).rejects.toThrow(
      /No Replit identity token available/,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

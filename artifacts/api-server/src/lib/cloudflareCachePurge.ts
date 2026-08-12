// Cloudflare cache purge helper — uses the Replit connectors proxy so no API
// keys are needed in application code. Call purgeCloudflareCache() once after
// a successful deployment to evict stale pages for 333lives.app.

const CONNECTOR_NAME = "cloudflare";
const DOMAIN = "333lives.app";

// Key pages to purge on every deploy. Extend this list as new landing pages
// are added to the marketing site.
const KEY_URLS = [
  `https://${DOMAIN}/`,
  `https://${DOMAIN}/pricing`,
  `https://${DOMAIN}/about`,
  `https://www.${DOMAIN}/`,
  `https://www.${DOMAIN}/pricing`,
  `https://www.${DOMAIN}/about`,
];

type ZoneListResponse = {
  result?: Array<{ id: string; name: string }>;
  success?: boolean;
};

type PurgeCacheResponse = {
  result?: { id: string } | null;
  success?: boolean;
  errors?: Array<{ message: string }>;
};

function buildProxyConfig(): { proxyBase: string; authHeader: string; authValue: string } {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) {
    throw new Error("REPLIT_CONNECTORS_HOSTNAME is not set — Replit connector proxy unavailable");
  }

  const base = hostname.startsWith("http") ? hostname : `https://${hostname}`;
  const proxyBase = `${base}/api/v2/proxy`;

  // Mirror the token resolution strategy from @replit/connectors-sdk identity.js
  const replIdentity = process.env.REPL_IDENTITY;
  const deplToken = process.env.WEB_REPL_RENEWAL;

  if (replIdentity) {
    return { proxyBase, authHeader: "X-Replit-Token", authValue: `repl ${replIdentity}` };
  }
  if (deplToken) {
    return { proxyBase, authHeader: "X-Replit-Token", authValue: `depl ${deplToken}` };
  }

  throw new Error(
    "No Replit identity token available (REPL_IDENTITY and WEB_REPL_RENEWAL are both unset)",
  );
}

async function cloudflareProxyFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const { proxyBase, authHeader, authValue } = buildProxyConfig();
  const url = `${proxyBase}${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [authHeader]: authValue,
      "Connector-Name": CONNECTOR_NAME,
      ...(options.headers as Record<string, string> | undefined),
    },
    signal: options.signal ?? AbortSignal.timeout(15_000),
  });
}

async function findZoneId(domain: string): Promise<string> {
  const resp = await cloudflareProxyFetch(`/client/v4/zones?name=${encodeURIComponent(domain)}`);
  if (!resp.ok) {
    throw new Error(`Cloudflare zone lookup failed (${resp.status}): ${await resp.text()}`);
  }

  const data = (await resp.json()) as ZoneListResponse;
  const zone = data.result?.[0];
  if (!zone) {
    throw new Error(`No Cloudflare zone found for domain: ${domain}`);
  }
  return zone.id;
}

/**
 * Purge the Cloudflare cache for 333lives.app key pages.
 * Safe to call fire-and-forget — errors are logged but never thrown so they
 * cannot crash the server startup.
 */
export async function purgeCloudflareCache(): Promise<void> {
  const zoneId = await findZoneId(DOMAIN);

  const resp = await cloudflareProxyFetch(`/client/v4/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify({ files: KEY_URLS }),
  });

  const data = (await resp.json()) as PurgeCacheResponse;

  if (!resp.ok || !data.success) {
    const errors = data.errors?.map((e) => e.message).join("; ") ?? `HTTP ${resp.status}`;
    throw new Error(`Cloudflare cache purge failed: ${errors}`);
  }
}

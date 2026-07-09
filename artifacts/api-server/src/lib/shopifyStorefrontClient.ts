// Shopify Storefront client (from Replit shopify-store integration skill).
// Server-side ONLY: fetches the connection settings (shop_domain +
// storefront_access_token) from the Replit connector proxy and talks to
// Shopify's Storefront GraphQL API directly. Never expose this to browser
// or mobile code — they go through our /api/shop/* routes.
const STOREFRONT_API_VERSION = "2026-04";

type ShopifyConnectionSettings = {
  shop_domain?: string;
  storefront_access_token?: string;
};

type ShopifyConnectionResponse = {
  items?: Array<{
    settings?: ShopifyConnectionSettings;
  }>;
};

type ShopifyStorefrontConfig = {
  shopDomain: string;
  storefrontAccessToken: string;
};

const CONFIG_CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;

let cachedConfig:
  | { value: ShopifyStorefrontConfig; expiresAt: number }
  | undefined;

function getOpenIntConnectionConfig() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !token) {
    throw new Error("Missing Replit connector environment variables");
  }

  const protocol = hostname.startsWith("localhost") ? "http" : "https";
  const connectionUrl = new URL(`${protocol}://${hostname}/api/v2/connection`);
  connectionUrl.searchParams.set("include_secrets", "true");
  connectionUrl.searchParams.set("connector_names", "shopify-store");
  connectionUrl.searchParams.set("refresh_policy", "none");

  return {
    connectionUrl: connectionUrl.toString(),
    token,
  };
}

export async function getShopifyStorefrontConfig(
  options: { forceRefresh?: boolean } = {},
): Promise<ShopifyStorefrontConfig> {
  if (cachedConfig && !options.forceRefresh && Date.now() < cachedConfig.expiresAt) {
    return cachedConfig.value;
  }

  const { connectionUrl, token } = getOpenIntConnectionConfig();
  const resp = await fetch(connectionUrl, {
    headers: {
      Accept: "application/json",
      X_REPLIT_TOKEN: token,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch Shopify connection: ${resp.status}`);
  }

  const data = (await resp.json()) as ShopifyConnectionResponse;
  const settings = data.items?.[0]?.settings;
  if (!settings?.shop_domain || !settings.storefront_access_token) {
    throw new Error(
      "Shopify Store integration is missing Storefront settings. Recreate the integration after OpenInt provisions a Storefront token.",
    );
  }

  // Extract only the Storefront-facing fields so unrelated private
  // settings (Admin tokens, refresh state, transfer status, shop_id)
  // never reach app code or the in-memory cache.
  cachedConfig = {
    value: {
      shopDomain: settings.shop_domain,
      storefrontAccessToken: settings.storefront_access_token,
    },
    expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
  };
  return cachedConfig.value;
}

export async function shopifyStorefrontRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: { retryOnUnauthorized?: boolean } = {},
): Promise<T> {
  const config = await getShopifyStorefrontConfig();

  const resp = await fetch(
    `https://${config.shopDomain}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );

  if (
    options.retryOnUnauthorized !== false &&
    (resp.status === 401 || resp.status === 403)
  ) {
    cachedConfig = undefined;
    await getShopifyStorefrontConfig({ forceRefresh: true });
    return shopifyStorefrontRequest<T>(query, variables, {
      retryOnUnauthorized: false,
    });
  }

  const text = await resp.text();
  const json = text ? safeJsonParse(text) : {};
  if (!resp.ok || json.errors?.length) {
    throw new Error(
      `Shopify Storefront API error (${resp.status}): ${JSON.stringify(json.errors ?? json)}`,
    );
  }

  return json.data as T;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { errors: [{ message: text }] };
  }
}

import { Router, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { shopReferralClicksTable } from "@workspace/db/schema";
import { shopifyStorefrontRequest } from "../lib/shopifyStorefrontClient";
import { logger } from "../lib/logger";

const checkoutSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const router = Router();

// The connected store is a Replit-provisioned development store until the
// merchant claims/transfers it (Go Live). Dev stores are password-gated, so
// checkout URLs need the `channel=online_store` preview param. Set
// SHOPIFY_LIVE_STORE=true after Go Live to drop it.
const USE_DEV_STORE_PREVIEW = process.env.SHOPIFY_LIVE_STORE !== "true";

const PRODUCTS_QUERY = `#graphql
  query Products {
    products(first: 50, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        description
        productType
        availableForSale
        featuredImage { url altText }
        priceRange { minVariantPrice { amount currencyCode } }
        variants(first: 50) {
          nodes {
            id
            title
            availableForSale
            price { amount }
          }
        }
      }
    }
  }
`;

type ProductsResponse = {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      handle: string;
      description: string | null;
      productType: string | null;
      availableForSale: boolean;
      featuredImage: { url: string; altText: string | null } | null;
      priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          availableForSale: boolean;
          price: { amount: string };
        }>;
      };
    }>;
  };
};

router.get("/shop/products", async (_req, res) => {
  try {
    const data = await shopifyStorefrontRequest<ProductsResponse>(PRODUCTS_QUERY);
    const products = data.products.nodes.map((p) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      description: p.description ?? "",
      productType: p.productType ?? "",
      imageUrl: p.featuredImage?.url,
      imageAlt: p.featuredImage?.altText ?? undefined,
      price: p.priceRange.minVariantPrice.amount,
      currencyCode: p.priceRange.minVariantPrice.currencyCode,
      availableForSale: p.availableForSale,
      variants: p.variants.nodes.map((v) => ({
        id: v.id,
        title: v.title,
        price: v.price.amount,
        availableForSale: v.availableForSale,
      })),
    }));
    return res.json(products);
  } catch (err) {
    return sendShopifyError(res, err, "Could not load products from the store");
  }
});

const CART_CREATE = `#graphql
  mutation CartCreate($variantId: ID!, $quantity: Int!) {
    cartCreate(input: { lines: [{ merchandiseId: $variantId, quantity: $quantity }] }) {
      cart { id checkoutUrl }
      userErrors { field message }
    }
  }
`;

type CartCreateResponse = {
  cartCreate: {
    cart: { id: string; checkoutUrl: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

router.post("/shop/checkout", async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const { variantId, quantity } = parsed.data;

  try {
    const data = await shopifyStorefrontRequest<CartCreateResponse>(CART_CREATE, {
      variantId,
      quantity,
    });

    const userError = data.cartCreate.userErrors[0];
    if (userError) {
      return res.status(400).json({ error: userError.message });
    }
    if (!data.cartCreate.cart?.checkoutUrl) {
      return res.status(502).json({ error: "Shopify did not return a checkout URL" });
    }

    const checkoutUrl = new URL(data.cartCreate.cart.checkoutUrl);
    if (USE_DEV_STORE_PREVIEW) {
      // Dev stores are password protected; this preview param lets checkout
      // work before the merchant claims the store. Disabled for live stores.
      checkoutUrl.searchParams.set("channel", "online_store");
    }

    return res.json({ checkoutUrl: checkoutUrl.toString() });
  } catch (err) {
    return sendShopifyError(res, err, "Could not start checkout");
  }
});

// ── Referral click tracker ─────────────────────────────────────────────────
// Logs every tap of a "Shop on EATLIVE" button so we can report conversions
// to the owner and agree on a commission rate.
router.post("/shop/referral-click", async (req, res) => {
  const productId   = typeof req.body?.productId   === "string" ? req.body.productId.trim()   : "";
  const productName = typeof req.body?.productName  === "string" ? req.body.productName.trim() : "";
  const referralCode= typeof req.body?.referralCode === "string" ? req.body.referralCode.trim(): "333lives";

  if (!productId || !productName) {
    return res.status(400).json({ error: "productId and productName are required" });
  }

  try {
    await db.insert(shopReferralClicksTable).values({
      productId,
      productName,
      referralCode,
    });
    return res.json({ ok: true });
  } catch (err) {
    // Non-critical — log but don't fail the user's experience
    logger.error({ err }, "[shop] referral-click insert failed");
    return res.json({ ok: false });
  }
});

function sendShopifyError(res: Response, err: unknown, message: string) {
  const detail = err instanceof Error ? err.message : String(err);
  logger.error({ err }, `[shop] ${message}: ${detail}`);
  // Don't leak upstream/operational detail to clients in production.
  const body =
    process.env.NODE_ENV === "production"
      ? { error: message }
      : { error: `${message}: ${detail}` };
  return res.status(502).json(body);
}

export default router;

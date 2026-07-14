// 333 Lives — Expanded catalog seed (Round 2).
// Adds cutoffs, organic sweats/shorts, socks, hats, hoodie across all 3 collections.
// Safe to re-run — handle-based idempotency.
//
//   node seed-333-expanded.mjs

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const ADMIN_HELPER = "shopify-admin-api.mjs";
const MAPPING_FILE = "shopify-products.json";
const BASE = "https://f20274bb-315d-4596-94ff-37f419304b95-00-2u89y3cvo8r4.riker.replit.dev/shop";

// Collection handles already created in round 1
const COLLECTION_HANDLES = {
  legacy: "333-lives-legacy",
  sssc: "semi-social-social-club",
  eye: "thr33-eye",
};

// ── New products only ─────────────────────────────────────────────────────────
const NEW_PRODUCTS = [
  // ── 333 Lives Legacy ─────────────────────────────────────────────────────
  {
    handle: "333-lives-legacy-cutoff-tank",
    title: "333 Lives Legacy Cutoff Tank",
    descriptionHtml: "<p>Oversized raw-edge cutoff tank with the gold 333 Lives wing crest screen-printed on the chest. Heavyweight 100% organic cotton. Unisex. Sleeveless, cropped cut.</p>",
    price: "38.00",
    quantity: 20,
    collection: COLLECTION_HANDLES.legacy,
    imageUrl: `${BASE}/logo-gold.png`,
  },
  {
    handle: "333-lives-legacy-organic-sweatpants",
    title: "333 Lives Legacy Organic Sweatpants",
    descriptionHtml: "<p>Wide-leg organic cotton fleece sweatpants. Small 333 Lives gold wing crest embroidered on the left hip. Elastic waist with adjustable drawstring. 100% GOTS-certified organic cotton.</p>",
    price: "68.00",
    quantity: 15,
    collection: COLLECTION_HANDLES.legacy,
    imageUrl: `${BASE}/logo-wings.jpeg`,
  },
  {
    handle: "333-lives-legacy-organic-shorts",
    title: "333 Lives Legacy Organic Shorts",
    descriptionHtml: "<p>Baggy fit organic cotton shorts with the 333 Lives wing crest on the left thigh. 8\" inseam. Elastic waist, side pockets. 100% GOTS-certified organic cotton.</p>",
    price: "55.00",
    quantity: 15,
    collection: COLLECTION_HANDLES.legacy,
    imageUrl: `${BASE}/logo-wings.jpeg`,
  },
  {
    handle: "333-lives-legacy-socks",
    title: "333 Lives Legacy Socks — 3 Pack",
    descriptionHtml: "<p>Mid-calf crew socks with the 333 Lives wing crest woven into the ankle. Sold as a set of 3. 80% organic cotton, 17% nylon, 3% elastane. One size fits most.</p>",
    price: "22.00",
    quantity: 50,
    collection: COLLECTION_HANDLES.legacy,
    imageUrl: `${BASE}/logo-gold.png`,
  },
  // ── Semi Social Social Club ───────────────────────────────────────────────
  {
    handle: "sssc-cutoff-tank-orange",
    title: "SSSC Cutoff Tank — Orange",
    descriptionHtml: "<p>Raw-edge oversized cutoff tank. Bold orange \"333\" graphic on the front, <strong>Semi Social Social Club</strong> stacked on the back. 100% organic cotton.</p>",
    price: "38.00",
    quantity: 20,
    collection: COLLECTION_HANDLES.sssc,
    imageUrl: `${BASE}/sssc-orange-tee.png`,
  },
  {
    handle: "sssc-cutoff-tank-pink",
    title: "SSSC Cutoff Tank — Pink",
    descriptionHtml: "<p>Raw-edge oversized cutoff tank. Dusty rose \"333\" graphic on the front, <strong>Semi Social Social Club</strong> stacked on the back. 100% organic cotton.</p>",
    price: "38.00",
    quantity: 20,
    collection: COLLECTION_HANDLES.sssc,
    imageUrl: `${BASE}/sssc-pink-tee.png`,
  },
  {
    handle: "sssc-organic-sweatpants",
    title: "SSSC Organic Sweatpants",
    descriptionHtml: "<p>Wide-leg organic cotton fleece sweats with <strong>SEMI SOCIAL SOCIAL CLUB</strong> down the left leg in bold stacked type. Elastic waist, drawstring. 100% GOTS-certified organic cotton.</p>",
    price: "68.00",
    quantity: 15,
    collection: COLLECTION_HANDLES.sssc,
    imageUrl: `${BASE}/sssc-logo-red.png`,
  },
  {
    handle: "sssc-organic-shorts",
    title: "SSSC Organic Shorts",
    descriptionHtml: "<p>Baggy organic cotton shorts with <strong>SEMI SOCIAL SOCIAL CLUB</strong> printed across the back. 8\" inseam, elastic waist, side pockets. 100% GOTS-certified organic cotton.</p>",
    price: "55.00",
    quantity: 15,
    collection: COLLECTION_HANDLES.sssc,
    imageUrl: `${BASE}/sssc-logo-red.png`,
  },
  {
    handle: "sssc-socks",
    title: "SSSC Socks — 3 Pack",
    descriptionHtml: "<p>Mid-calf crew socks with <strong>SSSC</strong> woven into the ankle in orange, pink, and red. Pack of 3. 80% organic cotton, 17% nylon, 3% elastane. One size fits most.</p>",
    price: "22.00",
    quantity: 50,
    collection: COLLECTION_HANDLES.sssc,
    imageUrl: `${BASE}/sssc-logo-red.png`,
  },
  {
    handle: "sssc-snapback-cap",
    title: "SSSC Snapback Cap",
    descriptionHtml: "<p>Flat-brim snapback. <strong>SEMI SOCIAL SOCIAL CLUB</strong> embroidered across the front panel in white on black. Adjustable snap closure. One size.</p>",
    price: "38.00",
    quantity: 20,
    collection: COLLECTION_HANDLES.sssc,
    imageUrl: `${BASE}/sssc-logo-red.png`,
  },
  // ── THR33 Eye ────────────────────────────────────────────────────────────
  {
    handle: "thr33-eye-hoodie",
    title: "THR33 Eye Hoodie",
    descriptionHtml: "<p>Oversized heavyweight hoodie. THR33 Eye graphic printed large across the back, small eye logo on the chest. Kangaroo pocket. 80% organic cotton / 20% recycled poly.</p>",
    price: "75.00",
    quantity: 15,
    collection: COLLECTION_HANDLES.eye,
    imageUrl: `${BASE}/thr33-eye.jpeg`,
  },
  {
    handle: "thr33-eye-cutoff-tank",
    title: "THR33 Eye Cutoff Tank",
    descriptionHtml: "<p>Raw-edge oversized cutoff tank with the THR33 all-seeing eye printed center chest. Unisex. 100% organic cotton. Pairs with the eye sweats for a full set.</p>",
    price: "38.00",
    quantity: 20,
    collection: COLLECTION_HANDLES.eye,
    imageUrl: `${BASE}/thr33-eye.jpeg`,
  },
  {
    handle: "thr33-eye-organic-sweatpants",
    title: "THR33 Eye Organic Sweatpants",
    descriptionHtml: "<p>Wide-leg organic cotton fleece sweats with the THR33 Eye embroidered on the left hip. Elastic waist with drawstring. 100% GOTS-certified organic cotton.</p>",
    price: "68.00",
    quantity: 15,
    collection: COLLECTION_HANDLES.eye,
    imageUrl: `${BASE}/thr33-eye.jpeg`,
  },
  {
    handle: "thr33-eye-organic-shorts",
    title: "THR33 Eye Organic Shorts",
    descriptionHtml: "<p>Baggy organic cotton shorts with the THR33 all-seeing eye printed on the left thigh. 8\" inseam. Elastic waist, side pockets. 100% GOTS-certified organic cotton.</p>",
    price: "55.00",
    quantity: 15,
    collection: COLLECTION_HANDLES.eye,
    imageUrl: `${BASE}/thr33-eye.jpeg`,
  },
  {
    handle: "thr33-eye-socks",
    title: "THR33 Eye Socks — 3 Pack",
    descriptionHtml: "<p>Mid-calf crew socks with the THR33 all-seeing eye woven into the ankle. Pack of 3. 80% organic cotton, 17% nylon, 3% elastane. One size fits most.</p>",
    price: "22.00",
    quantity: 50,
    collection: COLLECTION_HANDLES.eye,
    imageUrl: `${BASE}/thr33-eye.jpeg`,
  },
];

// ── Helpers (copy of round-1 helpers) ────────────────────────────────────────
function adminGraphQL(query, variables = {}) {
  const result = spawnSync("node", [ADMIN_HELPER, JSON.stringify({ query, variables })], { encoding: "utf8" });
  if (result.error) throw new Error(`Failed to run ${ADMIN_HELPER}: ${result.error.message}`);
  const stdout = result.stdout || "";
  let parsed;
  try { parsed = JSON.parse(stdout); }
  catch { throw new Error(`Non-JSON from ${ADMIN_HELPER}:\n${stdout}\n${result.stderr || ""}`); }
  if (result.status !== 0) {
    const msgs = (Array.isArray(parsed?.errors) ? parsed.errors : []).map((e) => e.message).filter(Boolean);
    throw new Error(`Shopify Admin error: ${msgs.join("; ") || stdout}`);
  }
  const throttle = parsed?.extensions?.cost?.throttleStatus;
  if (throttle && throttle.currentlyAvailable < throttle.maximumAvailable * 0.2) {
    const restoreMs = (throttle.maximumAvailable - throttle.currentlyAvailable) / throttle.restoreRate * 1000;
    spawnSync("sleep", [String(Math.ceil(restoreMs / 1000))]);
  }
  return parsed.data;
}

function firstUserError(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node.userErrors) && node.userErrors.length > 0)
    return node.userErrors[0].message || JSON.stringify(node.userErrors[0]);
  if (Array.isArray(node.mediaUserErrors) && node.mediaUserErrors.length > 0)
    return node.mediaUserErrors[0].message || JSON.stringify(node.mediaUserErrors[0]);
  return null;
}

function resolveLocationId() {
  const data = adminGraphQL(`query { locations(first: 1) { nodes { id name } } }`);
  const loc = data.locations.nodes[0];
  if (!loc) throw new Error("No Shopify location found.");
  console.log(`  Location: ${loc.name}`);
  return loc.id;
}

function resolvePublicationId() {
  const d = adminGraphQL(`query { currentAppInstallation { publication { id } } }`);
  const id = d.currentAppInstallation?.publication?.id;
  if (id) { console.log(`  Publication: Replit Sales Channel`); return id; }
  const d2 = adminGraphQL(`query { publications(first: 20) { nodes { id name } } }`);
  const os = (d2.publications.nodes || []).find((p) => p.name === "Online Store");
  return os?.id ?? null;
}

function resolveCollectionId(handle) {
  const data = adminGraphQL(
    `query($handle: String!) { collectionByHandle(handle: $handle) { id } }`,
    { handle },
  );
  return data.collectionByHandle?.id ?? null;
}

function findExistingProduct(handle) {
  const data = adminGraphQL(
    `query($handle: String!) {
      productByHandle(handle: $handle) {
        id
        variants(first: 1) { nodes { id inventoryItem { id } } }
      }
    }`,
    { handle },
  );
  const p = data.productByHandle;
  if (!p) return null;
  const v = p.variants.nodes[0];
  return { productId: p.id, variantId: v?.id ?? null, inventoryItemId: v?.inventoryItem?.id ?? null };
}

function createProduct(product) {
  const data = adminGraphQL(
    `mutation ProductCreate($product: ProductCreateInput!) {
      productCreate(product: $product) {
        product {
          id handle
          variants(first: 1) { nodes { id inventoryItem { id } } }
        }
        userErrors { field message }
      }
    }`,
    { product: { title: product.title, handle: product.handle, descriptionHtml: product.descriptionHtml ?? "", status: "ACTIVE" } },
  );
  const err = firstUserError(data.productCreate);
  if (err) throw new Error(`productCreate failed for ${product.handle}: ${err}`);
  const created = data.productCreate.product;
  const v = created.variants.nodes[0];
  return { productId: created.id, variantId: v.id, inventoryItemId: v.inventoryItem.id };
}

function attachImage(productId, imageUrl) {
  try {
    const data = adminGraphQL(
      `mutation ProductCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media { id status }
          mediaUserErrors { field message }
        }
      }`,
      { productId, media: [{ originalSource: imageUrl, mediaContentType: "IMAGE" }] },
    );
    const err = firstUserError(data.productCreateMedia);
    if (err) console.warn(`    ⚠ Image: ${err}`);
    else console.log(`    🖼  Image queued`);
  } catch (e) {
    console.warn(`    ⚠ Image skipped: ${e.message}`);
  }
}

function setPrice(variantId, productId, price) {
  const data = adminGraphQL(
    `mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price }
        userErrors { field message }
      }
    }`,
    { productId, variants: [{ id: variantId, price }] },
  );
  const err = firstUserError(data.productVariantsBulkUpdate);
  if (err) throw new Error(`price update failed: ${err}`);
}

function readAvailable(inventoryItemId, locationId) {
  const data = adminGraphQL(
    `query($id: ID!, $locationId: ID!) {
      inventoryItem(id: $id) {
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available"]) { name quantity }
        }
      }
    }`,
    { id: inventoryItemId, locationId },
  );
  return data.inventoryItem?.inventoryLevel?.quantities?.find((q) => q.name === "available")?.quantity ?? 0;
}

function setInventory(inventoryItemId, locationId, quantity, key) {
  adminGraphQL(
    `mutation InventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id }
        userErrors { field message }
      }
    }`,
    { id: inventoryItemId, input: { tracked: true } },
  );

  adminGraphQL(
    `mutation InventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId)
        @idempotent(key: "activate-${key}") {
        inventoryLevel { id }
        userErrors { field message }
      }
    }`.replace("${key}", key),
    { inventoryItemId, locationId },
  );

  const current = readAvailable(inventoryItemId, locationId);
  const delta = quantity - current;
  if (delta !== 0) {
    adminGraphQL(
      `mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input)
          @idempotent(key: "setqty-${key}-${quantity}") {
          inventoryAdjustmentGroup { id }
          userErrors { field message }
        }
      }`.replace("${key}", key).replace("${quantity}", quantity),
      { input: { name: "available", reason: "correction", changes: [{ inventoryItemId, locationId, delta, changeFromQuantity: current }] } },
    );
  }
}

function publish(productId, publicationId) {
  if (!publicationId) return false;
  adminGraphQL(
    `mutation Publish($productId: ID!, $publicationId: ID!) {
      publishablePublish(id: $productId, input: [{ publicationId: $publicationId }]) {
        publishable { publishedOnPublication(publicationId: $publicationId) }
        userErrors { field message }
      }
    }`,
    { productId, publicationId },
  );
  return true;
}

function addToCollection(collectionId, productId) {
  adminGraphQL(
    `mutation CollectionAddProducts($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        collection { id }
        userErrors { field message }
      }
    }`,
    { id: collectionId, productIds: [productId] },
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log("🛍️  333 Lives — Expanded catalog (Round 2)…\n");

  const locationId = resolveLocationId();
  const publicationId = resolvePublicationId();

  // Resolve collection IDs
  const collectionIds = {};
  for (const [key, handle] of Object.entries(COLLECTION_HANDLES)) {
    const id = resolveCollectionId(handle);
    if (!id) throw new Error(`Collection not found: ${handle}. Run seed-333-catalog.mjs first.`);
    collectionIds[handle] = id;
  }

  // Load existing mapping if present
  let mapping = {};
  try { mapping = JSON.parse(readFileSync(MAPPING_FILE, "utf8")); } catch { /* fresh start */ }

  console.log(`\n👕 Adding ${NEW_PRODUCTS.length} new products:\n`);

  for (const product of NEW_PRODUCTS) {
    console.log(`  → ${product.title}`);
    const existing = findExistingProduct(product.handle);
    const ids = existing ?? createProduct(product);

    if (existing) {
      console.log("    ✓ Already exists");
    } else {
      console.log(`    + Created`);
      attachImage(ids.productId, product.imageUrl);
    }

    setPrice(ids.variantId, ids.productId, product.price);
    setInventory(ids.inventoryItemId, locationId, product.quantity, product.handle);
    const published = publish(ids.productId, publicationId);
    addToCollection(collectionIds[product.collection], ids.productId);

    console.log(`    💰 $${product.price}  📦 qty ${product.quantity}  ✅ published`);

    mapping[product.handle] = {
      title: product.title,
      collection: product.collection,
      productId: ids.productId,
      variantId: ids.variantId,
      inventoryItemId: ids.inventoryItemId,
      price: product.price,
      published,
    };
  }

  writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  console.log(`\n✅ Done! Mapping updated → ${MAPPING_FILE}`);
  console.log(`\n📋 Full catalog summary:`);

  const byCollection = {};
  for (const [handle, item] of Object.entries(mapping)) {
    const col = item.collection ?? "unknown";
    if (!byCollection[col]) byCollection[col] = [];
    byCollection[col].push(`${item.title} — $${item.price}`);
  }
  for (const [col, items] of Object.entries(byCollection)) {
    console.log(`\n  ${col}:`);
    items.forEach((i) => console.log(`    • ${i}`));
  }
}

main();

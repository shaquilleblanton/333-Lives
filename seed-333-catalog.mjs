// 333 Lives — Full catalog seed script.
// Creates 3 collections + 11 products, attaches images, sets inventory, publishes.
// Safe to re-run: products are looked up by handle before creation.
//
//   node seed-333-catalog.mjs

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const ADMIN_HELPER = "shopify-admin-api.mjs";
const MAPPING_FILE = "shopify-products.json";
const BASE_IMAGE_URL = "https://f20274bb-315d-4596-94ff-37f419304b95-00-2u89y3cvo8r4.riker.replit.dev/shop";

// ── Collections ──────────────────────────────────────────────────────────────
const COLLECTIONS = [
  {
    handle: "333-lives-legacy",
    title: "333 Lives Legacy",
    descriptionHtml: "<p>Premium luxury pieces built on the 333 Lives crest. Gold wings, timeless silhouettes, crafted for those who live with intention. <em>est. 2020</em></p>",
    imageUrl: `${BASE_IMAGE_URL}/logo-gold.png`,
  },
  {
    handle: "semi-social-social-club",
    title: "Semi Social Social Club",
    descriptionHtml: "<p>Streetwear for the selectively social. The 333 mark front and center — bold colorways, relaxed fits, no explanation needed.</p>",
    imageUrl: `${BASE_IMAGE_URL}/sssc-orange-tee.png`,
  },
  {
    handle: "thr33-eye",
    title: "THR33 Eye",
    descriptionHtml: "<p>The all-seeing eye. A nod to balance, awareness, and the duality within. Semi-social by nature — this one's for the ones who see differently.</p>",
    imageUrl: `${BASE_IMAGE_URL}/thr33-eye.jpeg`,
  },
];

// ── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // ── 333 Lives Legacy ──
  {
    handle: "333-lives-legacy-fleece-jacket",
    title: "333 Lives Legacy Fleece Jacket",
    descriptionHtml: '<p>The signature 333 Lives sherpa fleece. <strong>"Everyone Lives Forever"</strong> arching across the back sleeves, gold wing crest on the chest. Heavy, warm, unforgettable.</p><p>Fit: Relaxed. Material: Sherpa fleece.</p>',
    price: "120.00",
    quantity: 10,
    collection: "333-lives-legacy",
    imageUrl: `${BASE_IMAGE_URL}/fleece-jacket.jpeg`,
  },
  {
    handle: "333-lives-gold-logo-tee",
    title: "333 Lives Gold Logo Tee",
    descriptionHtml: "<p>The gold metallic 333 Lives crest on a premium heavyweight black tee. Wings, halo, and legacy — worn daily.</p><p>Fit: Unisex relaxed. 100% Cotton.</p>",
    price: "45.00",
    quantity: 25,
    collection: "333-lives-legacy",
    imageUrl: `${BASE_IMAGE_URL}/logo-gold.png`,
  },
  {
    handle: "333-lives-wings-hoodie",
    title: "333 Lives Wings Hoodie",
    descriptionHtml: "<p>Gold wing emblem on a heavyweight black hoodie. Classic 333 Lives branding, built to last.</p><p>Fit: Unisex relaxed. 80% Cotton / 20% Poly fleece.</p>",
    price: "75.00",
    quantity: 20,
    collection: "333-lives-legacy",
    imageUrl: `${BASE_IMAGE_URL}/logo-wings.jpeg`,
  },
  {
    handle: "333-lives-wings-cap",
    title: "333 Lives Wings Cap",
    descriptionHtml: "<p>Structured black cap with the 333 Lives gold wing emblem embroidered on the front. One size with adjustable strap.</p>",
    price: "38.00",
    quantity: 20,
    collection: "333-lives-legacy",
    imageUrl: `${BASE_IMAGE_URL}/logo-wings.jpeg`,
  },
  // ── Semi Social Social Club ──
  {
    handle: "sssc-orange-333-tee",
    title: "SSSC 333 Tee — Orange",
    descriptionHtml: '<p>Bold "333" front graphic in orange. <strong>Semi Social Social Club</strong> stacked on the back. The original colorway.</p><p>Black tee, unisex fit. 100% Cotton.</p>',
    price: "45.00",
    quantity: 25,
    collection: "semi-social-social-club",
    imageUrl: `${BASE_IMAGE_URL}/sssc-orange-tee.png`,
  },
  {
    handle: "sssc-pink-333-tee",
    title: "SSSC 333 Tee — Pink",
    descriptionHtml: '<p>Bold "333" front in dusty rose pink. <strong>Semi Social Social Club</strong> stacked on the back. Softer colorway, same energy.</p><p>Black tee, unisex fit. 100% Cotton.</p>',
    price: "45.00",
    quantity: 25,
    collection: "semi-social-social-club",
    imageUrl: `${BASE_IMAGE_URL}/sssc-pink-tee.png`,
  },
  {
    handle: "sssc-red-logo-tee",
    title: "SSSC Red Logo Tee",
    descriptionHtml: '<p><strong>Semi Social Social Club</strong> in signature red stacked type — front and center. Clean, loud, and entirely on brand.</p><p>Black tee, unisex fit. 100% Cotton.</p>',
    price: "45.00",
    quantity: 25,
    collection: "semi-social-social-club",
    imageUrl: `${BASE_IMAGE_URL}/sssc-logo-red.png`,
  },
  {
    handle: "sssc-club-hoodie",
    title: "Semi Social Social Club Hoodie",
    descriptionHtml: '<p>The SSSC hoodie — <strong>Semi Social Social Club</strong> stacked type across the back, 333 mark on the chest. Heavy weight, drop shoulder.</p><p>80% Cotton / 20% Poly. Unisex relaxed fit.</p>',
    price: "75.00",
    quantity: 15,
    collection: "semi-social-social-club",
    imageUrl: `${BASE_IMAGE_URL}/sssc-orange-tee.png`,
  },
  // ── THR33 Eye ──
  {
    handle: "thr33-eye-tee",
    title: "THR33 Eye Tee",
    descriptionHtml: '<p>The all-seeing eye. <strong>THR33</strong> orbiting the iris — yin-yang core, "Be Mi Social" ring. For the ones who see differently.</p><p>White tee, unisex fit. 100% Cotton.</p>',
    price: "45.00",
    quantity: 25,
    collection: "thr33-eye",
    imageUrl: `${BASE_IMAGE_URL}/thr33-eye.jpeg`,
  },
  {
    handle: "thr33-eye-sticker-pack",
    title: "THR33 Eye Sticker Pack",
    descriptionHtml: "<p>5-piece vinyl sticker pack featuring the THR33 Eye logo in multiple sizes. Waterproof, UV resistant. Stick them everywhere.</p>",
    price: "15.00",
    quantity: 50,
    collection: "thr33-eye",
    imageUrl: `${BASE_IMAGE_URL}/thr33-eye.jpeg`,
  },
  {
    handle: "thr33-eye-cap",
    title: "THR33 Eye Cap",
    descriptionHtml: "<p>Structured black cap with the THR33 Eye embroidered on the front panel. Adjustable strap, one size.</p>",
    price: "38.00",
    quantity: 20,
    collection: "thr33-eye",
    imageUrl: `${BASE_IMAGE_URL}/thr33-eye.jpeg`,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function adminGraphQL(query, variables = {}) {
  const result = spawnSync("node", [ADMIN_HELPER, JSON.stringify({ query, variables })], {
    encoding: "utf8",
  });
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
  if (Array.isArray(node.userErrors) && node.userErrors.length > 0) {
    return node.userErrors[0].message || JSON.stringify(node.userErrors[0]);
  }
  if (Array.isArray(node.mediaUserErrors) && node.mediaUserErrors.length > 0) {
    return node.mediaUserErrors[0].message || JSON.stringify(node.mediaUserErrors[0]);
  }
  return null;
}

function resolveLocationId() {
  const data = adminGraphQL(`query { locations(first: 1) { nodes { id name } } }`);
  const loc = data.locations.nodes[0];
  if (!loc) throw new Error("No Shopify location found.");
  console.log(`  Location: ${loc.name} (${loc.id})`);
  return loc.id;
}

function resolvePublicationId() {
  const installData = adminGraphQL(`query { currentAppInstallation { publication { id } } }`);
  const appPubId = installData.currentAppInstallation?.publication?.id;
  if (appPubId) { console.log(`  Publication: Replit Sales Channel (${appPubId})`); return appPubId; }
  const data = adminGraphQL(`query { publications(first: 20) { nodes { id name } } }`);
  const onlineStore = (data.publications.nodes || []).find((p) => p.name === "Online Store");
  if (onlineStore) { console.log(`  Publication: Online Store (${onlineStore.id})`); return onlineStore.id; }
  console.log("  WARNING: No publication found — products will be created but not published.");
  return null;
}

function findExistingCollection(handle) {
  const data = adminGraphQL(
    `query($handle: String!) { collectionByHandle(handle: $handle) { id title } }`,
    { handle },
  );
  return data.collectionByHandle?.id ?? null;
}

function createCollection(col) {
  const data = adminGraphQL(
    `mutation CollectionCreate($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection { id title handle }
        userErrors { field message }
      }
    }`,
    {
      input: {
        title: col.title,
        handle: col.handle,
        descriptionHtml: col.descriptionHtml,
      },
    },
  );
  const err = firstUserError(data.collectionCreate);
  if (err) throw new Error(`collectionCreate failed for ${col.handle}: ${err}`);
  return data.collectionCreate.collection.id;
}

function addProductsToCollection(collectionId, productIds) {
  if (productIds.length === 0) return;
  const data = adminGraphQL(
    `mutation CollectionAddProducts($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        collection { id title }
        userErrors { field message }
      }
    }`,
    { id: collectionId, productIds },
  );
  const err = firstUserError(data.collectionAddProducts);
  if (err) throw new Error(`collectionAddProducts failed: ${err}`);
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
    {
      product: {
        title: product.title,
        handle: product.handle,
        descriptionHtml: product.descriptionHtml ?? "",
        status: "ACTIVE",
      },
    },
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
          media { id status mediaContentType }
          mediaUserErrors { field message }
        }
      }`,
      { productId, media: [{ originalSource: imageUrl, mediaContentType: "IMAGE" }] },
    );
    const err = firstUserError(data.productCreateMedia);
    if (err) console.warn(`    Image attach warning: ${err}`);
    else console.log(`    Image queued: ${imageUrl.split("/").pop()}`);
  } catch (e) {
    console.warn(`    Image attach skipped: ${e.message}`);
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
  let data = adminGraphQL(
    `mutation InventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id tracked }
        userErrors { field message }
      }
    }`,
    { id: inventoryItemId, input: { tracked: true } },
  );
  let err = firstUserError(data.inventoryItemUpdate);
  if (err) throw new Error(`inventoryItemUpdate failed: ${err}`);

  data = adminGraphQL(
    `mutation InventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId)
        @idempotent(key: "activate-${key}") {
        inventoryLevel { id }
        userErrors { field message }
      }
    }`.replace("${key}", key),
    { inventoryItemId, locationId },
  );
  err = firstUserError(data.inventoryActivate);
  if (err) throw new Error(`inventoryActivate failed: ${err}`);

  const current = readAvailable(inventoryItemId, locationId);
  const delta = quantity - current;
  if (delta !== 0) {
    data = adminGraphQL(
      `mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input)
          @idempotent(key: "setqty-${key}-${quantity}") {
          inventoryAdjustmentGroup { id }
          userErrors { field message }
        }
      }`.replace("${key}", key).replace("${quantity}", quantity),
      { input: { name: "available", reason: "correction", changes: [{ inventoryItemId, locationId, delta, changeFromQuantity: current }] } },
    );
    err = firstUserError(data.inventoryAdjustQuantities);
    if (err) throw new Error(`inventoryAdjustQuantities failed: ${err}`);
  }
}

function publish(productId, publicationId) {
  if (!publicationId) return false;
  const data = adminGraphQL(
    `mutation Publish($productId: ID!, $publicationId: ID!) {
      publishablePublish(id: $productId, input: [{ publicationId: $publicationId }]) {
        publishable { publishedOnPublication(publicationId: $publicationId) }
        userErrors { field message }
      }
    }`,
    { productId, publicationId },
  );
  const err = firstUserError(data.publishablePublish);
  if (err) throw new Error(`publishablePublish failed: ${err}`);
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log("🛍️  333 Lives — Seeding catalog…\n");

  const locationId = resolveLocationId();
  const publicationId = resolvePublicationId();

  // 1. Ensure all 3 collections exist
  console.log("\n📦 Collections:");
  const collectionIdMap = {};
  for (const col of COLLECTIONS) {
    let id = findExistingCollection(col.handle);
    if (id) {
      console.log(`  ✓ Reusing: ${col.title}`);
    } else {
      id = createCollection(col);
      console.log(`  + Created: ${col.title} (${id})`);
    }
    collectionIdMap[col.handle] = id;
  }

  // 2. Create/reuse products
  console.log("\n👕 Products:");
  const mapping = {};
  const collectionProducts = {};

  for (const product of PRODUCTS) {
    console.log(`\n  → ${product.title}`);
    const existing = findExistingProduct(product.handle);
    const ids = existing ?? createProduct(product);
    if (existing) {
      console.log("    Reusing existing");
    } else {
      console.log(`    Created (${ids.productId})`);
      attachImage(ids.productId, product.imageUrl);
    }

    setPrice(ids.variantId, ids.productId, product.price);
    console.log(`    Price: $${product.price}`);

    setInventory(ids.inventoryItemId, locationId, product.quantity, product.handle);
    console.log(`    Stock: ${product.quantity}`);

    const published = publish(ids.productId, publicationId);
    console.log(`    Published: ${published}`);

    // Track which products go in which collection
    if (!collectionProducts[product.collection]) collectionProducts[product.collection] = [];
    collectionProducts[product.collection].push(ids.productId);

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

  // 3. Assign products to collections
  console.log("\n🗂️  Assigning products to collections…");
  for (const [colHandle, productIds] of Object.entries(collectionProducts)) {
    addProductsToCollection(collectionIdMap[colHandle], productIds);
    console.log(`  ✓ ${colHandle}: ${productIds.length} product(s)`);
  }

  writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  console.log(`\n✅ Done! ${PRODUCTS.length} products across ${COLLECTIONS.length} collections.`);
  console.log(`   Mapping saved to ${MAPPING_FILE}`);
}

main();

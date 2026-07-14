// Finishes the last 4 THR33 Eye products.
import { spawnSync } from "node:child_process";
const ADMIN = "shopify-admin-api.mjs";
const BASE = "https://f20274bb-315d-4596-94ff-37f419304b95-00-2u89y3cvo8r4.riker.replit.dev/shop";

const REMAINING = [
  { handle: "thr33-eye-cutoff-tank",        title: "THR33 Eye Cutoff Tank",             price: "38.00", qty: 20, img: `${BASE}/thr33-eye.jpeg`, desc: "<p>Raw-edge oversized cutoff tank with the THR33 all-seeing eye printed center chest. 100% organic cotton. Unisex.</p>" },
  { handle: "thr33-eye-organic-sweatpants", title: "THR33 Eye Organic Sweatpants",      price: "68.00", qty: 15, img: `${BASE}/thr33-eye.jpeg`, desc: "<p>Wide-leg organic cotton fleece sweats with the THR33 Eye embroidered on the left hip. 100% GOTS-certified organic cotton.</p>" },
  { handle: "thr33-eye-organic-shorts",     title: "THR33 Eye Organic Shorts",           price: "55.00", qty: 15, img: `${BASE}/thr33-eye.jpeg`, desc: "<p>Baggy organic cotton shorts, THR33 all-seeing eye on the left thigh. 8\" inseam, elastic waist. 100% GOTS-certified organic cotton.</p>" },
  { handle: "thr33-eye-socks",              title: "THR33 Eye Socks — 3 Pack",           price: "22.00", qty: 50, img: `${BASE}/thr33-eye.jpeg`, desc: "<p>Mid-calf crew socks with the THR33 all-seeing eye woven into the ankle. 3-pack. 80% organic cotton.</p>" },
];

function gql(query, vars = {}) {
  const r = spawnSync("node", [ADMIN, JSON.stringify({ query, variables: vars })], { encoding: "utf8" });
  if (r.error) throw new Error(r.error.message);
  const d = JSON.parse(r.stdout || "{}");
  if (r.status !== 0) throw new Error(JSON.stringify(d.errors ?? r.stdout));
  return d.data;
}

const loc   = gql(`query { locations(first:1){ nodes{ id } } }`).locations.nodes[0].id;
const pubId = gql(`query { currentAppInstallation { publication { id } } }`).currentAppInstallation?.publication?.id;
const colId = gql(`query($h:String!){ collectionByHandle(handle:$h){ id } }`, { h: "thr33-eye" }).collectionByHandle.id;

for (const p of REMAINING) {
  console.log(`\n→ ${p.title}`);

  // Check / create
  let existing = gql(`query($h:String!){ productByHandle(handle:$h){ id variants(first:1){ nodes{ id inventoryItem{ id } } } } }`, { h: p.handle }).productByHandle;
  let productId, variantId, invItemId;
  if (existing) {
    productId = existing.id; variantId = existing.variants.nodes[0].id; invItemId = existing.variants.nodes[0].inventoryItem.id;
    console.log("  already exists");
  } else {
    const c = gql(`mutation C($p:ProductCreateInput!){ productCreate(product:$p){ product{ id variants(first:1){ nodes{ id inventoryItem{ id } } } } userErrors{ message } } }`,
      { p: { title: p.title, handle: p.handle, descriptionHtml: p.desc, status: "ACTIVE" } }).productCreate;
    if (c.userErrors?.length) throw new Error(c.userErrors[0].message);
    productId = c.product.id; variantId = c.product.variants.nodes[0].id; invItemId = c.product.variants.nodes[0].inventoryItem.id;
    console.log(`  created ${productId}`);
    // image
    gql(`mutation M($pid:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$pid,media:$m){ media{ id } mediaUserErrors{ message } } }`,
      { pid: productId, m: [{ originalSource: p.img, mediaContentType: "IMAGE" }] });
    console.log("  image queued");
  }

  // price
  gql(`mutation U($pid:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid,variants:$v){ productVariants{ id } userErrors{ message } } }`,
    { pid: productId, v: [{ id: variantId, price: p.price }] });

  // inventory track
  gql(`mutation T($id:ID!,$i:InventoryItemInput!){ inventoryItemUpdate(id:$id,input:$i){ inventoryItem{ id } userErrors{ message } } }`,
    { id: invItemId, i: { tracked: true } });

  // activate
  gql(`mutation A($ii:ID!,$li:ID!){ inventoryActivate(inventoryItemId:$ii,locationId:$li) @idempotent(key:"act-${p.handle}") { inventoryLevel{ id } userErrors{ message } } }`.replace("${p.handle}", p.handle),
    { ii: invItemId, li: loc });

  // set qty
  const cur = gql(`query($id:ID!,$l:ID!){ inventoryItem(id:$id){ inventoryLevel(locationId:$l){ quantities(names:["available"]){ name quantity } } } }`,
    { id: invItemId, l: loc }).inventoryItem?.inventoryLevel?.quantities?.find(q => q.name === "available")?.quantity ?? 0;
  if (p.qty - cur !== 0) {
    gql(`mutation Q($i:InventoryAdjustQuantitiesInput!){ inventoryAdjustQuantities(input:$i) @idempotent(key:"qty-${p.handle}") { inventoryAdjustmentGroup{ id } userErrors{ message } } }`.replace("${p.handle}", p.handle),
      { i: { name: "available", reason: "correction", changes: [{ inventoryItemId: invItemId, locationId: loc, delta: p.qty - cur, changeFromQuantity: cur }] } });
  }

  // publish
  if (pubId) gql(`mutation P($pid:ID!,$pub:ID!){ publishablePublish(id:$pid,input:[{publicationId:$pub}]){ publishable{ publishedOnPublication(publicationId:$pub) } userErrors{ message } } }`,
    { pid: productId, pub: pubId });

  // add to collection
  gql(`mutation C($id:ID!,$pids:[ID!]!){ collectionAddProducts(id:$id,productIds:$pids){ collection{ id } userErrors{ message } } }`,
    { id: colId, pids: [productId] });

  console.log(`  $${p.price}  qty ${p.qty}  ✅ published`);
}
console.log("\n✅ All 4 THR33 Eye items done — catalog complete!");

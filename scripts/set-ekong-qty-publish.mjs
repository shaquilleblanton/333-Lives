/**
 * Step 3: Set inventory quantities and publish all Ekong products.
 * inventoryActivate already succeeded for all 13 in-stock products.
 * Run: node scripts/set-ekong-qty-publish.mjs
 */

const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
const token = process.env.REPL_IDENTITY
  ? `repl ${process.env.REPL_IDENTITY}`
  : process.env.WEB_REPL_RENEWAL
    ? `depl ${process.env.WEB_REPL_RENEWAL}`
    : null;

const LOCATION_ID = "gid://shopify/Location/90683834601";
const PUBLICATION_ID = "gid://shopify/Publication/195974824169";
const protocol = hostname.startsWith("localhost") ? "http" : "https";

async function adminQuery(body) {
  const resp = await fetch(
    `${protocol}://${hostname}/api/v2/proxy/admin/api/2026-04/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Replit-Token": token,
        "Connector-Name": "shopify-store",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    }
  );
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Non-JSON response: ${text.slice(0,200)}`); }
  if (data.errors?.length) throw new Error(JSON.stringify(data.errors));
  return data.data;
}

const STOCK = {
  "CHLOROPHYLL®": 50,
  "HEGGS®": 40,
  "FONIO® (The Seed of the Universe)": 60,
  "GOLD SEAMOSS®": 50,
  "PURPLE SEAMOSS®": 40,
  "1KG GOLD SEAMOSS®": 25,
  "ENDOCRINE® (Seamoss & Bladderwrack Powder)": 35,
  "COLON CLEANSING TEA®": 45,
  "CUACHALALATE®": 35,
  "KING OF THE FOREST®": 30,
  "STRONG BACK®": 35,
  "BLACK WALNUT HULL POWDER®": 30,
  "IRON FLUORINE TEA BAGS®": 20,
  "REISHI® (Medium)": 0,
  "REISHI® (Large)": 0,
};

const allData = await adminQuery({
  query: `query {
    products(first: 50, query: "tag:ekong") {
      nodes {
        id title
        variants(first: 1) { nodes { id inventoryItem { id } } }
      }
    }
  }`,
});

const products = allData.products.nodes;
console.log(`\nSetting qty + publishing ${products.length} Ekong products...\n`);

for (const p of products) {
  const variant = p.variants.nodes[0];
  const invItemId = variant.inventoryItem.id;
  const qty = STOCK[p.title] ?? 30;
  process.stdout.write(`  ${p.title} ...`);

  try {
    // Set quantity (skip for out-of-stock)
    if (qty > 0) {
      const d = await adminQuery({
        query: `mutation {
          inventorySetQuantities(input: {
            name: "available"
            reason: "correction"
            quantities: [{
              inventoryItemId: "${invItemId}"
              locationId: "${LOCATION_ID}"
              quantity: ${qty}
              changeFromQuantity: 0
            }]
          }) @idempotent(key: "set-qty-${invItemId}") {
            inventoryAdjustmentGroup { id }
            userErrors { field message }
          }
        }`,
      });
      if (d.inventorySetQuantities.userErrors.length)
        throw new Error(JSON.stringify(d.inventorySetQuantities.userErrors));
    }

    // Publish to Replit sales channel
    const dp = await adminQuery({
      query: `mutation {
        publishablePublish(id: "${p.id}", input: [{ publicationId: "${PUBLICATION_ID}" }]) {
          publishable { ... on Product { title } }
          userErrors { field message }
        }
      }`,
    });
    if (dp.publishablePublish.userErrors.length)
      throw new Error(JSON.stringify(dp.publishablePublish.userErrors));

    console.log(` ✅  qty:${qty}`);
  } catch (err) {
    console.log(` ❌  ${err.message}`);
  }
}

console.log("\nAll done.\n");

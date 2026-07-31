/**
 * Creates Ekong's physical herbal/health products in the 333 Lives Shopify store.
 * Run: node scripts/add-ekong-products.mjs
 */

const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
const token = process.env.REPL_IDENTITY
  ? `repl ${process.env.REPL_IDENTITY}`
  : process.env.WEB_REPL_RENEWAL
    ? `depl ${process.env.WEB_REPL_RENEWAL}`
    : null;

if (!hostname || !token) {
  console.error("Missing Replit connector environment.");
  process.exit(1);
}

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
  const data = await resp.json();
  if (data.errors?.length) throw new Error(JSON.stringify(data.errors));
  return data.data;
}

// ── Product catalogue ────────────────────────────────────────────────────────
// Prices in USD. GBP prices from eattolivenottodie.com converted at ~1.27.
// Categories: Gut Health | Energy | Bone Health | Wellness | Sea Vegetables
const PRODUCTS = [
  {
    title: "CHLOROPHYLL®",
    price: "10.00",
    inStock: true, qty: 50,
    category: "Wellness",
    tags: ["wellness", "herbal", "ekong", "alkaline"],
    descriptionHtml: `<p><strong>CHLOROPHYLL®</strong> is liquid gold for your cells. Chlorophyll is the green pigment found in plants that absorbs sunlight and converts it to energy. It cleanses the blood, eliminates body odour, supports gut health, and boosts oxygen levels in the body. It is also a powerful antioxidant and anti-inflammatory. Add to water or juice daily.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "HEGGS®",
    price: "15.00",
    inStock: true, qty: 40,
    category: "Bone Health",
    tags: ["bone-health", "herbal", "ekong", "alkaline"],
    descriptionHtml: `<p><strong>HEGGS®</strong> is a powerful herbal blend specifically formulated to strengthen and remineralise the bones. Rich in calcium and silica from plant sources, HEGGS® supports bone density, joint health, and connective tissue repair — without dairy or synthetic minerals.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "FONIO® (The Seed of the Universe)",
    price: "15.00",
    inStock: true, qty: 60,
    category: "Bone Health",
    tags: ["bone-health", "grain", "ekong", "alkaline", "superfood"],
    descriptionHtml: `<p><strong>FONIO®</strong> is the most ancient grain cultivated in West Africa. Say hello to your new rice replacement. Fonio takes only 5 minutes to cook — making it the fastest-cooking grain. It is gluten-free, packed with amino acids (particularly methionine and cysteine), and supports bone strength, digestion, and blood sugar balance. Truly a gift from the earth.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "GOLD SEAMOSS®",
    price: "25.00",
    inStock: true, qty: 50,
    category: "Sea Vegetables",
    tags: ["seamoss", "sea-vegetable", "ekong", "alkaline", "minerals"],
    descriptionHtml: `<p><strong>GOLD SEAMOSS®</strong> is nature's most complete mineral food. Sea moss nourishes the endocrine system and offers 92 of the 102 minerals the human body is made of. Use it to support your bones, brain, muscles, thyroid, glands, digestion, and respiratory health. A natural diuretic and mucilage that coats and soothes the digestive tract.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "PURPLE SEAMOSS®",
    price: "25.00",
    inStock: true, qty: 40,
    category: "Sea Vegetables",
    tags: ["seamoss", "sea-vegetable", "ekong", "alkaline", "minerals", "antioxidant"],
    descriptionHtml: `<p><strong>PURPLE SEAMOSS®</strong> carries all the mineral-rich benefits of gold sea moss, plus the added power of anthocyanins — the purple pigment that acts as a potent antioxidant and anti-inflammatory. Supports the endocrine system, provides 92 of the 102 minerals the body requires, and aids respiratory, bone, thyroid, and digestive health.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "1KG GOLD SEAMOSS®",
    price: "58.00",
    inStock: true, qty: 25,
    category: "Sea Vegetables",
    tags: ["seamoss", "sea-vegetable", "ekong", "alkaline", "minerals", "bulk"],
    descriptionHtml: `<p><strong>1KG GOLD SEAMOSS®</strong> — the bulk option for committed wellness practitioners. Sea moss offers 92 of the 102 minerals the human body requires. Nourishes the endocrine system, supports bones, brain, muscles, thyroid, and respiratory health. A natural diuretic and digestive soother. Stock up and never run out.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "ENDOCRINE® (Seamoss & Bladderwrack Powder)",
    price: "38.00",
    inStock: true, qty: 35,
    category: "Sea Vegetables",
    tags: ["seamoss", "bladderwrack", "ekong", "alkaline", "endocrine", "thyroid"],
    descriptionHtml: `<p><strong>ENDOCRINE®</strong> is powdered sea moss and bladderwrack — a potent sea vegetable blend rich in iodine that directly supports the endocrine system. The endocrine system is a collection of glands that produce hormones controlling your moods, growth, metabolism, and reproductive system. If your hormones are off, everything is off.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "COLON CLEANSING TEA®",
    price: "25.00",
    inStock: true, qty: 45,
    category: "Gut Health",
    tags: ["gut-health", "cleanse", "detox", "ekong", "alkaline", "tea"],
    descriptionHtml: `<p><strong>COLON CLEANSING TEA®</strong> is a powerful herbal blend designed to gently but effectively purge built-up waste and toxins from the colon. Before starting, transition to an alkaline diet for maximum results. Free from meat, dairy, starch, and processed foods during the cleanse for optimal impact. A clean colon is the foundation of all good health.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "CUACHALALATE®",
    price: "32.00",
    inStock: true, qty: 35,
    category: "Gut Health",
    tags: ["gut-health", "bark", "herbal", "ekong", "alkaline", "digestive"],
    descriptionHtml: `<p><strong>CUACHALALATE®</strong> is a sacred bark used for centuries in Mexico and Central America. Known to help with gastric ulcers, mouth sores, digestive pain, acid reflux, high cholesterol, urinary infections, fever, and inflammatory conditions. A powerful gut-healing and immune-supporting herb trusted by indigenous healers for generations.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "KING OF THE FOREST®",
    price: "38.00",
    inStock: true, qty: 30,
    category: "Gut Health",
    tags: ["gut-health", "mushroom", "ekong", "alkaline", "immune", "adaptogen"],
    descriptionHtml: `<p><strong>KING OF THE FOREST®</strong> is a premium medicinal mushroom blend formulated to support gut integrity, immunity, and vitality. Medicinal mushrooms have been used for thousands of years in Eastern medicine as powerful adaptogens — helping the body resist physical and mental stress while restoring balance and energy.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "STRONG BACK®",
    price: "32.00",
    inStock: true, qty: 35,
    category: "Bone Health",
    tags: ["bone-health", "energy", "ekong", "alkaline", "back", "stamina"],
    descriptionHtml: `<p><strong>STRONG BACK®</strong> is a plant native to the Caribbean Islands, Southern Florida, South America, and Jamaica. It strengthens the bones and back muscles while improving energy levels and building stamina. Trusted for backaches, joint pain, diabetes support, and general vitality. A staple herb in Caribbean wellness traditions.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "BLACK WALNUT HULL POWDER®",
    price: "38.00",
    inStock: true, qty: 30,
    category: "Bone Health",
    tags: ["bone-health", "detox", "ekong", "alkaline", "antiparasitic"],
    descriptionHtml: `<p><strong>BLACK WALNUT HULL POWDER®</strong> is extracted from the outer hull of the black walnut and is one of the most potent antiparasitic, antifungal, and antibacterial herbs in nature. It helps cleanse the intestines, remove parasites, support bone health, and remineralise the body. Used for centuries in Native American and European herbal traditions.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "IRON FLUORINE TEA BAGS®",
    price: "100.00",
    inStock: true, qty: 20,
    category: "Energy",
    tags: ["energy", "iron", "tea", "ekong", "alkaline", "blood-health"],
    descriptionHtml: `<p><strong>IRON FLUORINE TEA BAGS®</strong> is a premium, mineral-dense herbal tea formulated specifically to boost iron and fluorine levels in the body — essential minerals for oxygen transport, red blood cell production, bone strength, and nerve function. Ideal for those experiencing fatigue, anaemia, low energy, or poor circulation. Steep and replenish.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "REISHI® (Medium)",
    price: "50.00",
    inStock: false, qty: 0,
    category: "Energy",
    tags: ["energy", "mushroom", "ekong", "alkaline", "adaptogen", "immune"],
    descriptionHtml: `<p><strong>REISHI® (Medium)</strong> — Reishi mushrooms (<em>Ganoderma Lucidum</em>) are referred to as "The Mushroom of Immortality." Rich in bioactive polysaccharides, triterpenoids, and antioxidants, Reishi supports immune function, energy levels, sleep quality, stress resilience, and longevity. Revered for over 2,000 years in Eastern medicine as the supreme tonic herb.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
  {
    title: "REISHI® (Large)",
    price: "82.00",
    inStock: false, qty: 0,
    category: "Energy",
    tags: ["energy", "mushroom", "ekong", "alkaline", "adaptogen", "immune", "bulk"],
    descriptionHtml: `<p><strong>REISHI® (Large)</strong> — The large supply of "The Mushroom of Immortality." Reishi (<em>Ganoderma Lucidum</em>) is packed with polysaccharides, triterpenoids, and antioxidants that support immunity, sustained energy, deep sleep, and stress resilience. For those committed to a long-term Reishi practice, the large size is the way.</p><p><em>Sourced and curated by Ekong of Eat To Live Not To Die.</em></p>`,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createProduct(p) {
  const data = await adminQuery({
    query: `mutation ProductCreate($input: ProductCreateInput!) {
      productCreate(product: $input) {
        product { id title handle }
        userErrors { field message }
      }
    }`,
    variables: {
      input: {
        title: p.title,
        descriptionHtml: p.descriptionHtml,
        status: "ACTIVE",
        tags: p.tags,
        productType: p.category,
      },
    },
  });
  const ue = data.productCreate.userErrors;
  if (ue.length) throw new Error(`productCreate: ${JSON.stringify(ue)}`);
  return data.productCreate.product;
}

async function getVariantAndInventory(productId) {
  const data = await adminQuery({
    query: `query GetVariants($id: ID!) {
      product(id: $id) {
        variants(first: 5) {
          nodes { id title inventoryItem { id } }
        }
      }
    }`,
    variables: { id: productId },
  });
  return data.product.variants.nodes[0];
}

async function setPrice(productId, variantId, price) {
  const data = await adminQuery({
    query: `mutation BulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price }
        userErrors { field message }
      }
    }`,
    variables: { productId, variants: [{ id: variantId, price }] },
  });
  const ue = data.productVariantsBulkUpdate.userErrors;
  if (ue.length) throw new Error(`setPrice: ${JSON.stringify(ue)}`);
}

async function setupInventory(inventoryItemId, qty) {
  // 1. Enable tracking
  const d1 = await adminQuery({
    query: `mutation InvItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id tracked }
        userErrors { field message }
      }
    }`,
    variables: { id: inventoryItemId, input: { tracked: true } },
  });
  if (d1.inventoryItemUpdate.userErrors.length)
    throw new Error(JSON.stringify(d1.inventoryItemUpdate.userErrors));

  // 2. Activate at location
  const d2 = await adminQuery({
    query: `mutation InvActivate($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
        inventoryLevel { id }
        userErrors { field message }
      }
    }`,
    variables: { inventoryItemId, locationId: LOCATION_ID },
  });
  if (d2.inventoryActivate.userErrors.length)
    throw new Error(JSON.stringify(d2.inventoryActivate.userErrors));

  // 3. Set quantity
  if (qty > 0) {
    const d3 = await adminQuery({
      query: `mutation InvSet($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          inventoryAdjustmentGroup { id }
          userErrors { field message }
        }
      }`,
      variables: {
        input: {
          name: "available",
          reason: "correction",
          quantities: [{ inventoryItemId, locationId: LOCATION_ID, quantity: qty }],
        },
      },
    });
    if (d3.inventorySetQuantities.userErrors.length)
      throw new Error(JSON.stringify(d3.inventorySetQuantities.userErrors));
  }
}

async function publish(productId) {
  const data = await adminQuery({
    query: `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        publishable { ... on Product { title } }
        userErrors { field message }
      }
    }`,
    variables: { id: productId, input: [{ publicationId: PUBLICATION_ID }] },
  });
  if (data.publishablePublish.userErrors.length)
    throw new Error(JSON.stringify(data.publishablePublish.userErrors));
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`\nAdding ${PRODUCTS.length} Ekong health products to the 333 Lives store...\n`);

let created = 0, failed = 0;
for (const p of PRODUCTS) {
  process.stdout.write(`  ${p.title} ...`);
  try {
    const product = await createProduct(p);
    const variant = await getVariantAndInventory(product.id);
    await setPrice(product.id, variant.id, p.price);
    await setupInventory(variant.inventoryItem.id, p.qty);
    await publish(product.id);
    console.log(` ✅  $${p.price}${!p.inStock ? " [out of stock]" : ""}`);
    created++;
  } catch (err) {
    console.log(` ❌  ${err.message}`);
    failed++;
  }
}

console.log(`\nDone — ${created} created, ${failed} failed.\n`);

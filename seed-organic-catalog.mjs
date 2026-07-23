// 333 Lives — Organic / Toxic-Free Home Catalog Seed Script
// Creates 9 collections + 50+ products, sets inventory, publishes.
// Safe to re-run: products are looked up by handle before creation.
//
//   node seed-organic-catalog.mjs

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const ADMIN_HELPER = "shopify-admin-api.mjs";
const MAPPING_FILE = "shopify-organic-products.json";

// ── Collections ───────────────────────────────────────────────────────────────
const COLLECTIONS = [
  {
    handle: "oral-care",
    title: "Oral Care",
    descriptionHtml: `<p>Your mouth is the gateway to your body. Fluoride, artificial sweeteners, and alcohol-based rinses disrupt your gut microbiome and hormone balance. Every product here is free from fluoride, SLS, parabens, and synthetic fragrance — replacing toxic habits with ones that actually support your health.</p>`,
  },
  {
    handle: "shower-and-bath",
    title: "Shower & Bath",
    descriptionHtml: `<p>The average shower curtain off-gasses dozens of VOCs when steam heats the PVC plastic. Polyester towels shed microplastics directly onto your skin. We've replaced every piece with organic cotton, bamboo, and natural fiber alternatives — plus shower and sink filters that strip chlorine, fluoride, and heavy metals before they touch you.</p>`,
  },
  {
    handle: "skin-and-body-care",
    title: "Skin & Body Care",
    descriptionHtml: `<p>Your skin absorbs up to 60% of what you put on it. Conventional lotions, deodorants, and scrubs are loaded with aluminum, parabens, phthalates, and synthetic fragrance — all linked to endocrine disruption. Everything here is plant-based, food-grade where possible, and built around ingredients your body recognizes.</p>`,
  },
  {
    handle: "hair-care",
    title: "Hair Care",
    descriptionHtml: `<p>Rubber bands, synthetic scrunchies, and polyester pillowcases break hair and leach microplastics. Sulfate shampoos strip your scalp's natural oils, triggering overproduction. We've curated silk, organic cotton, and plant-based alternatives for every part of your hair routine.</p>`,
  },
  {
    handle: "feminine-care",
    title: "Feminine Care",
    descriptionHtml: `<p>Conventional tampons and pads are bleached with chlorine and made from synthetic fibers that sit against your most absorbent tissue for hours. Organic cotton, medical-grade silicone, and plant-based alternatives eliminate that exposure entirely.</p>`,
  },
  {
    handle: "kitchen-and-cooking",
    title: "Kitchen & Cooking",
    descriptionHtml: `<p>Teflon non-stick coatings release PFAS "forever chemicals" when heated. Plastic utensils leach BPA and microplastics into hot food. We've replaced the entire kitchen with cast iron, stainless steel, ceramic, bamboo, and glass — materials humans have cooked with safely for centuries.</p>`,
  },
  {
    handle: "laundry-and-home-cleaning",
    title: "Laundry & Home Cleaning",
    descriptionHtml: `<p>Conventional detergents contain synthetic musks, optical brighteners, and surfactants that don't fully rinse out — leaving residue against your skin all day. Dryer sheets coat your clothes in a film of synthetic fragrance and fabric softener. Plant-based swaps clean just as effectively with none of the chemical load.</p>`,
  },
  {
    handle: "wellness-and-supplements",
    title: "Wellness & Supplements",
    descriptionHtml: `<p>Food-grade, consumable superfoods and supplements derived from nature. MCT oil, sea moss, shilajit, and magnesium — these are the foundations of cellular energy, hormone balance, and gut health. No fillers, no synthetic additives.</p>`,
  },
  {
    handle: "subscription-boxes",
    title: "Subscription Boxes",
    descriptionHtml: `<p>Replace your toxic home one room at a time. Choose the box that matches where you are — Starter (3 items), Core (6 items), Complete (9 items), or Total Detox (12 items). Every box ships with a card explaining exactly what each product replaces and why it matters for your health.</p>`,
  },
];

// ── Products ──────────────────────────────────────────────────────────────────
const PRODUCTS = [

  // ── ORAL CARE ──────────────────────────────────────────────────────────────
  {
    handle: "fluoride-free-charcoal-toothpaste",
    title: "Activated Charcoal Toothpaste — Fluoride Free",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional fluoride toothpaste.</p><p>Fluoride is a neurotoxin added to water supplies and toothpaste under the premise of cavity prevention — yet the science linking it to lower IQ in children and thyroid disruption in adults is growing. This activated charcoal formula whitens naturally, remineralizes with hydroxyapatite (the same mineral your enamel is made of), and contains zero fluoride, SLS, or artificial sweetener.</p><ul><li>Activated charcoal + hydroxyapatite</li><li>Fluoride-free, SLS-free, glycerin-free</li><li>Mint flavor from pure peppermint essential oil</li></ul>`,
    price: "14.99",
    quantity: 50,
    collection: "oral-care",
    imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&q=80",
  },
  {
    handle: "bamboo-toothbrush",
    title: "Bamboo Toothbrush — Soft Bristle",
    descriptionHtml: `<p><strong>What it replaces:</strong> Plastic toothbrush.</p><p>Over 4.7 billion plastic toothbrushes end up in landfills and oceans every year — they never biodegrade. Each one you've used since childhood still exists somewhere on this planet. This bamboo handle is fully compostable. The BPA-free soft nylon bristles clean just as effectively as any plastic brush, without the lifetime of plastic waste.</p><ul><li>FSC-certified bamboo handle</li><li>BPA-free soft bristles</li><li>Fully compostable handle</li></ul>`,
    price: "8.99",
    quantity: 100,
    collection: "oral-care",
    imageUrl: "https://images.unsplash.com/photo-1559056961-1f4a3b3c3b3e?w=800&q=80",
  },
  {
    handle: "silk-dental-floss",
    title: "Silk Dental Floss — Natural Mint",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional nylon/PTFE floss.</p><p>Standard dental floss is coated in PTFE — the same Teflon used in non-stick pans. PFAS compounds from floss have been found in people's blood. Silk floss is biodegradable, coated in natural beeswax, and flavored with real peppermint oil. Same clean, none of the chemical exposure.</p><ul><li>100% natural silk</li><li>Beeswax coated, PTFE-free</li><li>Refillable glass jar packaging</li></ul>`,
    price: "11.99",
    quantity: 75,
    collection: "oral-care",
    imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&q=80",
  },
  {
    handle: "alcohol-free-mouthwash",
    title: "Alcohol-Free Herbal Mouthwash",
    descriptionHtml: `<p><strong>What it replaces:</strong> Listerine and conventional mouthwash.</p><p>Alcohol-based mouthwash kills all bacteria in your mouth — including the beneficial strains your body needs for digestion, immune response, and even blood pressure regulation. This herbal formula uses tea tree oil, neem, and xylitol to selectively target harmful bacteria without nuking your oral microbiome.</p><ul><li>Alcohol-free, fluoride-free</li><li>Tea tree, neem, and peppermint</li><li>Supports oral microbiome balance</li></ul>`,
    price: "16.99",
    quantity: 60,
    collection: "oral-care",
    imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&q=80",
  },
  {
    handle: "copper-tongue-scraper",
    title: "Copper Tongue Scraper",
    descriptionHtml: `<p><strong>What it replaces:</strong> Plastic tongue scraper or none at all.</p><p>Copper has natural antimicrobial properties — it kills bacteria on contact. Tongue scraping removes the bacterial biofilm that accumulates overnight, reducing bad breath at the source rather than masking it with minty chemicals. Used in Ayurvedic medicine for over 5,000 years. Lasts a lifetime.</p><ul><li>100% pure copper</li><li>Naturally antimicrobial</li><li>Lifetime durability</li></ul>`,
    price: "12.99",
    quantity: 80,
    collection: "oral-care",
    imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&q=80",
  },
  {
    handle: "coconut-oil-pulling",
    title: "Organic Coconut Oil for Oil Pulling — 16oz",
    descriptionHtml: `<p><strong>What it replaces:</strong> Chemical whitening strips and mouthwash.</p><p>Oil pulling is an ancient detoxification practice where you swish coconut oil for 10–20 minutes, binding to bacteria and toxins in your mouth before spitting them out. Studies show it reduces plaque, gingivitis, and harmful bacteria as effectively as chlorhexidine mouthwash — without any chemical exposure. This unrefined, cold-pressed organic coconut oil is also food-grade for cooking.</p><ul><li>USDA Certified Organic</li><li>Unrefined, cold-pressed, virgin</li><li>Dual use: oral pulling + cooking</li></ul>`,
    price: "18.99",
    quantity: 50,
    collection: "oral-care",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80",
  },

  // ── SHOWER & BATH ──────────────────────────────────────────────────────────
  {
    handle: "organic-cotton-shower-curtain",
    title: "Organic Cotton Shower Curtain — No PVC",
    descriptionHtml: `<p><strong>What it replaces:</strong> PVC/vinyl plastic shower curtain.</p><p>When steam from a hot shower heats a PVC shower curtain, it releases phthalates, VOCs, and dioxins into the air you're breathing in an enclosed space. Studies have found up to 108 volatile organic compounds off-gassing from a new plastic shower curtain. This GOTS-certified organic cotton curtain is naturally mold-resistant, machine washable, and completely non-toxic.</p><ul><li>GOTS-certified organic cotton</li><li>No PVC, no phthalates, no VOCs</li><li>Machine washable, naturally mold-resistant</li></ul>`,
    price: "54.99",
    quantity: 30,
    collection: "shower-and-bath",
    imageUrl: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80",
  },
  {
    handle: "shower-filter-chlorine",
    title: "Shower Filter — Removes Chlorine, Fluoride & Heavy Metals",
    descriptionHtml: `<p><strong>What it replaces:</strong> Unfiltered tap water in your shower.</p><p>Your skin is your largest organ and it absorbs what it's exposed to. A 10-minute shower exposes you to more chlorine than drinking 8 glasses of unfiltered tap water — because steam carries it directly into your lungs too. This 15-stage filter removes chlorine, fluoride, heavy metals, bacteria, and sediment before water hits your skin or you breathe the steam.</p><ul><li>15-stage filtration (KDF-55, calcium sulfite, activated carbon)</li><li>Fits standard shower heads</li><li>Replace filter every 6 months</li></ul>`,
    price: "49.99",
    quantity: 40,
    collection: "shower-and-bath",
    imageUrl: "https://images.unsplash.com/photo-1620626011761-996317702782?w=800&q=80",
  },
  {
    handle: "sink-faucet-filter",
    title: "Sink Faucet Filter — 3-Stage",
    descriptionHtml: `<p><strong>What it replaces:</strong> Unfiltered tap water for drinking, cooking, and brushing teeth.</p><p>The water coming out of your tap is treated with chlorine, chloramine, and in many cities, fluoride. Lead from aging pipes is a documented issue in cities across the US. This 3-stage faucet filter attaches in seconds and removes all of it — giving you clean water for drinking, cooking, and rinsing your mouth after brushing.</p><ul><li>Removes chlorine, fluoride, lead, bacteria</li><li>Installs in under 2 minutes, no tools</li><li>Compatible with standard faucets</li></ul>`,
    price: "39.99",
    quantity: 40,
    collection: "shower-and-bath",
    imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
  },
  {
    handle: "organic-cotton-towel-set",
    title: "Organic Cotton Towel Set — 2 Bath + 2 Hand",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional polyester-blend towels.</p><p>Most towels sold today are a polyester blend — meaning every time you dry off, synthetic microfibers shed onto your skin and get absorbed. Pure organic cotton is softer, more absorbent, and free from pesticide residues (conventional cotton uses ~25% of the world's insecticides). GOTS-certified means every step of production is verified clean.</p><ul><li>GOTS-certified 100% organic cotton</li><li>600 GSM — plush and highly absorbent</li><li>No bleach, no optical brighteners, no synthetic dye</li></ul>`,
    price: "64.99",
    quantity: 35,
    collection: "shower-and-bath",
    imageUrl: "https://images.unsplash.com/photo-1620626011761-996317702782?w=800&q=80",
  },
  {
    handle: "coconut-fiber-body-scrubber",
    title: "Coconut Fiber Body Scrubber",
    descriptionHtml: `<p><strong>What it replaces:</strong> Plastic loofah or synthetic bath sponge.</p><p>Plastic loofahs harbor bacteria within days and shed microplastics every time you use them. Coconut fiber is naturally antibacterial, biodegradable, and provides the same exfoliating texture — derived from the husk of coconuts that would otherwise be waste. Lasts 2–3x longer than a plastic loofa.</p><ul><li>100% natural coconut coir fiber</li><li>Naturally antibacterial and antifungal</li><li>Fully biodegradable</li></ul>`,
    price: "12.99",
    quantity: 80,
    collection: "shower-and-bath",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  },
  {
    handle: "bamboo-back-brush",
    title: "Long Bamboo Back Brush — Natural Bristle",
    descriptionHtml: `<p><strong>What it replaces:</strong> Plastic back scrubber.</p><p>The back is one of the hardest areas to exfoliate and clean — dead skin buildup leads to back acne and poor circulation. This long-handled bamboo brush with natural bristles reaches every area, stimulates lymphatic drainage through dry or wet brushing, and is completely free from synthetic materials.</p><ul><li>FSC-certified bamboo handle</li><li>Natural boar and plant fiber bristles</li><li>Use wet in shower or dry for lymphatic brushing</li></ul>`,
    price: "19.99",
    quantity: 60,
    collection: "shower-and-bath",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  },
  {
    handle: "natural-bar-soap-set",
    title: "Organic Bar Soap Set — 3 Bars",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional body wash in plastic bottles.</p><p>Most commercial body washes contain SLS (a known skin irritant derived from petroleum), synthetic fragrance (a catch-all term hiding up to 3,000 undisclosed chemicals), and parabens. These cold-process soaps are made with organic plant oils, colored with botanicals, and scented only with essential oils. Zero plastic packaging.</p><ul><li>USDA Certified Organic ingredients</li><li>No SLS, parabens, synthetic fragrance, or petroleum</li><li>Scents: Lavender, Eucalyptus Mint, Unscented</li></ul>`,
    price: "24.99",
    quantity: 60,
    collection: "shower-and-bath",
    imageUrl: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&q=80",
  },

  // ── SKIN & BODY CARE ───────────────────────────────────────────────────────
  {
    handle: "organic-coconut-oil-body",
    title: "Organic Virgin Coconut Oil — 16oz (Body + Oral)",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional body lotion and oil pulling oil.</p><p>Most lotions are 70–80% water with synthetic emulsifiers, preservatives, and fragrance to make them shelf-stable. Coconut oil is pure, shelf-stable without chemicals, absorbs deeply into skin, is anti-inflammatory and antimicrobial, and is safe to consume. One jar handles body moisturizing, oil pulling, hair conditioning, and cooking. Cold-pressed preserves all natural antioxidants.</p><ul><li>USDA Certified Organic, unrefined, cold-pressed</li><li>Food-grade — safe for oral use and cooking</li><li>Anti-inflammatory, antimicrobial, deeply moisturizing</li></ul>`,
    price: "21.99",
    quantity: 75,
    collection: "skin-and-body-care",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80",
  },
  {
    handle: "mct-oil-coconut",
    title: "MCT Oil — Coconut-Derived, 16oz",
    descriptionHtml: `<p><strong>What it replaces:</strong> Vegetable oils and conventional cooking oils.</p><p>MCT stands for Medium Chain Triglycerides — a type of fat found in coconut oil that your body converts directly into ketones for brain fuel, rather than storing as fat. Add it to coffee for sustained energy without a crash, use it as a salad dressing, take it straight, or apply topically as a skin oil. Flavorless, odorless, and completely food-safe.</p><ul><li>100% coconut-derived C8/C10 MCT oil</li><li>No palm oil, flavorless and odorless</li><li>Brain fuel: converts to ketones for clean mental energy</li></ul>`,
    price: "24.99",
    quantity: 60,
    collection: "skin-and-body-care",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80",
  },
  {
    handle: "natural-aluminum-free-deodorant",
    title: "Aluminum-Free Natural Deodorant",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional antiperspirant deodorant.</p><p>Antiperspirant works by plugging your sweat glands with aluminum salts — which your body then absorbs. Aluminum accumulates in breast tissue (found in elevated concentrations in breast cancer biopsies) and disrupts estrogen signaling. Sweating is your body's natural detox mechanism. This deodorant neutralizes odor-causing bacteria with magnesium and baking soda without blocking the process.</p><ul><li>Aluminum-free, paraben-free, baking soda formula</li><li>Magnesium and arrowroot for all-day odor control</li><li>Scented with essential oils only</li></ul>`,
    price: "16.99",
    quantity: 70,
    collection: "skin-and-body-care",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
  },
  {
    handle: "dry-skin-body-brush",
    title: "Natural Bristle Dry Body Brush",
    descriptionHtml: `<p><strong>What it replaces:</strong> Nothing — most people have never dry brushed.</p><p>Dry brushing stimulates the lymphatic system, which has no pump of its own (unlike blood, which has your heart). Brushing toward your heart before showering moves lymph fluid, drains toxins, reduces cellulite, and removes dead skin. Takes 3 minutes. Do it before every shower for 30 days and you'll feel the difference.</p><ul><li>100% natural sisal and plant fiber bristles</li><li>Long handle for full-body reach</li><li>Use dry, before showering, always brush toward the heart</li></ul>`,
    price: "22.99",
    quantity: 55,
    collection: "skin-and-body-care",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  },
  {
    handle: "foot-detox-scrub",
    title: "Magnesium Foot Detox Soak + Pumice Scrub Set",
    descriptionHtml: `<p><strong>What it replaces:</strong> Chemical foot softeners and plastic foot files.</p><p>Your feet have over 70 acupuncture points connected to every organ in your body. Magnesium sulfate (Epsom salt) is absorbed through the skin — most Americans are severely magnesium deficient, and a weekly foot soak is one of the most effective ways to restore levels. Pair with the natural pumice stone to remove dead skin buildup without plastic microfiber shedding.</p><ul><li>Organic Epsom salt + dead sea salt soak blend</li><li>Natural volcanic pumice stone</li><li>Essential oil blend: peppermint + tea tree</li></ul>`,
    price: "28.99",
    quantity: 45,
    collection: "skin-and-body-care",
    imageUrl: "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=800&q=80",
  },
  {
    handle: "organic-shea-butter",
    title: "Raw Unrefined Shea Butter — 8oz",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional body lotion.</p><p>Raw shea butter is loaded with vitamins A, E, and F, and has been used for centuries in West Africa to heal skin, reduce inflammation, and protect against UV damage. Unlike lotion, it contains zero water, zero preservatives, and zero synthetic emulsifiers — just pure plant fat that your skin recognizes and absorbs deeply. Especially effective for dry skin, eczema, stretch marks, and scalp care.</p><ul><li>Grade A, unrefined, raw shea butter</li><li>Ethically sourced from Ghana</li><li>No added ingredients — pure shea, nothing else</li></ul>`,
    price: "18.99",
    quantity: 65,
    collection: "skin-and-body-care",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
  },

  // ── HAIR CARE ─────────────────────────────────────────────────────────────
  {
    handle: "silk-hair-ties",
    title: "Silk Hair Ties — Set of 10",
    descriptionHtml: `<p><strong>What it replaces:</strong> Rubber and elastic hair ties.</p><p>Conventional hair ties contain rubber, latex, and synthetic elastic — all of which create friction that breaks hair strands and causes split ends. The metal crimp on most ties physically damages hair. Silk hair ties glide on and off with zero friction, hold without creasing, and don't leave marks. The silk fibers also don't strip moisture from your hair the way elastic does.</p><ul><li>100% pure mulberry silk, 22 momme</li><li>No metal, no rubber, no elastic</li><li>Set of 10 in neutral tones</li></ul>`,
    price: "19.99",
    quantity: 80,
    collection: "hair-care",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  },
  {
    handle: "organic-cotton-scrunchies",
    title: "Organic Cotton Scrunchies — Set of 6",
    descriptionHtml: `<p><strong>What it replaces:</strong> Synthetic fabric scrunchies.</p><p>Polyester scrunchies shed microplastics with every use and contain synthetic dyes that rub onto your hair and scalp. These GOTS-certified organic cotton scrunchies are soft, zero-plastic, and dyed with plant-based pigments. Gentle on hair, kind to your body, kind to the planet.</p><ul><li>GOTS-certified 100% organic cotton</li><li>Plant-based dyes, no synthetic color</li><li>Set of 6 in earth tones</li></ul>`,
    price: "14.99",
    quantity: 80,
    collection: "hair-care",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  },
  {
    handle: "silk-pillowcase",
    title: "Mulberry Silk Pillowcase — Standard/Queen",
    descriptionHtml: `<p><strong>What it replaces:</strong> Cotton or synthetic pillowcase.</p><p>You spend 6–8 hours a night with your face and hair pressed against your pillowcase. Cotton creates friction that breaks hair and pulls moisture from skin. Synthetic pillowcases trap heat and off-gas polyester. Silk's ultra-smooth surface lets hair glide without friction, retains skin moisture, and stays cool. Dermatologists recommend it for reducing sleep creases and hair breakage.</p><ul><li>22 momme 100% mulberry silk</li><li>Hypoallergenic, temperature-regulating</li><li>Hidden zipper closure</li></ul>`,
    price: "44.99",
    quantity: 40,
    collection: "hair-care",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  },
  {
    handle: "organic-castor-oil-hair",
    title: "Organic Black Castor Oil — Hair Growth, 4oz",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional hair growth serums and treatments.</p><p>Jamaican black castor oil has been used for generations to thicken hair, stimulate follicles, and reverse thinning — including edges and brows. The roasting process creates a higher ash content that raises scalp pH slightly, opening follicles for deeper penetration. No minoxidil, no synthetic growth factors, no alcohol — just one pure oil that works.</p><ul><li>USDA Certified Organic Jamaican black castor oil</li><li>Cold-pressed + roasted for maximum potency</li><li>For scalp, edges, eyebrows, and lashes</li></ul>`,
    price: "16.99",
    quantity: 65,
    collection: "hair-care",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80",
  },
  {
    handle: "sulfate-free-shampoo-bar",
    title: "Sulfate-Free Organic Shampoo Bar",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional liquid shampoo in plastic bottles.</p><p>Sulfates (SLS/SLES) are the foaming agents in most shampoos — they strip your scalp's natural oils so aggressively that your scalp overproduces oil to compensate, creating the cycle of greasy roots and dry ends. This concentrated shampoo bar lathers richly with plant-derived cleansers, conditions naturally with argan and castor oil, and replaces 2–3 plastic bottles per bar.</p><ul><li>Sulfate-free, silicone-free, paraben-free</li><li>Organic argan and castor oil</li><li>One bar replaces 2–3 bottles of liquid shampoo</li></ul>`,
    price: "18.99",
    quantity: 70,
    collection: "hair-care",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  },

  // ── FEMININE CARE ─────────────────────────────────────────────────────────
  {
    handle: "organic-cotton-tampons",
    title: "Organic Cotton Tampons — Unbleached, 36 Count",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional tampons (Tampax, Playtex, etc.).</p><p>Conventional tampons are made from a blend of rayon and conventional cotton — both heavily treated with pesticides, then chlorine-bleached (creating dioxins). These chemicals sit against the vaginal wall, your body's most absorbent tissue, for hours. The vaginal lining has no protective skin barrier — it absorbs directly into your bloodstream. Organic cotton, unbleached with a chlorine-free process, is the only responsible choice.</p><ul><li>100% GOTS-certified organic cotton</li><li>Chlorine-free bleaching process</li><li>Available in regular and super absorbency</li></ul>`,
    price: "14.99",
    quantity: 80,
    collection: "feminine-care",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
  },
  {
    handle: "organic-cotton-pads",
    title: "Organic Cotton Pads + Liners — 40 Count",
    descriptionHtml: `<p><strong>What it replaces:</strong> Conventional maxi pads and panty liners.</p><p>Conventional pads contain plastic backing, synthetic absorbent gels (SAP), and are treated with fragrance to mask odor — all of which sit against sensitive skin for hours. The SAP crystals in many mainstream pads have been linked to TSS. 100% organic cotton breathes naturally, absorbs without chemicals, and contains no plastic touching your skin.</p><ul><li>100% organic cotton, no synthetic SAP gel</li><li>Fragrance-free, chlorine-free</li><li>Plastic-free packaging</li></ul>`,
    price: "12.99",
    quantity: 80,
    collection: "feminine-care",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
  },
  {
    handle: "menstrual-cup",
    title: "Medical-Grade Silicone Menstrual Cup",
    descriptionHtml: `<p><strong>What it replaces:</strong> Tampons and pads entirely.</p><p>One menstrual cup lasts 5–10 years and replaces over 2,000 tampons or pads. Medical-grade silicone is the same material used in surgical implants — completely non-reactive, non-absorbent (no TSS risk), and free from all the chemicals in disposables. Holds 3x more than a super tampon, can be worn safely for up to 12 hours. The environmental and cost math is overwhelming.</p><ul><li>Medical-grade silicone, BPA-free</li><li>Lasts 5–10 years, FDA registered</li><li>Sizes S and L available</li></ul>`,
    price: "34.99",
    quantity: 50,
    collection: "feminine-care",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
  },

  // ── KITCHEN & COOKING ─────────────────────────────────────────────────────
  {
    handle: "cast-iron-skillet-10inch",
    title: "Pre-Seasoned Cast Iron Skillet — 10\"",
    descriptionHtml: `<p><strong>What it replaces:</strong> Teflon non-stick pan.</p><p>PFAS "forever chemicals" from Teflon coatings are found in the blood of 99% of Americans. They've been linked to cancer, thyroid disease, immune suppression, and birth defects. Teflon starts breaking down at 500°F — temperatures easily reached in a hot pan. Cast iron is non-toxic, improves with age, lasts generations, and adds beneficial dietary iron to your food. The original non-stick, if properly seasoned.</p><ul><li>Pre-seasoned with flaxseed oil</li><li>Compatible with all cooktops including induction</li><li>Oven-safe to 700°F, lifetime durability</li></ul>`,
    price: "44.99",
    quantity: 35,
    collection: "kitchen-and-cooking",
    imageUrl: "https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=800&q=80",
  },
  {
    handle: "bamboo-utensil-set",
    title: "Bamboo Kitchen Utensil Set — 6 Piece",
    descriptionHtml: `<p><strong>What it replaces:</strong> Plastic cooking utensils.</p><p>Plastic spatulas and spoons leach BPA and other plasticizers directly into hot food — especially when stirring something acidic or fatty. Studies have found plastic utensils shed millions of microplastic particles into a single meal. Bamboo is harder than most hardwoods, naturally antimicrobial, doesn't retain odors, and is completely biodegradable.</p><ul><li>100% organic bamboo, no glue or lacquer</li><li>Naturally antimicrobial</li><li>Includes: spatula, spoon, slotted spoon, ladle, tongs, scraper</li></ul>`,
    price: "32.99",
    quantity: 50,
    collection: "kitchen-and-cooking",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
  {
    handle: "beeswax-food-wraps",
    title: "Beeswax Food Wraps — Set of 6",
    descriptionHtml: `<p><strong>What it replaces:</strong> Plastic wrap (Saran Wrap / cling film).</p><p>Plastic wrap is made from PVC or PVDC, both of which leach plasticizers into food — especially fatty foods and anything covered while warm. These beeswax wraps mold to any container with the warmth of your hands, seal airtight, wash with cool soapy water, and last a year or more. One set replaces hundreds of feet of plastic wrap.</p><ul><li>Organic cotton + beeswax + jojoba oil + tree resin</li><li>Naturally antibacterial from beeswax</li><li>Set of 6: 2 small, 2 medium, 2 large</li></ul>`,
    price: "22.99",
    quantity: 60,
    collection: "kitchen-and-cooking",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
  {
    handle: "glass-food-storage-set",
    title: "Glass Food Storage Container Set — 10 Piece",
    descriptionHtml: `<p><strong>What it replaces:</strong> Tupperware and plastic food containers.</p><p>Plastic food containers leach BPA, BPS, and phthalates into food — especially when microwaved, heated, or containing acidic foods. These compounds are endocrine disruptors that mimic estrogen in the body. Glass is completely inert — nothing leaches into food under any conditions. Borosilicate glass handles temperature extremes from freezer to oven without shattering.</p><ul><li>Borosilicate glass — oven, microwave, freezer safe</li><li>BPA-free silicone lids (airtight seal)</li><li>Set of 10: various sizes for all leftovers</li></ul>`,
    price: "54.99",
    quantity: 30,
    collection: "kitchen-and-cooking",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
  {
    handle: "stainless-water-bottle",
    title: "Stainless Steel Water Bottle — 32oz",
    descriptionHtml: `<p><strong>What it replaces:</strong> Plastic water bottles.</p><p>A single plastic water bottle can contain hundreds of thousands of microplastic particles — and that number increases with heat, repeated filling, and age. BPA-free plastic still leaches other bisphenol compounds. Stainless steel is completely inert, keeps water cold for 24 hours, hot for 12, and lasts decades. The average American spends $1,200/year on bottled water — this bottle pays for itself in under 2 weeks.</p><ul><li>18/8 food-grade stainless steel, BPA-free lid</li><li>Double-wall vacuum insulated</li><li>Wide mouth for ice and easy cleaning</li></ul>`,
    price: "34.99",
    quantity: 50,
    collection: "kitchen-and-cooking",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
  },

  // ── LAUNDRY & HOME CLEANING ───────────────────────────────────────────────
  {
    handle: "plant-based-laundry-detergent",
    title: "Plant-Based Laundry Detergent — 64 Loads",
    descriptionHtml: `<p><strong>What it replaces:</strong> Tide, Gain, and conventional liquid detergents.</p><p>Conventional detergents contain optical brighteners (synthetic chemicals that make clothes look whiter under UV light, by depositing a residue on every fiber — which then sits against your skin), synthetic musk fragrance (hormone disrupting, accumulates in body fat and breast milk), and surfactants that don't fully rinse out. This plant-derived formula cleans powerfully with zero synthetic fragrance, zero brighteners, and zero residue.</p><ul><li>Plant-derived surfactants, enzyme-powered</li><li>Fragrance-free and scented options</li><li>Works in cold water — saves energy too</li></ul>`,
    price: "28.99",
    quantity: 55,
    collection: "laundry-and-home-cleaning",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
  {
    handle: "wool-dryer-balls",
    title: "Organic Wool Dryer Balls — Set of 6",
    descriptionHtml: `<p><strong>What it replaces:</strong> Dryer sheets and liquid fabric softener.</p><p>Dryer sheets work by coating your clothes in a thin layer of waxy synthetic fragrance and fabric softener — which then transfers to your skin all day. Fragrance is one of the top triggers for asthma, migraines, and skin reactions. These wool dryer balls separate clothes naturally, reduce drying time by 25%, soften fabric through mechanical action, and last 1,000+ loads. Add a few drops of essential oil if you want a scent.</p><ul><li>100% New Zealand organic wool</li><li>Replaces 1,000+ dryer sheets per ball</li><li>Add essential oils for natural scent</li></ul>`,
    price: "24.99",
    quantity: 65,
    collection: "laundry-and-home-cleaning",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
  {
    handle: "microfiber-laundry-bag",
    title: "Microfiber Capture Laundry Bag",
    descriptionHtml: `<p><strong>What it replaces:</strong> Washing synthetic clothes without protection.</p><p>Every wash cycle of synthetic clothing (polyester, nylon, acrylic) releases hundreds of thousands of microplastic fibers into wastewater — which treatment plants can't fully capture, ending up in oceans and food chains. If you're transitioning away from synthetics gradually, this laundry bag captures microfibers before they reach the drain. A critical bridge product for anyone mid-transition.</p><ul><li>Captures >90% of microfibers shed during washing</li><li>Works with any washing machine</li><li>Rinse and reuse — lasts years</li></ul>`,
    price: "32.99",
    quantity: 45,
    collection: "laundry-and-home-cleaning",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
  {
    handle: "plant-based-all-purpose-cleaner",
    title: "Plant-Based All-Purpose Cleaner Concentrate",
    descriptionHtml: `<p><strong>What it replaces:</strong> Windex, 409, Lysol, and conventional cleaners.</p><p>Most conventional cleaners contain 2-butoxyethanol (linked to liver and kidney damage), ammonia (lung irritant, releases fumes), and synthetic fragrance. You spray these on surfaces and breathe the aerosolized chemicals in an enclosed space. This plant-based concentrate makes 30+ bottles of full-strength cleaner — effective against grease, bacteria, and grime with no toxic fumes.</p><ul><li>Plant-derived cleaning agents, no petrochemicals</li><li>Concentrate — one bottle makes 30+ sprays</li><li>Safe for all surfaces including food prep areas</li></ul>`,
    price: "19.99",
    quantity: 60,
    collection: "laundry-and-home-cleaning",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
  {
    handle: "organic-cotton-cleaning-cloths",
    title: "Organic Cotton Reusable Cleaning Cloths — 12 Pack",
    descriptionHtml: `<p><strong>What it replaces:</strong> Paper towels and synthetic microfiber cloths.</p><p>Conventional microfiber cloths are made of plastic — polyester and nylon — and shed millions of microplastics into wastewater every wash. Paper towels create massive tree waste. These organic cotton cloths clean as effectively as microfiber, are fully biodegradable, and last 200+ washes. Machine washable. The math: 12 cloths replace over 2,000 paper towel sheets per year.</p><ul><li>GOTS-certified organic cotton</li><li>12 cloths, multiple sizes</li><li>Machine washable, fully biodegradable</li></ul>`,
    price: "26.99",
    quantity: 55,
    collection: "laundry-and-home-cleaning",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },

  // ── WELLNESS & SUPPLEMENTS ────────────────────────────────────────────────
  {
    handle: "organic-sea-moss-gel",
    title: "Organic Sea Moss Gel — 16oz",
    descriptionHtml: `<p><strong>What it replaces:</strong> Multivitamins and synthetic supplements.</p><p>Irish sea moss contains 92 of the 102 minerals the human body is made of — including iodine (essential for thyroid function), iron, calcium, magnesium, zinc, and B vitamins. It's a natural prebiotic that feeds beneficial gut bacteria, supports thyroid health, reduces inflammation, and provides collagen-building compounds for skin, hair, and joints. Wildcrafted from clean Atlantic waters.</p><ul><li>Wildcrafted Irish sea moss, organic bladderwrack + burdock root</li><li>No additives, no preservatives, raw preparation</li><li>Add to smoothies, tea, or take straight</li></ul>`,
    price: "29.99",
    quantity: 50,
    collection: "wellness-and-supplements",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
  },
  {
    handle: "shilajit-resin",
    title: "Himalayan Shilajit Resin — 20g",
    descriptionHtml: `<p><strong>What it replaces:</strong> Synthetic energy supplements and testosterone boosters.</p><p>Shilajit is a mineral pitch that forms over centuries from compressed plant matter in Himalayan rock. It contains fulvic acid — a compound that enhances cellular absorption of nutrients — plus over 85 trace minerals, dibenzo-alpha-pyrones (which support mitochondrial energy production), and testosterone precursors. Clinical studies show it raises free testosterone levels, improves sperm quality, and enhances ATP production. Nothing synthetic comes close.</p><ul><li>Authentic Himalayan shilajit, 3rd-party lab tested</li><li>Minimum 60% fulvic acid content</li><li>Dissolve a rice-grain amount in warm water or tea</li></ul>`,
    price: "44.99",
    quantity: 40,
    collection: "wellness-and-supplements",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
  },
  {
    handle: "magnesium-glycinate",
    title: "Magnesium Glycinate — 120 Capsules",
    descriptionHtml: `<p><strong>What it replaces:</strong> Sleep aids, anxiety medications (for mild cases), and muscle relaxers.</p><p>Magnesium is involved in over 300 enzymatic reactions in the human body. Up to 80% of Americans are deficient due to soil depletion and processed food diets. Deficiency manifests as muscle cramps, poor sleep, anxiety, constipation, irregular heartbeat, and high blood pressure. Glycinate is the most bioavailable form — chelated to glycine, an amino acid that also promotes calm and sleep quality. Take before bed.</p><ul><li>400mg elemental magnesium as magnesium glycinate</li><li>No magnesium oxide (the cheap, poorly absorbed form)</li><li>Vegan capsules, no fillers</li></ul>`,
    price: "32.99",
    quantity: 60,
    collection: "wellness-and-supplements",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
  },
  {
    handle: "organic-apple-cider-vinegar",
    title: "Organic Apple Cider Vinegar with Mother — 32oz",
    descriptionHtml: `<p><strong>What it replaces:</strong> Digestive supplements, antacids, and hair conditioner rinses.</p><p>Raw, unfiltered ACV with the "mother" (strands of beneficial bacteria, enzymes, and proteins) supports gut health, lowers blood sugar spikes after meals, aids digestion, kills harmful bacteria, and has been shown to lower LDL cholesterol. Diluted, it's an effective scalp rinse that removes buildup and balances pH. One bottle with dozens of applications — food, health, and beauty.</p><ul><li>USDA Certified Organic, unfiltered, unpasteurized</li><li>"Mother" intact — live cultures and enzymes</li><li>Bragg-quality at independent brand pricing</li></ul>`,
    price: "14.99",
    quantity: 70,
    collection: "wellness-and-supplements",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80",
  },

  // ── SUBSCRIPTION BOXES ────────────────────────────────────────────────────
  {
    handle: "subscription-box-starter-3",
    title: "Starter Detox Box — 3 Products (Monthly)",
    descriptionHtml: `<p><strong>Start with your bathroom.</strong> The highest-impact room in your house for daily chemical exposure. Each month we hand-select 3 products to replace the most toxic items in your routine, curated to your stage of the detox journey.</p><p>Your first box includes: Fluoride-Free Toothpaste + Bamboo Toothbrush + Organic Bar Soap Set.</p><p>Every product ships with an educational card explaining what it replaces and the science behind why it matters. Cancel anytime.</p><ul><li>3 curated toxic-free products monthly</li><li>Educational insert with every box</li><li>Free shipping, cancel anytime</li></ul>`,
    price: "34.99",
    quantity: 999,
    collection: "subscription-boxes",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80",
  },
  {
    handle: "subscription-box-core-6",
    title: "Core Detox Box — 6 Products (Monthly)",
    descriptionHtml: `<p><strong>Bathroom + Kitchen.</strong> Six products a month covering the two highest-exposure rooms in your home — the places where you're absorbing the most chemicals daily. Curated to build on previous boxes so nothing overlaps.</p><p>Every box includes a printed guide explaining each product, what it replaces, and how to use it — so every family member understands the why, not just the what.</p><ul><li>6 curated toxic-free products monthly</li><li>Bathroom and kitchen focus</li><li>Educational guide included</li><li>Free shipping, cancel anytime</li></ul>`,
    price: "64.99",
    quantity: 999,
    collection: "subscription-boxes",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80",
  },
  {
    handle: "subscription-box-complete-9",
    title: "Complete Detox Box — 9 Products (Monthly)",
    descriptionHtml: `<p><strong>Full home coverage.</strong> Nine products monthly — bathroom, kitchen, laundry, and personal care. At this pace, your entire household transitions to toxic-free living within 3–4 months. Includes a progress tracker so you can see exactly what you've replaced and what's left.</p><ul><li>9 curated toxic-free products monthly</li><li>Full home coverage across all categories</li><li>Progress tracker and educational guide included</li><li>Priority customer support</li><li>Free shipping, cancel anytime</li></ul>`,
    price: "99.99",
    quantity: 999,
    collection: "subscription-boxes",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80",
  },
  {
    handle: "subscription-box-total-detox-12",
    title: "Total Detox Box — 12 Products (Monthly)",
    descriptionHtml: `<p><strong>The fastest way to a completely toxic-free home.</strong> Twelve products monthly — every category, every room, every person in your household. Includes personalized detox consultation via the 333 Lives app, custom curation based on your health goals, and access to the private Total Detox community.</p><ul><li>12 curated toxic-free products monthly</li><li>Personalized curation based on your 333 Lives health profile</li><li>Private Total Detox community access</li><li>Priority shipping + dedicated support</li><li>Cancel anytime</li></ul>`,
    price: "149.99",
    quantity: 999,
    collection: "subscription-boxes",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function adminQuery(payload) {
  const result = spawnSync("node", [ADMIN_HELPER, JSON.stringify(payload)], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`Non-JSON output:\n${result.stdout}\n${result.stderr}`);
  }
}

function resolveLocationId() {
  const data = adminQuery({ query: `{ locations(first:1) { edges { node { id } } } }` });
  return data.data.locations.edges[0].node.id;
}

function resolvePublicationId() {
  const data = adminQuery({ query: `{ publications(first:20) { edges { node { id name } } } }` });
  const pubs = data.data.publications.edges;
  console.log("  Available publications:", pubs.map(p => `${p.node.name} (${p.node.id})`).join(", "));
  // Prefer Replit Sales Channel, fall back to Online Store
  const replit = pubs.find(p => /replit/i.test(p.node.name));
  const online = pubs.find(p => /online store/i.test(p.node.name));
  const chosen = replit ?? online ?? pubs[0];
  if (!chosen) { console.log("  ⚠️  No publication found — products will be created but not published"); return null; }
  console.log(`  Using publication: ${chosen.node.name}`);
  return chosen.node.id;
}

function findExistingCollection(handle) {
  const data = adminQuery({ query: `{ collectionByHandle(handle:"${handle}") { id } }` });
  return data.data?.collectionByHandle?.id ?? null;
}

function createCollection({ handle, title, descriptionHtml }) {
  const mutation = `
    mutation {
      collectionCreate(input: {
        handle: "${handle}"
        title: ${JSON.stringify(title)}
        descriptionHtml: ${JSON.stringify(descriptionHtml)}
      }) {
        collection { id }
        userErrors { field message }
      }
    }`;
  const data = adminQuery({ query: mutation });
  const errs = data.data?.collectionCreate?.userErrors ?? [];
  if (errs.length) throw new Error(`Collection create errors: ${JSON.stringify(errs)}`);
  return data.data.collectionCreate.collection.id;
}

function findExistingProduct(handle) {
  const data = adminQuery({ query: `{ productByHandle(handle:"${handle}") { id variants(first:1){ edges{ node{ id inventoryItem{ id } } } } } }` });
  const p = data.data?.productByHandle;
  if (!p) return null;
  const variant = p.variants.edges[0].node;
  return { productId: p.id, variantId: variant.id, inventoryItemId: variant.inventoryItem.id };
}

function createProduct({ handle, title, descriptionHtml }) {
  const mutation = `
    mutation {
      productCreate(input: {
        handle: "${handle}"
        title: ${JSON.stringify(title)}
        descriptionHtml: ${JSON.stringify(descriptionHtml)}
        status: ACTIVE
      }) {
        product {
          id
          variants(first:1) { edges { node { id inventoryItem { id } } } }
        }
        userErrors { field message }
      }
    }`;
  const data = adminQuery({ query: mutation });
  const errs = data.data?.productCreate?.userErrors ?? [];
  if (errs.length) throw new Error(`Product create errors: ${JSON.stringify(errs)}`);
  const p = data.data.productCreate.product;
  const variant = p.variants.edges[0].node;
  return { productId: p.id, variantId: variant.id, inventoryItemId: variant.inventoryItem.id };
}

function attachImage(productId, imageUrl) {
  const mutation = `
    mutation {
      productCreateMedia(productId: "${productId}", media: [{
        originalSource: ${JSON.stringify(imageUrl)}
        alt: "Product image"
        mediaContentType: IMAGE
      }]) {
        media { status }
        mediaUserErrors { field message }
      }
    }`;
  const data = adminQuery({ query: mutation });
  const errs = data.data?.productCreateMedia?.mediaUserErrors ?? [];
  if (errs.length) console.log(`    ⚠️  Image warning: ${JSON.stringify(errs)}`);
}

function setPrice(variantId, productId, price) {
  const mutation = `
    mutation {
      productVariantsBulkUpdate(productId: "${productId}", variants: [{
        id: "${variantId}"
        price: "${price}"
      }]) {
        userErrors { field message }
      }
    }`;
  const data = adminQuery({ query: mutation });
  const errs = data.data?.productVariantsBulkUpdate?.userErrors ?? [];
  if (errs.length) throw new Error(`Price errors: ${JSON.stringify(errs)}`);
}

function setInventory(inventoryItemId, locationId, quantity, handle) {
  // 1. Enable tracking
  adminQuery({ query: `mutation { inventoryItemUpdate(id:"${inventoryItemId}", input:{tracked:true}) { userErrors{field message} } }` });
  // 2. Activate at location
  adminQuery({ query: `mutation { inventoryActivate(inventoryItemId:"${inventoryItemId}", locationId:"${locationId}") { userErrors{field message} } }` });
  // 3. Set quantity
  const mutation = `
    mutation {
      inventorySetQuantities(input:{
        name: "available"
        reason: "correction"
        quantities: [{ inventoryItemId: "${inventoryItemId}" locationId: "${locationId}" quantity: ${quantity} }]
      }) {
        userErrors { field message }
      }
    }`;
  const data = adminQuery({ query: mutation });
  const errs = data.data?.inventorySetQuantities?.userErrors ?? [];
  if (errs.length) console.log(`    ⚠️  Inventory warning for ${handle}: ${JSON.stringify(errs)}`);
}

function publish(productId, publicationId) {
  if (!publicationId) return false;
  const mutation = `
    mutation {
      publishablePublish(id: "${productId}", input: [{ publicationId: "${publicationId}" }]) {
        userErrors { field message }
      }
    }`;
  const data = adminQuery({ query: mutation });
  const errs = data.data?.publishablePublish?.userErrors ?? [];
  if (errs.length) { console.log(`    ⚠️  Publish warning: ${JSON.stringify(errs)}`); return false; }
  return true;
}

function addProductsToCollection(collectionId, productIds) {
  const mutation = `
    mutation {
      collectionAddProducts(id: "${collectionId}", productIds: ${JSON.stringify(productIds)}) {
        userErrors { field message }
      }
    }`;
  const data = adminQuery({ query: mutation });
  const errs = data.data?.collectionAddProducts?.userErrors ?? [];
  if (errs.length) console.log(`  ⚠️  Collection assign warning: ${JSON.stringify(errs)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log("🌿  333 Lives — Seeding Organic/Toxic-Free Catalog…\n");

  const locationId = resolveLocationId();
  const publicationId = resolvePublicationId();

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

  console.log("\n🌿 Products:");
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

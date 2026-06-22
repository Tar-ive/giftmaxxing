// Semantic enrichment for scraped Reddit gift records.
//
// Rule-based NLP (no external APIs) that reads each post's title + body and
// extracts the facets a recommender needs:
//   • recipient  — who the gift is for (mom, partner, friend, kids, ...)
//   • occasion   — birthday, christmas, wedding, ...
//   • category   — tech, kitchen, home, beauty, ... (+ vibes for taste matching)
//   • status     — what KIND of post it is, which differentiates the gifts:
//                    "made"    = the poster handmade/created the gift
//                    "find"    = a product they found / recommend
//                    "request" = they're asking for gift ideas
//   • merchant   — amazon / etsy / ... parsed from the off-reddit link
//   • priceTier  — budget / mid / premium
//
// Exports enrichRecord() (used by transform.mjs at ingest time) and
// buildClusters(). Run directly to write enriched JSON + clusters + stats.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Match any keyword as a whole word/phrase, case-insensitive.
const rx = (words) => new RegExp(`(?:^|[^a-z])(?:${words.map(esc).join("|")})(?:[^a-z]|$)`, "i");

// Lexicons are ordered: the FIRST matching tag wins, so put specific relations
// (girlfriend) before generic ones (her).
const RECIPIENTS = [
  ["girlfriend", ["girlfriend", "gf"]],
  ["boyfriend", ["boyfriend", "bf"]],
  ["wife", ["wife"]],
  ["husband", ["husband", "hubby"]],
  ["mom", ["mom", "mum", "mother", "mommy", "mama"]],
  ["dad", ["dad", "father", "daddy", "papa"]],
  ["grandma", ["grandma", "grandmother", "nana", "granny", "grandmom"]],
  ["grandpa", ["grandpa", "grandfather", "grandad", "granddad"]],
  ["sister", ["sister", "sis"]],
  ["brother", ["brother", "bro"]],
  ["daughter", ["daughter"]],
  ["son", ["son"]],
  ["parents", ["parents"]],
  ["kids", ["kid", "kids", "child", "children", "toddler", "baby", "newborn", "nephew", "niece"]],
  ["teen", ["teen", "teenager", "teenage"]],
  ["partner", ["partner", "spouse", "fiance", "fiancee", "fiancé", "fiancée"]],
  ["couple", ["couple", "newlyweds"]],
  ["friend", ["friend", "bestie", "best friend", "bff", "roommate"]],
  ["coworker", ["coworker", "co-worker", "colleague", "boss", "employee", "client"]],
  ["teacher", ["teacher", "professor", "mentor"]],
  ["self", ["myself", "for me", "treat myself"]],
  ["men", ["for him", "for men", "for a guy", "for guys", "men's"]],
  ["women", ["for her", "for women", "for a girl", "women's"]],
];

const OCCASIONS = [
  ["birthday", ["birthday", "bday", "b-day", "turning 18", "turning 21", "turning 30", "turning 40", "turning 50"]],
  ["christmas", ["christmas", "xmas", "secret santa", "stocking stuffer", "stocking", "holiday gift", "holidays", "advent"]],
  ["valentines", ["valentine", "valentines", "valentine's"]],
  ["anniversary", ["anniversary"]],
  ["wedding", ["wedding", "bride", "groom", "bridal", "engagement", "engaged", "bachelorette", "bachelor party"]],
  ["graduation", ["graduation", "graduating", "graduate", "grad gift"]],
  ["mothers_day", ["mother's day", "mothers day", "mother day"]],
  ["fathers_day", ["father's day", "fathers day", "father day"]],
  ["housewarming", ["housewarming", "new apartment", "new home", "new house", "moving out", "first apartment"]],
  ["baby_shower", ["baby shower", "expecting", "pregnant", "pregnancy", "gender reveal"]],
  ["retirement", ["retirement", "retiring", "retire"]],
];

// category -> { kw, vibes } ; vibes use the taxonomy in web/lib/recommend.ts
const CATEGORIES = [
  ["photography", { kw: ["camera", "polaroid", "instant film", "instax", "film camera"], vibes: ["film", "retro", "tech"] }],
  ["tech", { kw: ["gadget", "tech", "electronic", "charger", "headphone", "earbud", "earbuds", "speaker", "gaming", "console", "keyboard", "mouse", "smartphone", "laptop", "smart", "drone", "usb", "bluetooth", "monitor", "robot"], vibes: ["tech", "minimal"] }],
  ["music", { kw: ["vinyl", "record player", "turntable", "guitar", "piano", "ukulele", "instrument", "synth", "headphones"], vibes: ["music", "retro", "cozy"] }],
  ["kitchen", { kw: ["kitchen", "cook", "cooking", "chef", "mug", "coffee", "espresso", "tea", "matcha", "knife", "baking", "cutting board", "tumbler", "cast iron", "cookware", "blender", "grill"], vibes: ["kitchen", "cozy", "wellness"] }],
  ["drinkware", { kw: ["whiskey", "whisky", "wine", "cocktail", "beer", "bar set", "flask", "decanter", "bourbon", "barware"], vibes: ["luxe", "retro", "warm"] }],
  ["home", { kw: ["candle", "decor", "lamp", "light", "blanket", "pillow", "plant", "vase", "throw", "rug", "frame", "poster", "cozy", "tapestry", "led"], vibes: ["home", "cozy", "warm", "calm"] }],
  ["beauty", { kw: ["perfume", "cologne", "skincare", "makeup", "fragrance", "lotion", "bath", "spa", "self-care", "self care"], vibes: ["beauty", "luxe", "romantic"] }],
  ["jewelry", { kw: ["necklace", "bracelet", "ring", "earring", "earrings", "jewelry", "jewellery", "watch", "pendant", "locket"], vibes: ["luxe", "romantic", "beauty"] }],
  ["books", { kw: ["book", "novel", "journal", "notebook", "stationery", "planner", "pen", "fountain pen", "diary", "cookbook"], vibes: ["stationery", "minimal", "calm"] }],
  ["games", { kw: ["board game", "boardgame", "puzzle", "lego", "video game", "card game", "plush", "figure", "collectible", "dice", "tabletop"], vibes: ["retro", "tech"] }],
  ["art_handmade", { kw: ["handmade", "3d print", "3d-print", "3d printed", "crochet", "crocheted", "knit", "knitted", "resin", "woodworking", "wood", "leather", "engraved", "custom", "personalized", "personalised", "embroidery", "ceramic", "pottery"], vibes: ["retro", "warm", "minimal"] }],
  ["fashion", { kw: ["shirt", "hoodie", "socks", "scarf", "hat", "beanie", "wallet", "bag", "backpack", "apparel", "clothing", "sweater", "jacket", "gloves", "slippers"], vibes: ["minimal", "luxe"] }],
  ["outdoors", { kw: ["camping", "hiking", "outdoor", "travel", "tent", "hammock", "fishing", "cycling", "knife", "multitool", "flashlight"], vibes: ["minimal", "tech"] }],
  ["fitness", { kw: ["gym", "fitness", "workout", "yoga", "running", "weights", "dumbbell", "exercise"], vibes: ["wellness", "minimal"] }],
  ["pets", { kw: ["dog", "cat", "pet", "puppy", "kitten"], vibes: ["cozy", "warm"] }],
];

// Post-type signals (differentiate the gifts).
const MADE = rx(["i made", "i built", "i created", "i designed", "made this", "made these", "made my", "i 3d printed", "3d printed", "i printed", "crocheted", "i knit", "knitted", "i carved", "i painted", "handmade by me", "finished this", "my latest", "i sculpted", "i sewed", "i forged"]);
const REQUEST = rx(["looking for", "suggestions", "any ideas", "gift ideas for", "ideas for", "recommend", "recommendations", "help me find", "what should i get", "what to get", "where can i", "need a gift", "need help", "budget", "advice", "wishlist", "what do i get", "thoughts on"]);
const SHOWCASE_SUBS = new Set(["somethingimade", "functionalprint"]);
const FIND_SUBS = new Set(["didntknowiwantedthat", "ineeeedit", "shutupandtakemymoney", "coolgadgets", "gadgets", "buyitforlife"]);

const MERCHANTS = [
  ["amazon", /amazon\.|amzn\./i],
  ["etsy", /etsy\./i],
  ["aliexpress", /aliexpress\./i],
  ["ebay", /ebay\./i],
  ["kickstarter", /kickstarter\./i],
  ["target", /target\.com/i],
  ["walmart", /walmart\./i],
  ["shopify", /myshopify\./i],
];

function firstTag(text, lexicon) {
  for (const [tag, words] of lexicon) {
    if (rx(words).test(text)) return tag;
  }
  return null;
}

function categoryFor(text) {
  for (const [tag, { kw, vibes }] of CATEGORIES) {
    if (rx(kw).test(text)) return { category: tag, vibes };
  }
  return { category: "misc", vibes: ["minimal"] };
}

function statusFor(text, subreddit) {
  const sub = String(subreddit || "").toLowerCase();
  if (SHOWCASE_SUBS.has(sub) || MADE.test(text)) return "made";
  if (REQUEST.test(text)) return "request";
  if (FIND_SUBS.has(sub)) return "find";
  // gift* subs that aren't explicit requests still skew toward idea-sharing
  return /gift/i.test(sub) ? "request" : "find";
}

function merchantFor(url) {
  if (!url) return null;
  for (const [name, re] of MERCHANTS) if (re.test(url)) return name;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function priceTier(price) {
  const p = Number(price) || 0;
  if (p <= 0) return "unknown";
  if (p < 25) return "budget";
  if (p <= 75) return "mid";
  return "premium";
}

// URLs embedded in the post body (often the actual product link).
function linksInText(selftext) {
  if (!selftext) return [];
  const m = selftext.match(/https?:\/\/[^\s)\]]+/g) || [];
  return m.filter((u) => !/redd\.it|reddit\.com/i.test(u)).slice(0, 3);
}

export function enrichRecord(r) {
  const text = `${r.name || ""}\n${r.selftext || ""}`.toLowerCase();
  const { category, vibes } = categoryFor(text);
  const bodyLinks = linksInText(r.selftext);
  const productUrl = r.link || bodyLinks[0] || null;
  const merchant = merchantFor(productUrl);
  return {
    recipient: firstTag(text, RECIPIENTS) || "anyone",
    occasion: firstTag(text, OCCASIONS) || "any",
    category,
    vibes,
    status: statusFor(text, r.subreddit),
    priceTier: priceTier(r.price),
    productUrl,
    merchant,
  };
}

// Group enriched records into clusters by facet for inspection / dashboards.
export function buildClusters(records) {
  const facets = { category: {}, recipient: {}, occasion: {}, status: {} };
  for (const r of records) {
    const e = r.__enriched ?? enrichRecord(r);
    for (const key of Object.keys(facets)) {
      const v = e[key];
      const bucket = (facets[key][v] ||= { count: 0, sumPrice: 0, priced: 0, examples: [] });
      bucket.count++;
      if (r.price > 0) { bucket.sumPrice += r.price; bucket.priced++; }
      if (bucket.examples.length < 5) {
        bucket.examples.push({ id: r.id, name: r.name, score: r.score, url: r.url });
      }
    }
  }
  // finalize: avg price + sort buckets by count
  const out = {};
  for (const [facet, buckets] of Object.entries(facets)) {
    out[facet] = Object.entries(buckets)
      .map(([k, v]) => ({ key: k, count: v.count, avgPrice: v.priced ? Math.round(v.sumPrice / v.priced) : null, examples: v.examples }))
      .sort((a, b) => b.count - a.count);
  }
  return out;
}

function printDist(title, buckets) {
  console.log(`\n${title}`);
  for (const b of buckets) {
    const price = b.avgPrice ? ` ~$${b.avgPrice}` : "";
    console.log(`  ${String(b.count).padStart(5)}  ${b.key}${price}`);
  }
}

async function main() {
  const inFile = join(__dirname, "..", "..", "web", "lib", "reddit-gifts.json");
  const records = JSON.parse(await readFile(inFile, "utf8"));
  const enriched = records.map((r) => ({ ...r, __enriched: enrichRecord(r) }));

  const clusters = buildClusters(enriched);
  const outEnriched = join(__dirname, "reddit-gifts.enriched.json");
  const outClusters = join(__dirname, "clusters.json");
  await writeFile(outEnriched, JSON.stringify(enriched, null, 2) + "\n");
  await writeFile(outClusters, JSON.stringify(clusters, null, 2) + "\n");

  const withLink = enriched.filter((r) => r.__enriched.productUrl).length;
  console.log(`Enriched ${enriched.length} records.`);
  console.log(`Off-reddit product links found: ${withLink} (${Math.round((withLink / enriched.length) * 100)}%)`);
  printDist("By status (gift type):", clusters.status);
  printDist("By recipient:", clusters.recipient.slice(0, 12));
  printDist("By occasion:", clusters.occasion);
  printDist("By category:", clusters.category);
  console.log(`\nWrote ${outEnriched}\nWrote ${outClusters}`);
}

// Run as CLI only (not when imported by transform.mjs).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

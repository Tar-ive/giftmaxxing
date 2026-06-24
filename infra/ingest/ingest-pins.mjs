// Pinterest pins manifest -> DynamoDB `posts` table via the /seed API endpoint.
//
// Reads the manifest written by pinterest-scrape.mjs (or the older
// pinterest-rss.mjs), transforms each pin into the
// DynamoDB post item shape (same schema as Reddit posts from transform.mjs), and
// POSTs them to the /seed endpoint so they appear in the /feed alongside Reddit
// posts.
//
// Usage:
//   node ingest-pins.mjs --dry-run                   # print items, no API call
//   node ingest-pins.mjs                              # load via $API_BASE/seed
//   node ingest-pins.mjs --api https://xyz.execute-api.us-east-1.amazonaws.com
//   node ingest-pins.mjs --manifest ./pins.manifest.json --limit 10
//
// Config (env): API_BASE or NEXT_PUBLIC_API_URL. No AWS credentials needed.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GRADS = ["peach", "rose", "butter", "lilac", "sky", "sage", "coral"];

function parseArgs(argv) {
  const args = { dryRun: false, limit: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--manifest") args.manifest = argv[++i];
    else if (a === "--api") args.api = argv[++i];
    else if (a === "--out") args.out = argv[++i];
  }
  return args;
}

// Upgrade Pinterest thumbnail URLs to high-res originals.
function hiResImage(url) {
  return url.replace(/\/(236x|564x)\//, "/originals/");
}

// Deterministic grad color from sourceUser.
function gradFor(sourceUser) {
  const hash = [...sourceUser].reduce((h, c) => h + c.charCodeAt(0), 0);
  return GRADS[hash % GRADS.length];
}

// Simple category heuristic from pin title.
function categorize(title) {
  const t = (title || "").toLowerCase();
  if (/jewel|necklace|bracelet|earring|ring/.test(t)) return "accessories";
  if (/kitchen|cook|bake|apron|cutting board/.test(t)) return "kitchen";
  if (/candle|home|decor|vase|pillow|blanket|quilt/.test(t)) return "home";
  if (/garden|plant|flower|outdoor/.test(t)) return "garden";
  if (/shirt|dress|jacket|fashion|outfit|wear|bag/.test(t)) return "fashion";
  if (/art|paint|print|poster|frame|photo/.test(t)) return "art";
  if (/book|read|journal/.test(t)) return "books";
  if (/toy|game|kid|child/.test(t)) return "toys";
  if (/food|chocolate|coffee|tea|drink/.test(t)) return "food";
  if (/pet|dog|cat/.test(t)) return "pets";
  return "misc";
}

// Truncate title to a short caption.
function shortCaption(title) {
  if (!title) return "Pinterest find";
  const max = 120;
  if (title.length <= max) return title;
  return title.slice(0, max).replace(/\s+\S*$/, "") + "...";
}

// Bucket a real price into the priceTier the feed ranker / budget filter uses.
function priceTier(price) {
  if (typeof price !== "number" || price <= 0) return "unknown";
  if (price < 25) return "budget";
  if (price < 75) return "mid";
  if (price < 150) return "premium";
  return "luxury";
}

// Map one Pinterest pin record -> one DynamoDB post item (same shape as Reddit).
// Reads the real fields from pinterest-scrape.mjs (link, price, recipient, …)
// and falls back gracefully for the older pinterest-rss.mjs manifest shape.
function pinToPostItem(pin, i = 0) {
  const category = pin.category || categorize(pin.title);
  const merchant = pin.siteName || pin.domain || pin.sourceUser || "Pinterest";
  const grad = gradFor(pin.sourceUser || pin.domain || "pinterest");
  // The real outbound product URL; fall back to the Pinterest pin page.
  const productUrl = pin.link || pin.pinUrl || null;
  const price = typeof pin.price === "number" && pin.price > 0 ? pin.price : 0;
  // Spread synthetic timestamps so the feed isn't one flat block.
  const createdAt = pin.pubDate ? new Date(pin.pubDate).getTime() : Date.now() - i * 1000;

  return {
    postId: pin.id,
    feedPk: "all", // recency-feed GSI partition (see infra byFeed index)
    author: `pinterest_${(pin.sourceUser || "unknown").toLowerCase()}`,
    createdAt,
    likes: typeof pin.ratingCount === "number" ? Math.min(9999, pin.ratingCount) : Math.floor(Math.random() * 50) + 5,
    comments: 0,
    caption: shortCaption(pin.title),
    source: `Pinterest/${pin.sourceUser || "unknown"}`,
    url: productUrl,
    rec: true,
    reason: `Real find from ${merchant}`,
    recipient: pin.recipient || "anyone",
    occasion: pin.occasion || "any",
    category,
    vibes: ["aesthetic", "curated"],
    status: "find",
    priceTier: priceTier(price),
    price,
    priceDisplay: pin.priceDisplay || (price > 0 ? `$${price}` : null),
    inStock: pin.inStock ?? null,
    ratingCount: pin.ratingCount ?? null,
    merchant,
    domain: pin.domain || null,
    pinUrl: pin.pinUrl || null,
    productUrl,
    dominantColor: pin.dominantColor || null,
    product: {
      id: pin.id,
      name: shortCaption(pin.title),
      brand: merchant,
      price,
      grad,
      emoji: "\uD83D\uDCCC",
      image: hiResImage(pin.imageUrl),
      url: productUrl,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args.manifest
    ? resolve(process.cwd(), args.manifest)
    : join(__dirname, "pins.manifest.json");

  let records = JSON.parse(await readFile(file, "utf8"));
  if (args.limit) records = records.slice(0, args.limit);

  const items = records
    .filter((r) => r.id && r.imageUrl)
    .map((r, i) => pinToPostItem(r, i));

  console.log(`Transformed ${items.length} Pinterest pins into post items.`);

  if (args.dryRun) {
    const out = args.out
      ? resolve(process.cwd(), args.out)
      : join(__dirname, "pins.ingest.json");
    await writeFile(out, JSON.stringify(items, null, 2) + "\n");
    console.log(`\n[dry-run] wrote payload -> ${out}`);
    console.log("Sample item:\n" + JSON.stringify(items[0], null, 2));
    return;
  }

  const apiBase =
    args.api ||
    process.env.API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com";

  console.log(`\nSeeding ${items.length} pins via ${apiBase}/seed …`);

  // Batch in chunks of 25 (matching DynamoDB BatchWrite limit).
  const chunk = (arr, n) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, i) =>
      arr.slice(i * n, i * n + n)
    );

  let seeded = 0;
  for (const batch of chunk(items, 25)) {
    const res = await fetch(`${apiBase}/seed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ posts: batch }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`/seed -> HTTP ${res.status}: ${text}`);
    }
    seeded += batch.length;
    console.log(`  …seeded ${seeded}/${items.length}`);
  }

  console.log(`\n✓ ingested ${seeded} Pinterest pins into the feed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

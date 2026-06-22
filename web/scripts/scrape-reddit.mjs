// Reddit gift-idea scraper — credential-free via PullPush.
//
// Why PullPush: Reddit now returns 403 "Blocked" for unauthenticated `.json`
// requests (network-level block, not just User-Agent), and the OAuth token
// endpoint returned 401 for the available app credentials. PullPush
// (https://pullpush.io) is a free, no-auth Reddit archive/search API that
// mirrors the same submission fields, so no client id/secret/password is
// needed at all.
//
// Usage:  node scripts/scrape-reddit.mjs
// Output: lib/reddit-gifts.json  (array of Product-shaped records)

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "..", "lib", "reddit-gifts.json");

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Gift-discovery subreddits.
const SUBREDDITS = [
  "giftideas",
  "gifts",
  "DidntKnowIWantedThat",
  "BuyItForLife",
  "shutupandtakemymoney",
];

const LIMIT = 100;

const GRADS = ["peach", "rose", "butter", "lilac", "sky", "sage", "coral"];

// Map a few keywords to emojis so cards look right; falls back to 🎁.
const EMOJI_RULES = [
  [/camera|photo|polaroid|film/i, "📷"],
  [/candle|scent|fragrance/i, "🕯️"],
  [/perfume|cologne|eau de/i, "🌸"],
  [/vinyl|record|music|album/i, "🎶"],
  [/lamp|light|projector/i, "💡"],
  [/journal|notebook|diary|pen/i, "📔"],
  [/buds|headphone|earbud|speaker|audio/i, "🎧"],
  [/coffee|espresso|mug/i, "☕"],
  [/tea|matcha/i, "🍵"],
  [/plant|garden/i, "🪴"],
  [/book|read|novel/i, "📚"],
  [/game|gaming|console|controller/i, "🎮"],
  [/watch|clock/i, "⌚"],
  [/kitchen|cook|knife|chef/i, "🍳"],
  [/bag|backpack|wallet/i, "🎒"],
];

function pickEmoji(title) {
  for (const [re, emoji] of EMOJI_RULES) if (re.test(title)) return emoji;
  return "🎁";
}

// Pull the first $-amount out of a title, if present.
function parsePrice(title) {
  const m = title.match(/\$\s?(\d{1,4}(?:\.\d{2})?)/);
  return m ? Math.round(parseFloat(m[1])) : null;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// Reddit HTML-encodes preview URLs (&amp;); decode the common entities.
function decode(url) {
  return url ? url.replace(/&amp;/g, "&") : null;
}

function bestImage(data) {
  const preview = data?.preview?.images?.[0]?.source?.url;
  if (preview) return decode(preview);
  const thumb = data?.thumbnail;
  if (thumb && thumb.startsWith("http")) return thumb;
  return null;
}

async function fetchSubreddit(sub) {
  // PullPush returns submissions directly in `data` (no Reddit listing wrapper).
  const url =
    `https://api.pullpush.io/reddit/search/submission/` +
    `?subreddit=${sub}&size=${LIMIT}&sort=desc&sort_type=score`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`r/${sub} -> HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json?.data ?? [];
}

function toProduct(d, idx) {
  const title = (d.title ?? "").trim();
  return {
    id: `rd-${d.subreddit}-${d.id}`,
    name: title.length > 80 ? title.slice(0, 77) + "…" : title,
    brand: `r/${d.subreddit}`,
    price: parsePrice(title) ?? 0,
    grad: GRADS[idx % GRADS.length],
    emoji: pickEmoji(title),
    // extra metadata (not in the base Product type, but handy downstream)
    image: bestImage(d),
    url: `https://www.reddit.com${d.permalink}`,
    score: d.score,
    nsfw: d.over_18,
  };
}

async function main() {
  const seen = new Set();
  const products = [];
  let idx = 0;

  for (const sub of SUBREDDITS) {
    try {
      const items = await fetchSubreddit(sub);
      for (const d of items) {
        if (!d || d.stickied || d.over_18 || !d.title) continue;
        const p = toProduct(d, idx);
        if (seen.has(p.name.toLowerCase())) continue;
        seen.add(p.name.toLowerCase());
        products.push(p);
        idx++;
      }
      console.log(`r/${sub}: ${items.length} posts fetched`);
    } catch (err) {
      console.warn(`! skipping r/${sub}: ${err.message}`);
    }
    // Be polite: small delay between subreddits to stay under the rate limit.
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Highest-scoring first.
  products.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(products, null, 2) + "\n");
  console.log(`\n✓ wrote ${products.length} gift ideas -> ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

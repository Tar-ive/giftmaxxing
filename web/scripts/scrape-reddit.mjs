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
  "GiftIdeas",
  "DidntKnowIWantedThat",
  "BuyItForLife",
  "shutupandtakemymoney",
  "INEEEEDIT",
  "somethingimade",
  "coolgadgets",
  "gadgets",
  "functionalprint",
  "gifts_for_men",
  "gift_ideas",
];

const LIMIT = 100; // posts per PullPush request (max 100)
const PAGES = 3; // pages per subreddit (paginated by created_utc cursor)

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

// The submission's off-reddit link (a product/article URL), if it's a link post.
// Self/text posts and image hosts (i.redd.it etc.) are not product links.
function externalLink(data) {
  const u = data?.url_overridden_by_dest || data?.url;
  if (!u || typeof u !== "string" || !u.startsWith("http")) return null;
  if (/(^|\.)redd\.it|reddit\.com|redditmedia\.com|imgur\.com|gfycat\.com|v\.redd/i.test(u)) {
    return null;
  }
  return u;
}

// One page of submissions from PullPush. `before` is an epoch-seconds cursor
// used to page backwards through a subreddit's history.
async function fetchPage(sub, before) {
  let url =
    `https://api.pullpush.io/reddit/search/submission/` +
    `?subreddit=${sub}&size=${LIMIT}&sort=desc&sort_type=created_utc`;
  if (before) url += `&before=${before}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`r/${sub} -> HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json?.data ?? [];
}

// Pull several pages for a subreddit, paging by the oldest created_utc seen.
async function fetchSubreddit(sub) {
  const all = [];
  let before;
  for (let page = 0; page < PAGES; page++) {
    const items = await fetchPage(sub, before);
    if (items.length === 0) break;
    all.push(...items);
    before = items[items.length - 1]?.created_utc;
    if (!before) break;
    await new Promise((r) => setTimeout(r, 800)); // be polite between pages
  }
  return all;
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
    // extra metadata (not in the base Product type, but used by the ingestion pipeline)
    image: bestImage(d),
    imageW: imageDims(d).w,
    imageH: imageDims(d).h,
    url: d.permalink ? `https://www.reddit.com${d.permalink}` : d.url,
    link: externalLink(d), // off-reddit product/article URL, if any
    domain: d.domain ?? null, // e.g. "amazon.com", "youtube.com", "self.giftideas"
    isSelf: d.is_self ?? false, // text post (no real image)
    postHint: d.post_hint ?? null, // "image" | "link" | "hosted:video" | ...
    selftext: (d.selftext ?? "").slice(0, 600), // body text for semantic enrichment
    score: d.score ?? 0,
    comments: d.num_comments ?? 0,
    subreddit: d.subreddit,
    redditAuthor: d.author ?? "unknown",
    createdUtc: d.created_utc ?? null, // epoch seconds
    nsfw: d.over_18 ?? false,
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

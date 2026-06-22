// Transform scraped Reddit gift records (web/lib/reddit-gifts.json) into the
// DynamoDB `posts` item shape used by the API Lambda (infra/src/handler.mjs)
// and the web app's Post type (web/lib/social.ts).
//
// posts table key schema:
//   postId   (S)  PK
//   author   (S)  + createdAt (N)  -> byAuthor GSI
// The Lambda also reads `likes` for ranking and returns the whole item, so we
// embed a `product` map the UI can render directly, plus the semantic facets
// from enrich.mjs (recipient/occasion/category/vibes/status) that power the
// recommendation endpoint.

import { enrichRecord } from "./enrich.mjs";

// Human-readable "why you're seeing this" from the enriched facets.
function reasonFor(e, subreddit) {
  if (e.recipient !== "anyone") return `Gift idea for your ${e.recipient.replace(/_/g, " ")}`;
  if (e.occasion !== "any") return `Perfect for a ${e.occasion.replace(/_/g, " ")}`;
  if (e.status === "made") return "Handmade find";
  if (e.category !== "misc") return `Trending in ${e.category.replace(/_/g, " ")}`;
  return subreddit ? `Trending in r/${subreddit}` : "Trending on Reddit";
}

// Subreddit -> a stable synthetic author handle so the byAuthor GSI groups
// finds by their source community.
function authorFor(subreddit) {
  return `reddit_${String(subreddit || "unknown").toLowerCase()}`;
}

// Reddit `created_utc` is epoch SECONDS; DynamoDB items use epoch MILLIS.
function createdAtMs(createdUtc) {
  if (typeof createdUtc === "number" && createdUtc > 0) {
    return Math.round(createdUtc * 1000);
  }
  return Date.now();
}

// Map one scraped record -> one DynamoDB post item.
export function toPostItem(r) {
  const e = r.__enriched ?? enrichRecord(r);
  return {
    postId: r.id,
    author: authorFor(r.subreddit),
    createdAt: createdAtMs(r.createdUtc),
    likes: Number(r.score) || 0,
    comments: Number(r.comments) || 0,
    caption: r.name ?? "",
    source: r.brand ?? (r.subreddit ? `r/${r.subreddit}` : "reddit"),
    url: r.url ?? null,
    rec: true,
    reason: reasonFor(e, r.subreddit),
    // semantic facets (from enrich.mjs) used by the recommendation endpoint
    recipient: e.recipient,
    occasion: e.occasion,
    category: e.category,
    vibes: e.vibes,
    status: e.status,
    priceTier: e.priceTier,
    merchant: e.merchant ?? null,
    productUrl: e.productUrl ?? null,
    product: {
      id: r.id,
      name: r.name ?? "",
      brand: r.brand ?? "",
      price: Number(r.price) || 0,
      grad: r.grad ?? "peach",
      emoji: r.emoji ?? "🎁",
      image: r.image ?? null,
    },
  };
}

// Transform + de-duplicate by postId. Drops NSFW and empty-title records.
export function transform(records, { limit } = {}) {
  const seen = new Set();
  const items = [];
  for (const r of records) {
    if (!r || r.nsfw || !r.name || !r.id) continue;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    items.push(toPostItem(r));
    if (limit && items.length >= limit) break;
  }
  return items;
}

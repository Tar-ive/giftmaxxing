// ────────────────────────────────────────────────────────────────────────────
// Giftmaxxing recommendation engine (client-side v1)
//
// This is a deliberately small, *explainable* content-based ranker that mirrors
// the `rec-svc` design in docs/aws-action-plan.md (Stage 4). The same shape of
// logic — build a taste vector from interactions, score candidates by cosine-ish
// similarity + business filters, return scored+explained results — moves to a
// Lambda + DynamoDB later without changing the feed code.
//
// Signals used today (all available on-device):
//   • likes / saves / your comments  → taste vector over "vibes"
//   • saved items                    → price preference
//   • follows                        → author affinity
//   • like count                     → social proof
// Signals to add server-side later: Pinterest/Spotify embeddings, co-save graph,
//   occasion/budget context, recency decay from a real event calendar.
// ────────────────────────────────────────────────────────────────────────────

import { PRODUCTS, type Product } from "@/lib/data";
import { USERS, type Post } from "@/lib/social";

export type Vibe =
  | "cozy" | "film" | "retro" | "tech" | "music" | "home"
  | "wellness" | "kitchen" | "luxe" | "romantic" | "beauty"
  | "minimal" | "stationery" | "calm" | "warm";

type Meta = { vibes: Vibe[]; category: string };

// Lightweight attribute tags. Server-side these become LLM-tagged columns +
// multimodal embeddings; here we hand-tag the seed catalog.
export const PRODUCT_META: Record<string, Meta> = {
  camera: { vibes: ["film", "retro", "tech"], category: "photography" },
  matcha: { vibes: ["cozy", "wellness", "kitchen"], category: "kitchen" },
  candle: { vibes: ["cozy", "home", "calm", "warm"], category: "home" },
  perfume: { vibes: ["luxe", "romantic", "beauty"], category: "beauty" },
  vinyl: { vibes: ["music", "retro", "cozy"], category: "music" },
  lamp: { vibes: ["cozy", "home", "warm", "tech"], category: "home" },
  journal: { vibes: ["minimal", "stationery", "calm"], category: "stationery" },
  buds: { vibes: ["tech", "music", "minimal"], category: "tech" },
};

function meta(p: Product): Meta {
  return PRODUCT_META[p.id] ?? { vibes: ["minimal"], category: "misc" };
}

const VIBE_LABEL: Partial<Record<Vibe, string>> = {
  cozy: "cozy", film: "film-photography", retro: "retro", tech: "tech",
  music: "music", home: "home", wellness: "wellness", kitchen: "kitchen-y",
  luxe: "luxe", romantic: "romantic", beauty: "beauty", minimal: "minimal",
  stationery: "stationery", calm: "calm", warm: "warm-toned",
};

export type TasteProfile = {
  vibes: Record<string, number>; // vibe -> weight
  total: number; // sum of weights (0 = cold start)
  prefPrice: number | null;
  topVibe: Vibe | null;
};

// Build a taste vector from what the user has engaged with.
export function buildTasteProfile(posts: Post[], follows: Set<string>): TasteProfile {
  const vibes: Record<string, number> = {};
  const prices: number[] = [];

  for (const p of posts) {
    // weight: a save is a stronger signal than a like; a comment from you counts too
    let w = 0;
    if (p.liked) w += 1;
    if (p.saved) w += 1.6;
    if (p.comments.some((c) => c.user === "you")) w += 0.6;
    if (w === 0) continue;

    for (const v of meta(p.product).vibes) vibes[v] = (vibes[v] ?? 0) + w;
    if (p.saved || p.liked) prices.push(p.product.price);
  }

  // A followed author's recent finds nudge their vibes up slightly (graph signal).
  for (const p of posts) {
    if (follows.has(p.user)) {
      for (const v of meta(p.product).vibes) vibes[v] = (vibes[v] ?? 0) + 0.25;
    }
  }

  const total = Object.values(vibes).reduce((a, b) => a + b, 0);
  const prefPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const topVibe = (Object.entries(vibes).sort((a, b) => b[1] - a[1])[0]?.[0] as Vibe) ?? null;

  return { vibes, total, prefPrice, topVibe };
}

export type Scored = {
  user: string;
  product: Product;
  score: number;
  reason: string;
  breakdown: { taste: number; price: number; social: number; follow: number };
};

const W = { taste: 0.45, price: 0.15, social: 0.2, follow: 0.2 };

// Score a single (author, product) candidate against the taste profile.
export function scoreCandidate(
  user: string,
  product: Product,
  profile: TasteProfile,
  follows: Set<string>,
  ctx?: { budget?: number; eventBoost?: number }
): Scored {
  const m = meta(product);

  // taste match — normalized overlap of product vibes with the taste vector
  let taste = 0.5; // neutral on cold start
  if (profile.total > 0) {
    const raw = m.vibes.reduce((s, v) => s + (profile.vibes[v] ?? 0), 0);
    taste = Math.min(1, raw / (profile.total * 0.6));
  }

  // price fit — gaussian around the user's revealed price preference
  let price = 0.5;
  if (profile.prefPrice != null) {
    const spread = Math.max(25, profile.prefPrice * 0.6);
    price = Math.exp(-(((product.price - profile.prefPrice) / spread) ** 2));
  }

  // social proof — saturating function of like count (placeholder until real likes)
  const baseLikes = 40 + (product.price % 7) * 18;
  const social = Math.min(1, baseLikes / 250);

  // author affinity
  const follow = follows.has(user) ? 1 : 0;

  const jitter = Math.random() * 0.04; // light exploration so the feed isn't static
  let score =
    W.taste * taste + W.price * price + W.social * social + W.follow * follow + jitter;

  // Event budget fit: when shopping for an upcoming occasion, nudge in-budget
  // items up and over-budget ones down (ctx supplied from the event context).
  if (ctx?.budget) {
    score += product.price <= ctx.budget ? 0.1 : -0.05;
  }

  return {
    user,
    product,
    score,
    reason: explain({ taste, price, social, follow }, profile, m.vibes, user),
    breakdown: { taste, price, social, follow },
  };
}

function explain(
  b: { taste: number; price: number; social: number; follow: number },
  profile: TasteProfile,
  vibes: Vibe[],
  user: string
): string {
  if (b.follow) return `From ${USERS[user]?.name.split(" ")[0] ?? "someone"} you follow`;
  if (profile.total > 0 && b.taste >= 0.5) {
    const hit = vibes.find((v) => (profile.vibes[v] ?? 0) > 0) ?? profile.topVibe;
    if (hit) return `Because you like ${VIBE_LABEL[hit] ?? hit} finds`;
  }
  if (b.price >= 0.7 && profile.prefPrice != null) return `In your usual price range`;
  if (b.social >= 0.7) return `Trending in your circle`;
  return `Picked for you`;
}

// Produce the next ranked page of feed posts, excluding what's already shown.
export function recommendPage(
  profile: TasteProfile,
  follows: Set<string>,
  excludeKeys: Set<string>, // `${user}:${productId}` already in the feed
  pageSize = 4
): Post[] {
  const authors = Object.keys(USERS).filter((u) => u !== "you");

  const candidates: Scored[] = [];
  for (const product of PRODUCTS) {
    for (const user of authors) {
      const key = `${user}:${product.id}`;
      if (excludeKeys.has(key)) continue;
      candidates.push(scoreCandidate(user, product, profile, follows));
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, pageSize).map((c, i) => ({
    id: `rec-${c.user}-${c.product.id}-${Date.now()}-${i}`,
    user: c.user,
    time: `${1 + Math.floor(Math.random() * 6)}d`,
    product: c.product,
    caption: "",
    likes: 40 + Math.round(c.breakdown.social * 200),
    liked: false,
    saved: false,
    comments: [],
    rec: true,
    reason: c.reason,
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Visual Search + Pinterest Recommendation Scaffold
//
// STATUS: SCAFFOLDED — types, interfaces, and stub functions are defined here
// so the frontend can be wired up immediately. The actual backend calls
// require AWS services that may not be provisioned yet.
//
// ┌─────────────────────────────────────────────────────────────────────┐
// │ NEXT AGENT: implement the TODO items below. Requirements:         │
// │                                                                   │
// │ 1. Pinterest board/profile ingestion:                             │
// │    - RSS fallback is already working (infra/ingest/pinterest-     │
// │      rss.mjs). Wire the onboarding PinterestLink URLs through    │
// │      the same pipeline: fetch RSS → download images → S3 →       │
// │      Titan Multimodal embed → S3 Vectors.                        │
// │    - When Pinterest OAuth is approved (v5 API access), swap RSS  │
// │      for the official endpoints (see CLOUD.md §1).               │
// │                                                                   │
// │ 2. Taste profile from Pinterest vectors:                          │
// │    - Given a user's linked Pinterest board vectors, compute a    │
// │      centroid (mean embedding) → that IS their taste vector.     │
// │    - Blend with the onboarding preferences (role, style,         │
// │      interests) for a hybrid taste profile.                      │
// │                                                                   │
// │ 3. Visual search endpoint:                                        │
// │    - POST /visual-search on the API Lambda (see CLOUD.md §6).    │
// │    - Upload query image → Titan MM embed → kNN against S3        │
// │      Vectors → return ranked matches with affiliate links.       │
// │                                                                   │
// │ 4. Affiliate enrichment:                                          │
// │    - Amazon Associates PA-API 5.0 for product data + links.      │
// │    - Walmart Affiliate API for cross-retailer coverage.           │
// │    - Keys go in env/Secrets Manager (see CLOUD.md §9).           │
// │                                                                   │
// │ AWS services needed:                                              │
// │   - S3 media bucket (EXISTS: giftmaxxing-dev-media)              │
// │   - S3 Vectors (EXISTS: giftmaxxing-dev-vectors/pins)            │
// │   - Bedrock Titan MM (GRANTED: amazon.titan-embed-image-v1)      │
// │   - API Lambda (EXISTS: giftmaxxing-dev-api)                     │
// │   - Pinterest OAuth credentials (PENDING app approval)           │
// │   - Amazon Associates / Walmart affiliate keys (PENDING)         │
// └─────────────────────────────────────────────────────────────────────┘
// ────────────────────────────────────────────────────────────────────────────

import { API_BASE, isApiConfigured, fetchVectorRecommendations } from "@/lib/api";
import type {
  UserProfile,
  PinterestLink,
  GiftRole,
  GiftStyle,
  InterestTag,
  MaterialisticCategory,
  DealPreferences,
  DealType,
  BudgetRange,
} from "@/lib/onboarding";

// ── Types ───────────────────────────────────────────────────────────────────

export type VisualSearchResult = {
  id: string;
  imageUrl: string;
  title: string;
  similarity: number; // cosine similarity 0–1
  affiliateUrl?: string;
  price?: number;
  brand?: string;
  source: "s3vectors" | "placeholder";
};

export type PinterestBoardAnalysis = {
  boardUrl: string;
  pinCount: number;
  dominantVibes: string[];
  tasteVector?: number[]; // 1024-d Titan MM centroid
  status: "pending" | "processing" | "ready" | "error";
  error?: string;
};

export type TasteProfileVector = {
  centroid: number[]; // 1024-d mean embedding
  sources: ("onboarding" | "pinterest" | "interactions")[];
  updatedAt: number;
};

// ── Pinterest ingestion ─────────────────────────────────────────────────────

/**
 * TODO(next-agent): Trigger backend ingestion for a Pinterest profile/board.
 *
 * Flow:
 * 1. POST /pinterest/ingest { url } → Lambda
 * 2. Lambda calls infra/ingest/pinterest-rss.mjs (or v5 API when approved)
 * 3. Downloaded images → S3 media bucket → Titan MM embedder → S3 Vectors
 * 4. Returns board analysis with dominant vibes + taste vector
 *
 * For now, this returns a placeholder "pending" status.
 */
export async function ingestPinterestProfile(
  link: PinterestLink
): Promise<PinterestBoardAnalysis> {
  if (isApiConfigured()) {
    // TODO(next-agent): uncomment when /pinterest/ingest endpoint exists
    // const res = await fetch(`${API_BASE}/pinterest/ingest`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ url: link.profileUrl }),
    // });
    // if (!res.ok) throw new Error(`Ingest failed: HTTP ${res.status}`);
    // return res.json();
    void API_BASE; // suppress unused warning in scaffold mode
  }

  return {
    boardUrl: link.profileUrl,
    pinCount: 0,
    dominantVibes: [],
    status: "pending",
  };
}

// ── Visual search ───────────────────────────────────────────────────────────

/**
 * TODO(next-agent): Implement visual search.
 *
 * Flow:
 * 1. Client uploads image via POST /visual-search (multipart)
 * 2. Lambda embeds the image with Titan Multimodal → query vector
 * 3. kNN against S3 Vectors (pins index) → top-k neighbors
 * 4. Enrich with affiliate links (Amazon Associates / Walmart)
 * 5. Return ranked results
 *
 * See CLOUD.md §6 for full spec.
 */
export async function visualSearch(
  _imageFile: File
): Promise<VisualSearchResult[]> {
  if (isApiConfigured()) {
    // TODO(next-agent): uncomment when /visual-search endpoint exists
    // const form = new FormData();
    // form.append("image", imageFile);
    // const res = await fetch(`${API_BASE}/visual-search`, {
    //   method: "POST",
    //   body: form,
    // });
    // if (!res.ok) throw new Error(`Visual search failed: HTTP ${res.status}`);
    // return (await res.json()).results;
    void API_BASE;
  }

  return [];
}

// ── Taste vector from onboarding profile ────────────────────────────────────

/**
 * TODO(next-agent): Build a hybrid taste vector from onboarding data +
 * Pinterest board embeddings.
 *
 * Approach:
 * 1. Onboarding interests → text embedding via Titan MM (e.g. embed the
 *    interest labels as a text string → 1024-d vector).
 * 2. Pinterest board centroid (mean of pin embeddings).
 * 3. Weighted average: e.g. 0.3 * onboarding + 0.7 * pinterest.
 * 4. Store as the user's taste centroid in DynamoDB users table.
 * 5. Use for /recommendations kNN queries (see CLOUD.md §4).
 *
 * The interest tags from onboarding map to the existing Vibe system in
 * lib/recommend.ts — blend these into the existing scoreCandidate weights.
 */
export async function buildTasteVector(
  _profile: UserProfile
): Promise<TasteProfileVector | null> {
  // TODO(next-agent): call POST /taste-vector { profile } when endpoint exists
  return null;
}

// ── Recommendation with onboarding context ──────────────────────────────────

/**
 * TODO(next-agent): Enhance /recommendations calls with the onboarding profile.
 *
 * Pass the user's role, style, interests, and materialistic categories as
 * query params or request body to the rec-svc Lambda so it can:
 * - Weight the taste centroid toward their declared interests
 * - Filter by materialistic categories if style != "thoughtful"
 * - Adjust the feed mix (more inspiration for givers, more wishlists for takers)
 *
 * For now this is a type-only scaffold — the feed continues using the existing
 * recommendPage() and fetchFeed() without modification.
 */
export type EnhancedRecParams = {
  seedKeys?: string[];
  interests?: InterestTag[];
  materialisticCategories?: MaterialisticCategory[];
  style?: GiftStyle;
  role?: GiftRole;
  pinterestCentroid?: number[];
  dealPreferences?: DealPreferences;
};

export async function fetchEnhancedRecommendations(
  params: EnhancedRecParams
): Promise<VisualSearchResult[]> {
  if (!isApiConfigured()) return [];
  // Wired: seed pins (liked/onboarding) -> taste centroid -> S3 Vectors kNN.
  // Interests are passed as `vibes` so the server's facet fallback still has a
  // taste signal when no seed vectors are available.
  const { items } = await fetchVectorRecommendations({
    seedKeys: params.seedKeys,
    vibes: params.interests ? params.interests.map(String) : undefined,
    limit: 12,
  });
  return items.map((i) => ({
    id: i.postId,
    imageUrl: i.image ?? "",
    title: i.name ?? "",
    similarity: i._score ?? 0,
    brand: i.author,
    source: "s3vectors" as const,
  }));
}

// ── Deal monitoring & price tracking scaffold ───────────────────────────────

/**
 * TODO(next-agent): Deal monitoring + price tracking system.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ NEXT AGENT: implement the deal-monitoring pipeline.               │
 * │                                                                   │
 * │ 1. Price tracking:                                                │
 * │    - User adds items to a watchlist from the feed or search       │
 * │    - Lambda cron scrapes prices from affiliate APIs               │
 * │      (Amazon PA-API 5.0, Walmart API) on a schedule              │
 * │    - Store price history in DynamoDB (itemId, price, timestamp)   │
 * │    - Detect price drops, clearance flags, and sale events         │
 * │                                                                   │
 * │ 2. Deal discovery:                                                │
 * │    - EventBridge scheduled rule triggers deal-finder Lambda       │
 * │    - Scrape deal feeds: Amazon deals API, Walmart rollbacks,     │
 * │      RSS feeds from deal aggregators                              │
 * │    - Match deals to user preferences (dealTypes, interests,      │
 * │      materialisticCategories, budgetRange)                        │
 * │    - Rank by taste vector similarity + deal quality score        │
 * │                                                                   │
 * │ 3. Notifications:                                                 │
 * │    - Users with priceAlerts=true get notified on price drops     │
 * │    - Push via web push notifications (Service Worker)            │
 * │    - In-app notification bell in the feed header                 │
 * │    - Email digest (optional, future)                              │
 * │                                                                   │
 * │ 4. Maxi AI integration:                                          │
 * │    - Maxi suggests deals based on the user's taste vector        │
 * │    - "I found this at 40% off — matches your friend's vibe!"    │
 * │    - Deal cards in the feed ranked alongside organic content     │
 * │    - Maxi can explain why a deal is good value                   │
 * │                                                                   │
 * │ AWS services needed:                                              │
 * │   - EventBridge Scheduler (deal-finder cron)                     │
 * │   - Lambda (deal-finder, price-tracker)                          │
 * │   - DynamoDB (price history table, watchlist table)              │
 * │   - SNS or SES (push/email notifications)                       │
 * │   - Amazon Associates PA-API 5.0 keys (PENDING)                 │
 * │   - Walmart Affiliate API keys (PENDING)                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

export type PricePoint = {
  price: number;
  currency: string;
  timestamp: number;
  source: "amazon" | "walmart" | "other";
};

export type WatchlistItem = {
  id: string;
  productId: string;
  title: string;
  imageUrl?: string;
  targetPrice?: number;
  currentPrice?: number;
  priceHistory: PricePoint[];
  dealTypes: DealType[];
  budgetRange: BudgetRange;
  source: "amazon" | "walmart" | "other";
  affiliateUrl?: string;
  addedAt: number;
  lastChecked?: number;
};

export type DealAlert = {
  id: string;
  watchlistItemId: string;
  type: "price-drop" | "clearance" | "flash-sale" | "back-in-stock" | "coupon";
  title: string;
  description: string;
  originalPrice: number;
  dealPrice: number;
  savingsPercent: number;
  affiliateUrl: string;
  expiresAt?: number;
  createdAt: number;
  read: boolean;
};

export type DealFeedItem = {
  id: string;
  title: string;
  imageUrl: string;
  originalPrice: number;
  dealPrice: number;
  savingsPercent: number;
  dealType: DealType;
  source: "amazon" | "walmart" | "other";
  affiliateUrl: string;
  similarity: number;
  expiresAt?: number;
  brand?: string;
};

export type MaxiDealSuggestion = {
  deal: DealFeedItem;
  reason: string;
  confidence: number;
  matchedPreferences: string[];
};

/**
 * TODO(next-agent): Add item to the user's price watchlist.
 * Store in DynamoDB watchlist table; start tracking price via affiliate APIs.
 */
export async function addToWatchlist(
  _item: Omit<WatchlistItem, "id" | "priceHistory" | "addedAt" | "lastChecked">
): Promise<WatchlistItem | null> {
  if (isApiConfigured()) {
    // TODO(next-agent): POST /watchlist { item } → Lambda
    void API_BASE;
  }
  return null;
}

/**
 * TODO(next-agent): Fetch the user's watchlist with current prices.
 */
export async function getWatchlist(): Promise<WatchlistItem[]> {
  if (isApiConfigured()) {
    // TODO(next-agent): GET /watchlist → Lambda → DynamoDB
    void API_BASE;
  }
  return [];
}

/**
 * TODO(next-agent): Fetch unread deal alerts for the user.
 * Alerts are generated by the deal-finder Lambda when prices drop
 * or matching deals are found.
 */
export async function getDealAlerts(): Promise<DealAlert[]> {
  if (isApiConfigured()) {
    // TODO(next-agent): GET /alerts → Lambda → DynamoDB
    void API_BASE;
  }
  return [];
}

/**
 * TODO(next-agent): Fetch deals matched to the user's taste + deal preferences.
 * Uses the same taste vector as recommendations, but filters/boosts by
 * dealPreferences (budgetRange, dealTypes, priceAlerts).
 */
export async function fetchDealFeed(
  _preferences: DealPreferences
): Promise<DealFeedItem[]> {
  if (isApiConfigured()) {
    // TODO(next-agent): GET /deals?budget=mid&types=clearance,flash-sales → Lambda
    void API_BASE;
  }
  return [];
}

/**
 * TODO(next-agent): Get Maxi AI deal suggestions — personalized deal
 * recommendations with natural-language explanations.
 *
 * Flow:
 * 1. Fetch user's taste vector + deal preferences
 * 2. Query deal catalog with taste-weighted kNN
 * 3. Use Bedrock (Claude/Titan) to generate explanation for each match
 * 4. Return ranked suggestions with reasons
 */
export async function getMaxiDealSuggestions(
  _profile: UserProfile
): Promise<MaxiDealSuggestion[]> {
  if (isApiConfigured()) {
    // TODO(next-agent): GET /maxi/deals { profile } → Lambda → Bedrock
    void API_BASE;
  }
  return [];
}

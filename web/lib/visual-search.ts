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

import { API_BASE, isApiConfigured } from "@/lib/api";
import type {
  UserProfile,
  PinterestLink,
  GiftRole,
  GiftStyle,
  InterestTag,
  MaterialisticCategory,
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
};

export async function fetchEnhancedRecommendations(
  _params: EnhancedRecParams
): Promise<VisualSearchResult[]> {
  // TODO(next-agent): wire to GET /recommendations with onboarding context
  return [];
}

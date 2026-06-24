// Client data layer for the AWS HTTP API (infra/). Fetches the cursor-paginated
// feed + recommendations and maps DynamoDB post items into the UI's Post type.
import type { Grad } from "@/lib/data";
import type { Post } from "@/lib/social";
import { SEED_PINS } from "@/lib/seed-pins";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
export const isApiConfigured = () => API_BASE.length > 0;

const GRADS: Grad[] = ["peach", "rose", "butter", "lilac", "sky", "sage", "coral"];
const asGrad = (g: unknown): Grad =>
  GRADS.includes(g as Grad) ? (g as Grad) : "peach";

// Shape returned by GET /feed and /recommendations (see infra/src/handler.mjs).
type ApiPost = {
  postId: string;
  author?: string;
  createdAt?: number;
  likes?: number;
  comments?: number;
  caption?: string;
  source?: string;
  url?: string;
  productUrl?: string | null;
  rec?: boolean;
  reason?: string;
  recipient?: string;
  occasion?: string;
  category?: string;
  status?: string;
  product?: {
    id?: string;
    name?: string;
    brand?: string;
    price?: number;
    grad?: string;
    emoji?: string;
    image?: string | null;
  };
};

export type FeedPage = { posts: Post[]; cursor: string | null };

// Compact relative time from an epoch-ms timestamp ("5d", "3h", "12m").
export function relativeTime(ms?: number): string {
  if (!ms) return "";
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 365) return `${d}d`;
  return `${Math.floor(d / 365)}y`;
}

export function mapApiPost(api: ApiPost): Post {
  const p = api.product ?? {};
  return {
    id: api.postId,
    user: api.author ?? "reddit",
    time: relativeTime(api.createdAt),
    product: {
      id: p.id ?? api.postId,
      name: p.name ?? api.caption ?? "Gift find",
      brand: p.brand ?? api.source ?? "Reddit",
      price: Number(p.price) || 0,
      grad: asGrad(p.grad),
      emoji: p.emoji ?? "🎁",
      image: p.image ?? null,
    },
    caption: api.caption ?? "",
    likes: Number(api.likes) || 0,
    liked: false,
    saved: false,
    comments: [],
    commentCount: Number(api.comments) || 0,
    source: api.source,
    url: api.url,
    productUrl: api.productUrl ?? null,
    rec: api.rec ?? true,
    reason: api.reason,
  };
}

type FeedOpts = {
  cursor?: string | null;
  limit?: number;
  vibes?: string[];
  recipient?: string;
  occasion?: string;
  category?: string;
  budget?: number;
  eventBoost?: number;
};

async function getPage(path: string, opts: FeedOpts): Promise<FeedPage> {
  const q = new URLSearchParams();
  if (opts.cursor) q.set("cursor", opts.cursor);
  if (opts.limit) q.set("limit", String(opts.limit));
  if (opts.vibes?.length) q.set("vibes", opts.vibes.join(","));
  if (opts.recipient) q.set("recipient", opts.recipient);
  if (opts.occasion) q.set("occasion", opts.occasion);
  if (opts.category) q.set("category", opts.category);
  if (opts.budget) q.set("budget", String(opts.budget));
  if (opts.eventBoost) q.set("eventBoost", String(opts.eventBoost));

  const res = await fetch(`${API_BASE}${path}?${q.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const data = (await res.json()) as { items?: ApiPost[]; cursor?: string | null };
  return {
    posts: (data.items ?? []).map(mapApiPost),
    cursor: data.cursor ?? null,
  };
}

export const fetchFeed = (opts: FeedOpts = {}) => getPage("/feed", opts);
export const fetchRecommendations = (opts: FeedOpts = {}) =>
  getPage("/recommendations", opts);

// ── Vector recommendations (S3 Vectors) ──────────────────────────────────────
// Raw item shape returned by GET /pins and the vector path of /recommendations.
export type VectorItem = {
  postId: string;
  author?: string;
  image?: string;
  name?: string;
  source?: string;
  reason?: string;
  _score?: number | null;
  _distance?: number | null;
};

export type VectorResponse = { items: VectorItem[]; source: string | null };

// List embedded pins (key + metadata) to use as seed vectors. Prefers the live
// GET /pins endpoint; falls back to the bundled SEED_PINS list when /pins isn't
// reachable (e.g. not deployed yet) so the UI keeps working offline of it.
export async function fetchPins(limit = 60): Promise<VectorItem[]> {
  if (isApiConfigured()) {
    try {
      const res = await fetch(`${API_BASE}/pins?limit=${limit}`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as { items?: VectorItem[] };
        if (data.items && data.items.length) return data.items;
      }
    } catch {
      // fall through to the bundled list
    }
  }
  return SEED_PINS.slice(0, limit).map((p) => ({
    postId: p.k,
    name: p.t,
    author: `pinterest_${p.u}`,
  }));
}

// Call the vector path of /recommendations: seedKeys -> taste centroid -> kNN.
// Returns the raw items plus the `source` tag ("vector" | "facet").
export async function fetchVectorRecommendations(
  opts: { seedKeys?: string[]; vibes?: string[]; sourceUser?: string; limit?: number } = {}
): Promise<VectorResponse> {
  const q = new URLSearchParams();
  if (opts.seedKeys?.length) q.set("seedKeys", opts.seedKeys.join(","));
  if (opts.vibes?.length) q.set("vibes", opts.vibes.join(","));
  if (opts.sourceUser) q.set("sourceUser", opts.sourceUser);
  q.set("limit", String(opts.limit ?? 12));

  const res = await fetch(`${API_BASE}/recommendations?${q.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`/recommendations -> HTTP ${res.status}`);
  const data = (await res.json()) as { items?: VectorItem[]; source?: string };
  return { items: data.items ?? [], source: data.source ?? null };
}

// Visual search: POST a base64 image -> Titan Multimodal embed -> S3 Vectors kNN
// (see infra/src/handler.mjs POST /visual-search). Throws if the endpoint isn't
// reachable so callers can fall back to a local taste match.
export async function fetchVisualSearch(opts: {
  imageBase64: string;
  text?: string;
  limit?: number;
  sourceUser?: string;
}): Promise<VectorResponse> {
  if (!isApiConfigured()) throw new Error("API not configured");
  const res = await fetch(`${API_BASE}/visual-search`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      imageBase64: opts.imageBase64,
      text: opts.text,
      limit: opts.limit ?? 12,
      sourceUser: opts.sourceUser,
    }),
  });
  if (!res.ok) throw new Error(`/visual-search -> HTTP ${res.status}`);
  const data = (await res.json()) as { items?: VectorItem[]; source?: string };
  return { items: data.items ?? [], source: data.source ?? "visual" };
}

// ── User profile persistence (DynamoDB `users` table via /me) ─────────────────
// The signed-in user's whole profile (incl. recipients + events) is stored as a
// single item keyed by the Clerk userId, so it hydrates in one read on login.
// Wired up by AccountSync (web/components/app/account-sync.tsx).
export type UpcomingEvent = {
  id: string;
  recipientId: string;
  type: string;
  date: string;
  recurrence: string;
  reminderLeadDays: number;
  budget?: number;
  daysUntil: number;
  recipient: { id: string; name: string; relation: string; sourceUser?: string } | null;
};

export async function fetchMe<T = Record<string, unknown>>(userId: string): Promise<T | null> {
  if (!isApiConfigured() || !userId) return null;
  try {
    const res = await fetch(`${API_BASE}/me?userId=${encodeURIComponent(userId)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { item?: T | null };
    return data.item ?? null;
  } catch {
    return null;
  }
}

export async function saveMe(userId: string, profile: unknown): Promise<boolean> {
  if (!isApiConfigured() || !userId) return false;
  try {
    const res = await fetch(`${API_BASE}/me`, {
      method: "PUT",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ userId, profile }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchUpcomingEvents(
  userId: string,
  withinDays = 90
): Promise<UpcomingEvent[]> {
  if (!isApiConfigured() || !userId) return [];
  try {
    const res = await fetch(
      `${API_BASE}/events/upcoming?userId=${encodeURIComponent(userId)}&withinDays=${withinDays}`,
      { headers: { accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: UpcomingEvent[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

// ── Soft profiles / viral swipe-challenge connections ────────────────────────
// When a guest finishes a shared swipe challenge, a "soft profile" is created on
// the sender's account (POST /connections, keyed by the sender's Clerk userId).
// The sender reads them back (GET /connections) as notifications + connections.

const UID_KEY = "giftmaxxing_uid";

// The signed-in user's Clerk userId, stashed to localStorage by AccountSync so
// non-Clerk client code (e.g. the swipe share link) can read it synchronously.
export function getMyUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(UID_KEY) || null;
  } catch {
    return null;
  }
}

export function setMyUserId(userId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (userId) localStorage.setItem(UID_KEY, userId);
    else localStorage.removeItem(UID_KEY);
  } catch {
    /* ignore quota / disabled storage */
  }
}

// Taste + identity captured from a guest's completed swipe challenge.
export type GuestSoftProfile = {
  name: string;
  handle?: string;
  birthday?: string;
  vibes?: string[];
  seeds?: string[];
  interests?: string[];
  yesCount?: number;
  totalSwipes?: number;
};

// A soft profile as stored under the sender (GET /connections).
export type SoftConnection = {
  userId: string;
  connectionId: string;
  soft?: boolean;
  kind?: string;
  guestName: string;
  guestHandle?: string;
  birthday?: string;
  vibes?: string[];
  seeds?: string[];
  interests?: string[];
  yesCount?: number;
  totalSwipes?: number;
  seen?: boolean;
  createdAt?: number;
};

// Called by the (anonymous) guest's browser on challenge completion.
export async function createConnection(
  senderId: string,
  guest: GuestSoftProfile
): Promise<boolean> {
  if (!isApiConfigured() || !senderId || !guest?.name) return false;
  try {
    const res = await fetch(`${API_BASE}/connections`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ senderId, guest }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Called by the sender's app to list collected soft profiles (newest first).
export async function fetchConnections(
  userId: string,
  opts: { unseenOnly?: boolean } = {}
): Promise<{ items: SoftConnection[]; unseen: number }> {
  if (!isApiConfigured() || !userId) return { items: [], unseen: 0 };
  try {
    const q = new URLSearchParams({ userId });
    if (opts.unseenOnly) q.set("unseenOnly", "1");
    const res = await fetch(`${API_BASE}/connections?${q.toString()}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { items: [], unseen: 0 };
    const data = (await res.json()) as { items?: SoftConnection[]; unseen?: number };
    return { items: data.items ?? [], unseen: data.unseen ?? 0 };
  } catch {
    return { items: [], unseen: 0 };
  }
}

// Clear the sender's notification state. Omit ids to mark all unseen as seen.
export async function markConnectionsSeen(
  userId: string,
  connectionIds?: string[]
): Promise<boolean> {
  if (!isApiConfigured() || !userId) return false;
  try {
    const res = await fetch(`${API_BASE}/connections/seen`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ userId, connectionIds }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

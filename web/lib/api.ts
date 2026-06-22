// Client data layer for the AWS HTTP API (infra/). Fetches the cursor-paginated
// feed + recommendations and maps DynamoDB post items into the UI's Post type.
import type { Grad } from "@/lib/data";
import type { Post } from "@/lib/social";

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
};

async function getPage(path: string, opts: FeedOpts): Promise<FeedPage> {
  const q = new URLSearchParams();
  if (opts.cursor) q.set("cursor", opts.cursor);
  if (opts.limit) q.set("limit", String(opts.limit));
  if (opts.vibes?.length) q.set("vibes", opts.vibes.join(","));
  if (opts.recipient) q.set("recipient", opts.recipient);
  if (opts.occasion) q.set("occasion", opts.occasion);
  if (opts.category) q.set("category", opts.category);

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

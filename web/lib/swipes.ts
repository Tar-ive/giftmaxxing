"use client";

// ────────────────────────────────────────────────────────────────────────────
// Swipe-to-train signals ("Would you want this gifted to you?")
//
// Each yes/no swipe is a strong taste signal. We persist them in localStorage
// and turn the "yes" swipes into:
//   • seedKeys  → the S3 Vectors taste centroid for /recommendations kNN
//   • vibes     → soft category hints for the server's facet fallback
//   • localMatchesFromSwipes() → an offline ranking when the API isn't reachable
//
// A pin's `id` === its S3 Vectors key === its DynamoDB postId, so a liked pin id
// can be passed straight to fetchVectorRecommendations({ seedKeys }).
// ────────────────────────────────────────────────────────────────────────────

import { PINS, type Pin } from "@/lib/pins";

export type SwipeDir = "yes" | "no";
export type Swipe = { id: string; dir: SwipeDir; at: number };

const KEY = "giftmaxxing_swipes";
export const SWIPES_EVENT = "giftmaxxing:swipes";

const BY_ID = new Map<string, Pin>(PINS.map((p) => [p.id, p]));
export const pinById = (id: string): Pin | undefined => BY_ID.get(id);

export function loadSwipes(): Swipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is Swipe =>
        !!s &&
        typeof s === "object" &&
        typeof (s as Swipe).id === "string" &&
        ((s as Swipe).dir === "yes" || (s as Swipe).dir === "no")
    );
  } catch {
    return [];
  }
}

function persist(list: Swipe[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SWIPES_EVENT));
  } catch {
    // ignore quota / serialization errors
  }
}

// Record a swipe; the latest decision for a given pin wins. Returns the new list.
export function recordSwipe(id: string, dir: SwipeDir): Swipe[] {
  const list = loadSwipes().filter((s) => s.id !== id);
  list.unshift({ id, dir, at: Date.now() });
  persist(list);
  return list;
}

export function clearSwipes(): void {
  persist([]);
}

export function swipedIdSet(list: Swipe[] = loadSwipes()): Set<string> {
  return new Set(list.map((s) => s.id));
}

export function swipeStats(list: Swipe[] = loadSwipes()): {
  yes: number;
  no: number;
  total: number;
} {
  let yes = 0;
  let no = 0;
  for (const s of list) {
    if (s.dir === "yes") yes++;
    else no++;
  }
  return { yes, no, total: yes + no };
}

// Newest "yes" pin ids — passed as S3 Vectors seedKeys (taste centroid input).
export function seedKeysFromSwipes(n = 8, list: Swipe[] = loadSwipes()): string[] {
  return list
    .filter((s) => s.dir === "yes")
    .slice(0, n)
    .map((s) => s.id);
}

// Top categories among liked pins, as soft "vibe" hints for the recommender.
export function swipeVibes(n = 5, list: Swipe[] = loadSwipes()): string[] {
  const counts = new Map<string, number>();
  for (const s of list) {
    if (s.dir !== "yes") continue;
    const c = pinById(s.id)?.category;
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([c]) => c);
}

// Offline fallback: rank unseen pins by category match to liked pins, then by
// closeness to the average liked price. Mirrors the server's taste logic so the
// "your matches" view still works before the vector API is reachable.
export function localMatchesFromSwipes(n = 12, list: Swipe[] = loadSwipes()): Pin[] {
  const liked = list
    .filter((s) => s.dir === "yes")
    .map((s) => pinById(s.id))
    .filter((p): p is Pin => Boolean(p));
  const swiped = swipedIdSet(list);
  const likedCats = new Set(liked.map((p) => p.category));
  const avgPrice = liked.length
    ? liked.reduce((a, p) => a + p.price, 0) / liked.length
    : null;

  const scored = PINS.filter((p) => !swiped.has(p.id)).map((p) => {
    let score = likedCats.has(p.category) ? 1 : 0;
    if (avgPrice != null) {
      const spread = Math.max(20, avgPrice * 0.6);
      score += Math.exp(-(((p.price - avgPrice) / spread) ** 2)) * 0.5;
    }
    return { p, score: score + Math.random() * 0.05 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.p);
}

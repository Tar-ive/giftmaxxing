// Client data layer for backend-backed group-gift pools (infra/ POOLS table via
// the AWS HTTP API). Unlike the legacy localStorage pools (web/lib/fundraisers.ts),
// these sync across everyone in the pool: contributions update a shared total and
// there is a live group chat. All calls go through apiFetch (auth + base URL) and
// degrade gracefully (return null / [] / false) so the UI can fall back when the
// API isn't configured or a request fails.
import type { Grad } from "@/lib/data";
import { apiFetch, isApiConfigured } from "@/lib/api";

export type Pool = {
  poolId: string;
  title: string;
  occasion: string;
  goal: number;
  blurb: string;
  emoji: string;
  grad: Grad;
  image?: string | null;
  recipient?: string;
  organizerId: string;
  organizerName: string;
  raised: number;
  contribCount: number;
  memberCount: number;
  deadline?: string;
  createdAt: number;
};

export type PoolMember = {
  userId: string;
  name: string;
  joinedAt: number;
  role?: string;
};

export type PoolContribution = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  at: number;
};

export type PoolMessage = {
  id: string;
  userId: string;
  name: string;
  text: string;
  at: number;
};

export type PoolDetail = {
  pool: Pool;
  members: PoolMember[];
  contributions: PoolContribution[];
  messages: PoolMessage[];
};

export type NewPoolInput = {
  title: string;
  occasion: string;
  goal: number;
  blurb?: string;
  emoji?: string;
  grad?: Grad;
  image?: string | null;
  recipient?: string;
  deadline?: string;
};

export function raisedPct(pool: Pick<Pool, "raised" | "goal">): number {
  if (!pool.goal) return 0;
  return Math.min(100, Math.round((pool.raised / pool.goal) * 100));
}

// Every pool the signed-in user belongs to (organizer or member), newest first.
export async function fetchMyPools(userId: string): Promise<Pool[]> {
  if (!isApiConfigured() || !userId) return [];
  try {
    const res = await apiFetch(`/pools?userId=${encodeURIComponent(userId)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: Pool[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

// Create a pool. The caller becomes organizer + first member. Returns the pool.
export async function createPool(
  userId: string,
  name: string,
  pool: NewPoolInput
): Promise<Pool | null> {
  if (!isApiConfigured() || !userId) return null;
  try {
    const res = await apiFetch(`/pools`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ userId, name, pool }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { pool?: Pool };
    return data.pool ?? null;
  } catch {
    return null;
  }
}

// Full pool: meta + members + contributions + recent chat (used by the detail page).
export async function fetchPool(poolId: string): Promise<PoolDetail | null> {
  if (!isApiConfigured() || !poolId) return null;
  try {
    const res = await apiFetch(`/pools/${encodeURIComponent(poolId)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PoolDetail;
    if (!data?.pool) return null;
    return {
      pool: data.pool,
      members: data.members ?? [],
      contributions: data.contributions ?? [],
      messages: data.messages ?? [],
    };
  } catch {
    return null;
  }
}

// Join a pool without contributing (e.g. arriving via an invite link). Idempotent.
export async function joinPool(
  poolId: string,
  userId: string,
  name: string
): Promise<boolean> {
  if (!isApiConfigured() || !poolId || !userId) return false;
  try {
    const res = await apiFetch(`/pools/${encodeURIComponent(poolId)}/join`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ userId, name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Chip in `amount` to the pool. Returns the new shared raised total, or null.
export async function contributeToPool(
  poolId: string,
  userId: string,
  name: string,
  amount: number
): Promise<number | null> {
  if (!isApiConfigured() || !poolId || !userId || !(amount > 0)) return null;
  try {
    const res = await apiFetch(`/pools/${encodeURIComponent(poolId)}/contribute`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ userId, name, amount }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { raised?: number };
    return typeof data.raised === "number" ? data.raised : null;
  } catch {
    return null;
  }
}

// Group chat history. Pass `after` (a ms timestamp) to fetch only newer messages
// for incremental polling. Returns oldest-first.
export async function fetchPoolMessages(
  poolId: string,
  after?: number
): Promise<PoolMessage[]> {
  if (!isApiConfigured() || !poolId) return [];
  try {
    const q = after ? `?after=${after}` : "";
    const res = await apiFetch(`/pools/${encodeURIComponent(poolId)}/messages${q}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: PoolMessage[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

// Post a message to the pool's group chat. Returns the stored message, or null.
export async function postPoolMessage(
  poolId: string,
  userId: string,
  name: string,
  text: string
): Promise<PoolMessage | null> {
  if (!isApiConfigured() || !poolId || !userId || !text.trim()) return null;
  try {
    const res = await apiFetch(`/pools/${encodeURIComponent(poolId)}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ userId, name, text: text.trim() }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: PoolMessage };
    return data.message ?? null;
  } catch {
    return null;
  }
}

// Reserved author id for messages authored by Maxi (the AI gift concierge). The
// backend treats this id as a bot, so a Maxi message never makes Maxi a member
// or counts toward the pool size.
export const MAXI_USER_ID = "maxi";

// Post a message authored by Maxi into a pool's group chat — used to welcome the
// group and to announce invites ("Maxi auto-messages the people you invite").
export async function postMaxiMessage(
  poolId: string,
  text: string
): Promise<PoolMessage | null> {
  return postPoolMessage(poolId, MAXI_USER_ID, "Maxi", text);
}

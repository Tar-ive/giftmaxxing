"use client";

// ────────────────────────────────────────────────────────────────────────────
// Anonymous creator identity — lets a signed-out person share a challenge.
//
// When someone shares a challenge without an account, we mint a stable, private
// id ("anon_…") and stash it in localStorage. Their challenge link and every
// guest response that comes back are keyed by this id server-side (the public
// POST /connections accepts any sender id). On sign-in, AccountSync calls
// claimConnections(anonId, userId) to re-key everything into the real Clerk
// account, then clears the anon id (see components/app/account-sync.tsx).
//
// Limitation: this is same-device. The anon id lives only in this browser, so a
// challenge shared signed-out can only be auto-claimed if the creator later
// signs in on the same browser before clearing storage.
// ────────────────────────────────────────────────────────────────────────────

const ANON_KEY = "giftmaxxing_anon_id";

function randomId(): string {
  const rand =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `anon_${rand}`;
}

/** The current anon id, or null if this browser has never shared signed-out. */
export function getAnonId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ANON_KEY) || null;
  } catch {
    return null;
  }
}

/** The anon id for this browser, creating + persisting one on first use. */
export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return randomId();
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

/** Forget the anon id (called once its data has been claimed into an account). */
export function clearAnonId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANON_KEY);
  } catch {
    // ignore
  }
}

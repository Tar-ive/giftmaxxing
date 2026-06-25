"use client";

// ────────────────────────────────────────────────────────────────────────────
// Cloud sync for interaction data (likes, saves, follows).
//
// The onboarding profile (taste preferences) is already synced to the cloud
// via AccountSync → saveMe/fetchMe.  This module extends that sync to include
// post interaction state (likes/saves) and follows, which were previously
// localStorage-only.
//
// Pattern: localStorage is always the primary local store.  When the API is
// configured AND the user is signed in, changes are debounce-pushed to the
// cloud profile (PUT /me) so they roam across devices.  On a fresh-device
// sign-in, AccountSync restores cloud data back to localStorage.
// ────────────────────────────────────────────────────────────────────────────

import { loadProfile } from "@/lib/onboarding";
import { saveMe, getMyUserId, isApiConfigured } from "@/lib/api";

// Same keys used by store.tsx — single source of truth in localStorage.
const POST_STATE_KEY = "giftmaxxing_post_state";
const FOLLOWS_KEY = "giftmaxxing_follows";

export type PostState = Record<string, { liked?: boolean; saved?: boolean }>;

// ── localStorage helpers ─────────────────────────────────────────────────────

export function loadPostState(): PostState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(POST_STATE_KEY);
    return raw ? (JSON.parse(raw) as PostState) : {};
  } catch {
    return {};
  }
}

export function savePostState(state: PostState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(POST_STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function loadFollows(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FOLLOWS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveFollows(follows: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(follows));
  } catch {
    /* quota */
  }
}

// ── Cloud payload helpers ────────────────────────────────────────────────────

// Shape stored under the /me endpoint (superset of UserProfile).
type CloudPayload = Record<string, unknown> & {
  postState?: PostState;
  follows?: string[];
};

// Merge the onboarding profile with current interaction data for cloud push.
export function buildCloudPayload(): CloudPayload | null {
  const profile = loadProfile();
  if (!profile) return null;
  return {
    ...profile,
    postState: loadPostState(),
    follows: loadFollows(),
  };
}

// Extract interaction data from a cloud-restored profile and write to
// localStorage so the store can hydrate from it on mount / via event.
export function restoreInteractionData(cloud: Record<string, unknown>): void {
  if (cloud.postState && typeof cloud.postState === "object") {
    savePostState(cloud.postState as PostState);
  }
  if (Array.isArray(cloud.follows)) {
    saveFollows(cloud.follows as string[]);
  }
}

// ── Debounced cloud push ─────────────────────────────────────────────────────

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 2000;

// Push the full payload (profile + interactions) to the cloud.  Debounced so
// rapid like/save taps coalesce into a single PUT.
export function syncToCloud(): void {
  if (!isApiConfigured()) return;
  const userId = getMyUserId();
  if (!userId) return;

  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    _syncTimer = null;
    const payload = buildCloudPayload();
    if (payload) void saveMe(userId, payload);
  }, SYNC_DEBOUNCE_MS);
}

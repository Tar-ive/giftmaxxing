"use client";

// ────────────────────────────────────────────────────────────────────────────
// Soft profile — lightweight local preference snapshot for invite guests.
//
// When a guest completes the swipe challenge without an account, we save their
// taste signals (vibes, seeds, birthday) locally so the feed can show relevant
// content. This is NOT a real account — it's a preference overlay that the
// onboarding gate and feed can read to personalize the experience.
// ────────────────────────────────────────────────────────────────────────────

const KEY = "giftmaxxing_soft_profile";

export type SoftProfile = {
  name: string;
  vibes: string[];
  seeds: string[];
  birthday?: string;
  inviterName: string;
  completedAt: number;
};

export function loadSoftProfile(): SoftProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as SoftProfile).name === "string"
    ) {
      return parsed as SoftProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSoftProfile(profile: SoftProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // quota exceeded
  }
}

export function clearSoftProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

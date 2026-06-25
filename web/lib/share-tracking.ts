"use client";

// ────────────────────────────────────────────────────────────────────────────
// Share tracking — local persistence for the viral-loop share sheet.
//
// Records every share action (channel, recipient name, URL, timestamp) in
// localStorage so the sender can see who they've shared with on the swipe page.
// ────────────────────────────────────────────────────────────────────────────

const KEY = "giftmaxxing_shares";
export const SHARES_EVENT = "giftmaxxing:shares";

export type ShareRecord = {
  id: string;
  channel: string;
  recipientName: string;
  url: string;
  sharedAt: number;
};

export function loadShares(): ShareRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is ShareRecord =>
        !!s &&
        typeof s === "object" &&
        typeof (s as ShareRecord).id === "string" &&
        typeof (s as ShareRecord).channel === "string"
    );
  } catch {
    return [];
  }
}

export function recordShare(channel: string, recipientName: string, url: string): ShareRecord {
  const record: ShareRecord = {
    id: `sh_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    channel,
    recipientName: recipientName.trim() || "someone",
    url,
    sharedAt: Date.now(),
  };
  const list = loadShares();
  list.unshift(record);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
      window.dispatchEvent(new Event(SHARES_EVENT));
    } catch {
      // quota exceeded
    }
  }
  return record;
}

export function relativeShareTime(ms: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

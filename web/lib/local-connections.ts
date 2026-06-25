"use client";

// ────────────────────────────────────────────────────────────────────────────
// Local connections — client-side simulation of the connections backend.
//
// When a guest completes an invite challenge, we store the connection locally
// so the sender can see it in /feed/activity even before the connections
// backend is deployed. The real API (createConnection in lib/api.ts) is still
// called when configured; this layer adds a local fallback that always works.
// ────────────────────────────────────────────────────────────────────────────

import type { SoftConnection } from "@/lib/api";

const KEY = "giftmaxxing_local_connections";
export const LOCAL_CONN_EVENT = "giftmaxxing:local-connections";

export function loadLocalConnections(): SoftConnection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SoftConnection[];
  } catch {
    return [];
  }
}

export function saveLocalConnection(conn: SoftConnection): void {
  if (typeof window === "undefined") return;
  try {
    const list = loadLocalConnections();
    // Avoid duplicates by connectionId
    if (list.some((c) => c.connectionId === conn.connectionId)) return;
    list.unshift(conn);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
    window.dispatchEvent(new Event(LOCAL_CONN_EVENT));
  } catch {
    // quota exceeded
  }
}

export function markLocalConnectionsSeen(): void {
  if (typeof window === "undefined") return;
  try {
    const list = loadLocalConnections();
    const updated = list.map((c) => ({ ...c, seen: true }));
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function localUnseenCount(): number {
  return loadLocalConnections().filter((c) => !c.seen).length;
}

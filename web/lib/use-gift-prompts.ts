"use client";

import { useEffect, useState } from "react";
import { loadProfile } from "@/lib/onboarding";
import {
  type ImportantEvent,
  type Recipient,
  EVENT_TYPE_META,
  RELATION_META,
  upcomingEvents,
  relationFor,
} from "@/lib/events";
import { PRODUCTS, type Product } from "@/lib/data";

// Default reminder threshold in days. Each event can override via
// `reminderLeadDays`; this is the fallback when no per-event value is set.
const DEFAULT_LEAD_DAYS = 7;

// Deterministic hash so suggestion order stays stable across recomputations.
function stableJitter(eventId: string, productId: string): number {
  let h = 0;
  const key = `${eventId}:${productId}`;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  return (((h >>> 0) % 1000) / 1000) * 0.5;
}

export type GiftSuggestion = {
  product: Product;
  reason: string;
};

export type GiftPrompt = {
  event: ImportantEvent;
  recipient: Recipient | undefined;
  daysUntil: number;
  eventLabel: string;
  eventEmoji: string;
  recipientName: string;
  suggestions: GiftSuggestion[];
  shopHref: string;
};

/**
 * Suggest products for an upcoming event based on budget and recipient
 * interests. Uses a simple heuristic: filter by budget, prefer products whose
 * vibes overlap with the recipient's interest tags, then pick the top N.
 */
function suggestGifts(
  event: ImportantEvent,
  recipient: Recipient | undefined,
  count = 3,
): GiftSuggestion[] {
  const interests = new Set(recipient?.interests ?? []);
  const budget = event.budget;

  // Tag-to-vibe loose mapping so interest tags from onboarding can match
  // the product vibe system in recommend.ts.
  const TAG_VIBE: Record<string, string[]> = {
    cozy: ["cozy", "warm"],
    minimalist: ["minimal", "calm"],
    vintage: ["retro", "film"],
    luxury: ["luxe"],
    wellness: ["wellness", "calm"],
    photography: ["film", "retro"],
    "coffee-tea": ["cozy", "kitchen"],
    candles: ["cozy", "home", "warm"],
    stationery: ["stationery", "minimal"],
    "pop-culture": ["music", "retro"],
    foodie: ["kitchen"],
  };

  const targetVibes = new Set<string>();
  for (const tag of interests) {
    for (const v of TAG_VIBE[tag] ?? []) targetVibes.add(v);
  }

  // Lightweight vibe tags per product (mirrors PRODUCT_META in recommend.ts).
  const PRODUCT_VIBES: Record<string, string[]> = {
    camera: ["film", "retro", "tech"],
    matcha: ["cozy", "wellness", "kitchen"],
    candle: ["cozy", "home", "calm", "warm"],
    perfume: ["luxe", "romantic", "beauty"],
    vinyl: ["music", "retro", "cozy"],
    lamp: ["cozy", "home", "warm", "tech"],
    journal: ["minimal", "stationery", "calm"],
    buds: ["tech", "music", "minimal"],
  };

  const scored = PRODUCTS.map((product) => {
    let score = 0;
    // Budget fit
    if (budget && product.price <= budget) score += 2;
    if (budget && product.price > budget) score -= 1;
    // Interest / vibe overlap
    const vibes = PRODUCT_VIBES[product.id] ?? [];
    for (const v of vibes) {
      if (targetVibes.has(v)) score += 1;
    }
    // Deterministic jitter for variety (stable across recomputations)
    score += stableJitter(event.id, product.id);
    return { product, score };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  return scored.map(({ product }) => {
    const vibes = PRODUCT_VIBES[product.id] ?? [];
    const matchedVibe = vibes.find((v) => targetVibes.has(v));
    let reason = "Great gift idea";
    if (matchedVibe) {
      reason = `Matches their ${matchedVibe} style`;
    } else if (budget && product.price <= budget) {
      reason = `Within $${budget} budget`;
    }
    return { product, reason };
  });
}

function buildShopHref(
  event: ImportantEvent,
  recipient: Recipient | undefined,
): string {
  const params = new URLSearchParams();
  if (recipient?.id) params.set("rid", recipient.id);
  const recipientKey = recipient
    ? RELATION_META[recipient.relation]?.recipientKey
    : undefined;
  if (recipientKey && recipientKey !== "anyone")
    params.set("recipient", recipientKey);
  const occasion = EVENT_TYPE_META[event.type]?.occasion;
  if (occasion && occasion !== "any") params.set("occasion", occasion);
  if (event.budget) params.set("budget", String(event.budget));
  if (recipient?.sourceUser) params.set("sourceUser", recipient.sourceUser);
  if (recipient?.name) params.set("name", recipient.name);
  return `/feed/ideas${params.toString() ? `?${params.toString()}` : ""}`;
}

/**
 * Returns all events within their reminder window (each event's
 * `reminderLeadDays`, falling back to `defaultLeadDays`), enriched with
 * gift suggestions and UI-ready metadata. Re-computes when the profile
 * changes or another tab updates localStorage.
 */
export function useGiftPrompts(defaultLeadDays = DEFAULT_LEAD_DAYS): GiftPrompt[] {
  const [prompts, setPrompts] = useState<GiftPrompt[]>([]);

  useEffect(() => {
    const compute = () => {
      const p = loadProfile();
      if (!p?.eventLoggingEnabled) {
        setPrompts([]);
        return;
      }
      const events: ImportantEvent[] = p.events ?? [];
      const recipients: Recipient[] = p.recipients ?? [];
      if (events.length === 0) {
        setPrompts([]);
        return;
      }

      // Get all events within the widest possible lead window (90 days) and
      // then filter per-event by their own reminderLeadDays threshold.
      const upcoming = upcomingEvents(events, 90);
      const result: GiftPrompt[] = [];

      for (const { event, days } of upcoming) {
        const threshold = event.reminderLeadDays > 0
          ? event.reminderLeadDays
          : defaultLeadDays;
        if (days > threshold) continue;

        const recipient = relationFor(event, recipients);
        const meta = EVENT_TYPE_META[event.type];
        result.push({
          event,
          recipient,
          daysUntil: days,
          eventLabel: meta?.label ?? "Upcoming event",
          eventEmoji: meta?.emoji ?? "🎁",
          recipientName: recipient?.name ?? "Someone",
          suggestions: suggestGifts(event, recipient),
          shopHref: buildShopHref(event, recipient),
        });
      }

      setPrompts(result);
    };

    compute();
    window.addEventListener("giftmaxxing:profile", compute);
    window.addEventListener("storage", compute);
    return () => {
      window.removeEventListener("giftmaxxing:profile", compute);
      window.removeEventListener("storage", compute);
    };
  }, [defaultLeadDays]);

  return prompts;
}

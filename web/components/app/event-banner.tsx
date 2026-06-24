"use client";

import Link from "next/link";
import { useEventContext } from "@/lib/use-event-context";
import { EVENT_TYPE_META } from "@/lib/events";

// Feed personalization surface: shows the next upcoming logged event with a
// countdown and routes to gift ideas filtered by that recipient/occasion/budget
// (the recommender + bundles already accept these params). Renders nothing when
// there's no upcoming event.
export function EventBanner() {
  const ctx = useEventContext();
  if (!ctx || ctx.eventInDays == null) return null;

  const days = ctx.eventInDays;
  const meta = ctx.eventType ? EVENT_TYPE_META[ctx.eventType] : undefined;
  const who = ctx.recipientName ?? "someone";
  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;

  const params = new URLSearchParams();
  if (ctx.recipientId) params.set("rid", ctx.recipientId);
  if (ctx.recipient) params.set("recipient", ctx.recipient);
  if (ctx.occasion) params.set("occasion", ctx.occasion);
  if (ctx.budget) params.set("budget", String(ctx.budget));
  if (ctx.sourceUser) params.set("sourceUser", ctx.sourceUser);
  if (ctx.recipientName) params.set("name", ctx.recipientName);
  const href = `/feed/ideas${params.toString() ? `?${params.toString()}` : ""}`;

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-coral/30 bg-coral-soft/50 p-4 transition-colors hover:bg-coral-soft"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm">
          {meta?.emoji ?? "🎁"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">
            {meta?.label ?? "Upcoming"} for {who} · {when}
          </p>
          <p className="truncate text-xs text-ink-soft">
            Maxi lined up gifts they&apos;ll love
            {ctx.budget ? ` under $${ctx.budget}` : ""} →
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-white">
          Shop gifts
        </span>
      </div>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { Icons } from "@/components/ui";
import { useGiftPrompts, type GiftPrompt } from "@/lib/use-gift-prompts";

function urgencyLabel(days: number): string {
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow!";
  return `${days} days away`;
}

function urgencyClasses(days: number): string {
  if (days <= 2) return "border-red-300 bg-red-50";
  if (days <= 5) return "border-coral/30 bg-coral-soft/50";
  return "border-amber-200 bg-amber-50";
}

function badgeClasses(days: number): string {
  if (days <= 2) return "bg-red-100 text-red-700";
  if (days <= 5) return "bg-coral-soft text-coral-ink";
  return "bg-amber-100 text-amber-700";
}

function SinglePromptCard({ prompt }: { prompt: GiftPrompt }) {
  const { daysUntil, eventLabel, eventEmoji, recipientName, suggestions, shopHref } = prompt;

  return (
    <div className={`overflow-hidden rounded-2xl border ${urgencyClasses(daysUntil)}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm">
          {eventEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">
            {eventLabel} for {recipientName}
          </p>
          <p className="text-xs text-ink-soft">
            {daysUntil <= 2
              ? "Last chance to find the perfect gift!"
              : "Start shopping early for the perfect gift"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${badgeClasses(daysUntil)}`}>
          {urgencyLabel(daysUntil)}
        </span>
      </div>

      {/* Gift suggestions */}
      {suggestions.length > 0 && (
        <div className="border-t border-line/50 bg-white/60 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-ink-soft">
            <Icons.gift size={12} className="mr-1 inline-block" />
            Gift ideas for {recipientName}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.map(({ product, reason }) => (
              <Link
                key={product.id}
                href={shopHref}
                className="flex min-w-[140px] shrink-0 flex-col rounded-xl border border-line bg-surface p-3 transition-shadow hover:shadow-md"
              >
                <span className="mb-1 text-2xl">{product.emoji}</span>
                <span className="text-xs font-bold text-ink line-clamp-1">{product.name}</span>
                <span className="text-[11px] text-ink-soft">{product.brand}</span>
                <span className="mt-1 text-xs font-bold text-coral">${product.price}</span>
                <span className="mt-0.5 text-[10px] text-ink-faint line-clamp-1">{reason}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between border-t border-line/50 bg-white/40 px-4 py-3">
        <p className="text-xs text-ink-soft">
          {prompt.event.budget ? `Budget: $${prompt.event.budget}` : "Find the perfect gift"}
        </p>
        <Link
          href={shopHref}
          className="flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          <Icons.gift size={14} />
          Shop gifts
        </Link>
      </div>
    </div>
  );
}

/**
 * Renders reminder cards for all events within their reminder window.
 * Drop this into the feed page or events page — it handles its own data
 * loading and renders nothing when there are no imminent events.
 */
export function GiftPromptCards() {
  const prompts = useGiftPrompts();
  if (prompts.length === 0) return null;

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => (
        <SinglePromptCard key={prompt.event.id} prompt={prompt} />
      ))}
    </div>
  );
}

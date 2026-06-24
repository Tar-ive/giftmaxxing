"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GRADIENTS } from "@/lib/data";
import { Icons } from "@/components/ui";
import { shortTitle } from "@/lib/feed-builder";
import { loadProfile, INTEREST_META, type InterestTag } from "@/lib/onboarding";
import {
  EVENT_TYPE_META,
  RELATION_META,
  formatEventDate,
  nextUpcomingEvent,
  daysUntil,
  type Recipient,
  type ImportantEvent,
} from "@/lib/events";
import { picksForInterests } from "@/lib/recipient-picks";
import { type Pin } from "@/lib/pins";

type Resolved = { recipient: Recipient; event: ImportantEvent | null; days: number | null };

// Personalized header for /feed/ideas when shopping for a specific saved
// recipient: shows who + their occasion/date/countdown/budget, recommends
// sending them the swipe challenge to learn their exact taste, and surfaces a
// "Picked for <name>" grid derived from their saved interests. Renders nothing
// when no recipient id resolves (the generic explorer takes over).
export function RecipientShopHeader({ recipientId }: { recipientId?: string }) {
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    const compute = (): Resolved | null => {
      if (!recipientId) return null;
      const p = loadProfile();
      const recipient = p?.recipients?.find((r) => r.id === recipientId) ?? null;
      if (!recipient) return null;
      const events = (p?.events ?? []).filter((e) => e.recipientId === recipientId);
      const event = nextUpcomingEvent(events);
      return { recipient, event, days: event ? daysUntil(event) : null };
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolved(compute());
  }, [recipientId]);

  if (!resolved) return null;
  const { recipient, event, days } = resolved;
  const first = recipient.name.split(/\s+/)[0];
  const occMeta = event ? EVENT_TYPE_META[event.type] : null;
  const relMeta = RELATION_META[recipient.relation];
  const when = days == null ? null : days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  const interests = (recipient.interests ?? []) as InterestTag[];
  const picks = picksForInterests(recipient.interests ?? [], 6);

  // Subtitle: "Birthday · Jun 30 · in 32 days · under $100" (only known parts).
  const sub = [
    occMeta?.label,
    event ? formatEventDate(event) : null,
    when,
    event?.budget ? `under $${event.budget}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Prefilled swipe-challenge link so the sender can invite this exact person.
  const swipeParams = new URLSearchParams({ to: recipient.name });
  if (event) {
    swipeParams.set("occasion", event.type);
    if (event.date) swipeParams.set("date", event.date);
  }
  const swipeHref = `/feed/swipe?${swipeParams.toString()}`;

  return (
    <section className="mb-8">
      {/* Who + occasion */}
      <div className="rounded-3xl border border-coral/25 bg-coral-soft/40 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm">
            {occMeta?.emoji ?? relMeta.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-coral">Shopping for</p>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
              {recipient.name}
            </h1>
            {sub && <p className="mt-0.5 truncate text-sm font-medium text-ink-soft">{sub}</p>}
          </div>
        </div>
        {interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {interests.slice(0, 6).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-ink-soft"
              >
                <span>{INTEREST_META[t]?.emoji}</span>
                {INTEREST_META[t]?.label ?? t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recommend: send the swipe challenge to learn their taste */}
      <Link
        href={swipeHref}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-coral-soft/40"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-coral text-white">
          <Icons.heartFill size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            {interests.length > 0
              ? `Want spot-on picks for ${first}?`
              : `Not sure what ${first} likes?`}
          </p>
          <p className="text-xs text-ink-soft">
            {`Send ${first} a 30-second swipe challenge — you'll learn their exact taste, and they never sign up.`}
          </p>
        </div>
        <Icons.arrow size={18} className="shrink-0 text-ink-faint" />
      </Link>

      {/* Picked for <name> from their saved interests */}
      {picks.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-soft">
            <Icons.sparkle size={16} className="text-coral" /> Picked for {first}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {picks.map((p) => (
              <PickCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PickCard({ p }: { p: Pin }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover-lift block overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <div className="relative aspect-square w-full" style={{ background: GRADIENTS[p.grad] }}>
        <span className="absolute inset-0 grid place-items-center text-4xl">{p.emoji}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt={p.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
      <div className="p-2.5">
        <p className="line-clamp-1 text-xs font-semibold text-ink">{shortTitle(p.title)}</p>
        <p className="mt-0.5 text-xs text-ink-faint">{p.price ? `$${p.price}` : p.brand}</p>
      </div>
    </a>
  );
}

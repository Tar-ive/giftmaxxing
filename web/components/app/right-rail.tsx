"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { useCurrentUser } from "@/lib/identity";
import { Avatar, Icons } from "@/components/ui";
import { useMaxi } from "@/components/app/maxi-provider";
import {
  type Milestone,
  CATEGORY_META,
  DEMO_MILESTONES,
  loadMilestones,
  activeMilestones,
} from "@/lib/milestones";
import { loadProfile } from "@/lib/onboarding";
import {
  type ImportantEvent,
  EVENT_TYPE_META,
  upcomingEvents,
  formatEventDate,
} from "@/lib/events";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function RightRail() {
  const { open, cartOpen } = useMaxi();
  const me = useCurrentUser();
  // With a right-hand pane open (Maxi chat or cart drawer) there's only room for
  // the events column on the widest screens, so show it from xl then.
  const paneOpen = open || cartOpen;

  // Lightweight, client-only previews for the Events widget below (localStorage +
  // onboarding profile — no API call). Personal = active milestones; Shared =
  // upcoming occasions from the user's recipients.
  const [active, setActive] = useState<Milestone[]>([]);
  const [upcoming, setUpcoming] = useState<{ event: ImportantEvent; days: number }[]>([]);

  useEffect(() => {
    const stored = loadMilestones();
    const ms = activeMilestones(stored.length ? stored : DEMO_MILESTONES);
    const profile = loadProfile();
    const up = profile ? upcomingEvents(profile.events ?? [], 365) : [];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(ms);
    setUpcoming(up);
  }, []);

  return (
    <aside
      className={`sticky top-6 hidden h-fit w-80 shrink-0 pt-2 ${
        paneOpen ? "xl:block" : "lg:block"
      }`}
    >
      {/* current user — combined profile · account · settings */}
      <div className="rounded-2xl border border-line bg-surface/60 p-3">
        <div className="flex items-center gap-3">
          <Link href="/feed/you" className="shrink-0">
            <Avatar grad={me.grad} label={me.name} size={48} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href="/feed/you" className="block truncate text-sm font-bold text-ink hover:underline">
              {me.handle}
            </Link>
            <p className="truncate text-sm text-ink-faint">{me.name}</p>
          </div>
          <Link href="/" className="shrink-0 text-xs font-bold text-coral hover:opacity-80">
            Switch
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs font-semibold">
          <div className="flex items-center gap-1">
            <Link href="/feed/you" className="rounded-lg px-2 py-1.5 text-ink-soft transition-colors hover:bg-ink/5">
              Profile
            </Link>
            <Link href="/feed/settings" className="rounded-lg px-2 py-1.5 text-ink-soft transition-colors hover:bg-ink/5">
              Settings
            </Link>
          </div>
          {clerkEnabled && (
            <Show when="signed-in">
              <UserButton />
            </Show>
          )}
        </div>
      </div>

      {/* maxi nudge */}
      <Link
        href="/feed/maxi"
        className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-coral-soft/60 p-3"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-lg">🎁</span>
        <p className="text-[13px] leading-snug text-ink">
          <span className="font-bold">Maxi:</span> Maya&apos;s birthday is in 4 days — I lined up 7 ideas in your budget.
        </p>
      </Link>

      {/* events — personal (milestones) + shared (upcoming occasions). Each card
          links into the full Events page on its matching tab. */}
      <div className="mt-6 flex items-center justify-between px-2">
        <span className="text-sm font-bold text-ink-soft">Events</span>
        <Link
          href="/feed/events"
          className="text-xs font-bold text-ink transition-colors hover:text-coral"
        >
          See all
        </Link>
      </div>

      <div className="mt-2 space-y-2.5">
        {/* Personal */}
        <Link
          href="/feed/events?tab=personal"
          className="block rounded-2xl border border-line bg-surface/60 p-3 transition-colors hover:border-coral/40 hover:bg-coral-soft/30"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold text-ink">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-coral-soft text-coral">
                <Icons.calendar size={15} />
              </span>
              Personal
            </span>
            <span className="flex items-center gap-0.5 text-xs font-semibold text-ink-faint">
              {active.length} active
              <Icons.chevronR size={14} />
            </span>
          </div>
          {active.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {active.slice(0, 2).map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-xs text-ink-soft">
                  <span className="shrink-0">{CATEGORY_META[m.category].emoji}</span>
                  <span className="min-w-0 flex-1 truncate">{m.title}</span>
                  <span className="shrink-0 font-semibold text-ink-faint">${m.rewardBudget}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-ink-faint">
              Set a milestone and earn a reward when you hit it.
            </p>
          )}
        </Link>

        {/* Shared */}
        <Link
          href="/feed/events?tab=shared"
          className="block rounded-2xl border border-line bg-surface/60 p-3 transition-colors hover:border-coral/40 hover:bg-coral-soft/30"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold text-ink">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-lilac/20 text-coral">
                <Icons.users size={15} />
              </span>
              Shared
            </span>
            <span className="flex items-center gap-0.5 text-xs font-semibold text-ink-faint">
              {upcoming.length} upcoming
              <Icons.chevronR size={14} />
            </span>
          </div>
          {upcoming.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {upcoming.slice(0, 2).map(({ event, days }) => {
                const meta = EVENT_TYPE_META[event.type];
                return (
                  <li key={event.id} className="flex items-center gap-2 text-xs text-ink-soft">
                    <span className="shrink-0">{meta.emoji}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {meta.label} · {formatEventDate(event)}
                    </span>
                    <span className="shrink-0 font-semibold text-ink-faint">
                      {days === 0 ? "Today" : days === 1 ? "1d" : `${days}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-ink-faint">
              Add recipients or send swipe challenges to see shared dates.
            </p>
          )}
        </Link>
      </div>

      <p className="mt-6 px-2 text-xs leading-relaxed text-ink-faint">
        About · Help · Press · API · Jobs · Privacy · Terms
        <br />
        <span className="mt-3 block">© {new Date().getFullYear()} Giftmaxxing</span>
      </p>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { useMilestoneContext } from "@/lib/use-milestone-context";
import { CATEGORY_META } from "@/lib/milestones";

// Feed surface: shows unclaimed milestone rewards or active milestone progress.
// Renders nothing when there are no milestones.
export function MilestoneBanner() {
  const ctx = useMilestoneContext();
  if (!ctx) return null;

  // Unclaimed rewards take priority
  if (ctx.unclaimedCount > 0 && ctx.nextUnclaimed) {
    const meta = CATEGORY_META[ctx.nextUnclaimed.category];
    return (
      <Link
        href="/feed/milestones?tab=rewards"
        className="block rounded-2xl border border-green-200 bg-green-50 p-4 transition-colors hover:bg-green-100"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm">
            🏆
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">
              You earned ${ctx.totalBudget} in self-gifts!
            </p>
            <p className="truncate text-xs text-ink-soft">
              {ctx.unclaimedCount} milestone{ctx.unclaimedCount !== 1 ? "s" : ""}{" "}
              completed — {meta.emoji} {ctx.nextUnclaimed.title}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-green-600 px-3 py-1.5 text-xs font-bold text-white">
            Claim
          </span>
        </div>
      </Link>
    );
  }

  // Active milestones nudge
  if (ctx.activeCount > 0) {
    return (
      <Link
        href="/feed/milestones"
        className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-ink/5"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-coral-soft text-2xl shadow-sm">
            🎯
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">
              {ctx.activeCount} active milestone{ctx.activeCount !== 1 ? "s" : ""}
            </p>
            <p className="truncate text-xs text-ink-soft">
              Keep going — rewards are waiting when you finish
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-cream">
            View
          </span>
        </div>
      </Link>
    );
  }

  return null;
}

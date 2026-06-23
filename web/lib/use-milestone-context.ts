"use client";

import { useEffect, useState } from "react";
import {
  type Milestone,
  loadMilestones,
  unclaimedRewards,
  totalRewardBudget,
  activeMilestones,
} from "@/lib/milestones";

export type MilestoneContext = {
  unclaimedCount: number;
  totalBudget: number;
  nextUnclaimed: Milestone | null;
  activeCount: number;
};

// Resolves the user's milestone state for feed integration. Re-computes on
// storage events (cross-tab) and a custom event for in-tab updates.
export function useMilestoneContext(): MilestoneContext | null {
  const [ctx, setCtx] = useState<MilestoneContext | null>(null);

  useEffect(() => {
    const compute = () => {
      const all = loadMilestones();
      if (all.length === 0) {
        setCtx(null);
        return;
      }
      const unclaimed = unclaimedRewards(all);
      setCtx({
        unclaimedCount: unclaimed.length,
        totalBudget: totalRewardBudget(all),
        nextUnclaimed: unclaimed[0] ?? null,
        activeCount: activeMilestones(all).length,
      });
    };

    compute();
    window.addEventListener("giftmaxxing:milestones", compute);
    window.addEventListener("storage", compute);
    return () => {
      window.removeEventListener("giftmaxxing:milestones", compute);
      window.removeEventListener("storage", compute);
    };
  }, []);

  return ctx;
}

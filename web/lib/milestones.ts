// ────────────────────────────────────────────────────────────────────────────
// Milestones — self-gifting goals with reward budgets.
//
// Users set personal milestones (e.g. "finish hackathon project", "hit 5k run")
// and attach a reward budget. When the milestone is marked complete, the user
// can treat themselves OR Maxi auto-orders a gift within their budget.
//
// Persistence: localStorage (same pattern as onboarding.ts). Mirrors to the
// DynamoDB `milestones` table once signed in via lib/api.ts.
// ────────────────────────────────────────────────────────────────────────────

import { genId } from "@/lib/events";

export type MilestoneStatus = "active" | "completed" | "expired";

export type RewardMode = "self-order" | "auto-gift" | "either";

export type MilestoneCategory =
  | "career"
  | "fitness"
  | "learning"
  | "creative"
  | "travel"
  | "social"
  | "finance"
  | "wellness"
  | "other";

export type Milestone = {
  id: string;
  title: string;
  description?: string;
  category: MilestoneCategory;
  status: MilestoneStatus;
  rewardMode: RewardMode;
  rewardBudget: number; // dollar amount the user earns on completion
  rewardNote?: string; // e.g. "Go shopping for $100" or "Travel somewhere"
  targetDate?: string; // optional ISO "YYYY-MM-DD" deadline
  createdAt: number; // epoch ms
  completedAt?: number; // epoch ms when marked done
  giftOrderedAt?: number; // epoch ms when reward was claimed/auto-ordered
  giftProductId?: string; // product that was ordered as reward (links to feed)
};

export const CATEGORY_META: Record<
  MilestoneCategory,
  { label: string; emoji: string }
> = {
  career: { label: "Career & Work", emoji: "💼" },
  fitness: { label: "Fitness & Health", emoji: "🏃" },
  learning: { label: "Learning & Skills", emoji: "📖" },
  creative: { label: "Creative Projects", emoji: "🎨" },
  travel: { label: "Travel & Adventure", emoji: "✈️" },
  social: { label: "Social & Relationships", emoji: "🤝" },
  finance: { label: "Finance & Saving", emoji: "💰" },
  wellness: { label: "Wellness & Self-care", emoji: "🧘" },
  other: { label: "Other", emoji: "⭐" },
};

export const REWARD_MODE_META: Record<
  RewardMode,
  { label: string; desc: string; emoji: string }
> = {
  "self-order": {
    label: "I'll pick my gift",
    desc: "Browse and choose your own reward when you hit the milestone",
    emoji: "🛍️",
  },
  "auto-gift": {
    label: "Maxi picks for me",
    desc: "Maxi auto-selects a gift based on your taste profile",
    emoji: "🎁",
  },
  either: {
    label: "Surprise me or I'll pick",
    desc: "Maxi suggests options — you can accept or browse yourself",
    emoji: "✨",
  },
};

// ── Persistence (localStorage) ────────────────────────────────────────────────

const STORAGE_KEY = "giftmaxxing_milestones";

export function loadMilestones(): Milestone[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMilestones(milestones: Milestone[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(milestones));
    window.dispatchEvent(new Event("giftmaxxing:milestones"));
    return true;
  } catch {
    return false;
  }
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────

export function createMilestone(
  data: Omit<Milestone, "id" | "status" | "createdAt">
): Milestone {
  return {
    ...data,
    id: genId("ms"),
    status: "active",
    createdAt: Date.now(),
  };
}

export function completeMilestone(milestone: Milestone): Milestone {
  return { ...milestone, status: "completed", completedAt: Date.now() };
}

export function claimReward(
  milestone: Milestone,
  productId?: string
): Milestone {
  return {
    ...milestone,
    giftOrderedAt: Date.now(),
    giftProductId: productId,
  };
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export function activeMilestones(milestones: Milestone[]): Milestone[] {
  return milestones.filter((m) => m.status === "active");
}

export function completedMilestones(milestones: Milestone[]): Milestone[] {
  return milestones
    .filter((m) => m.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export function unclaimedRewards(milestones: Milestone[]): Milestone[] {
  return milestones.filter(
    (m) => m.status === "completed" && !m.giftOrderedAt
  );
}

export function totalRewardBudget(milestones: Milestone[]): number {
  return unclaimedRewards(milestones).reduce(
    (sum, m) => sum + m.rewardBudget,
    0
  );
}

// Is the milestone past its target date without completion?
export function isOverdue(milestone: Milestone): boolean {
  if (!milestone.targetDate || milestone.status !== "active") return false;
  const days = daysRemaining(milestone);
  return days !== null && days < 0;
}

// Days remaining until target date (null if no deadline)
export function daysRemaining(milestone: Milestone): number | null {
  if (!milestone.targetDate) return null;
  const target = new Date(milestone.targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

// ── Demo data (for development / first-time experience) ───────────────────────

export const DEMO_MILESTONES: Milestone[] = [
  {
    id: "ms_demo_1",
    title: "Finish hackathon project",
    description: "Ship the MVP at the weekend hackathon and present to judges",
    category: "career",
    status: "active",
    rewardMode: "self-order",
    rewardBudget: 100,
    rewardNote: "Shopping spree — treat myself to something nice",
    targetDate: "2026-06-28",
    createdAt: Date.now() - 86_400_000 * 2,
  },
  {
    id: "ms_demo_2",
    title: "Run a half marathon",
    description: "Complete a 21km race under 2 hours",
    category: "fitness",
    status: "active",
    rewardMode: "auto-gift",
    rewardBudget: 150,
    rewardNote: "New running shoes or gear",
    targetDate: "2026-08-15",
    createdAt: Date.now() - 86_400_000 * 10,
  },
  {
    id: "ms_demo_3",
    title: "Read 12 books this year",
    description: "One book per month — fiction and non-fiction mix",
    category: "learning",
    status: "completed",
    rewardMode: "either",
    rewardBudget: 50,
    rewardNote: "A beautiful hardcover collector's edition",
    createdAt: Date.now() - 86_400_000 * 60,
    completedAt: Date.now() - 86_400_000 * 3,
  },
];

// Client data layer for the Reddit-mined gift-knowledge API (infra/).
//   GET /recipients          -> recipients for the picker (label + counts)
//   GET /ideas?recipient=mom -> ranked gift ideas + co-occurrence bundles
//
// Reddit is the KNOWLEDGE source: these are gift *concepts* people actually
// recommend for each recipient (with real comment quotes), not a product feed.
import { API_BASE, isApiConfigured } from "@/lib/api";
import type { Grad } from "@/lib/data";

export { isApiConfigured };

export type IdeaExample = { title?: string; url?: string; score?: number; quote?: string };

export type Idea = {
  key: string;
  label: string;
  emoji: string;
  category: string;
  count: number;
  weight: number;
  examples: IdeaExample[];
};

export type BundleItem = { key: string; label: string; emoji: string };
export type Bundle = { items: BundleItem[]; score: number; why: string };

export type RecipientKnowledge = {
  recipient: string;
  label: string;
  postCount: number;
  ideas: Idea[];
  bundles: Bundle[];
};

export type RecipientSummary = {
  recipient: string;
  label: string;
  postCount: number;
  ideaCount: number;
};

export async function fetchRecipients(): Promise<RecipientSummary[]> {
  const res = await fetch(`${API_BASE}/recipients`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`/recipients -> HTTP ${res.status}`);
  const data = (await res.json()) as { items?: RecipientSummary[] };
  return data.items ?? [];
}

export async function fetchIdeas(recipient: string): Promise<RecipientKnowledge> {
  const res = await fetch(`${API_BASE}/ideas?recipient=${encodeURIComponent(recipient)}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`/ideas -> HTTP ${res.status}`);
  return (await res.json()) as RecipientKnowledge;
}

// Map a gift category to one of the app's product gradients (stable per category).
const CATEGORY_GRAD: Record<string, Grad> = {
  tech: "sky",
  home: "sage",
  kitchen: "butter",
  beauty: "rose",
  jewelry: "lilac",
  fashion: "peach",
  books: "butter",
  games: "sky",
  music: "lilac",
  art_handmade: "rose",
  food: "peach",
  drinkware: "coral",
  experience: "coral",
  fitness: "sage",
  outdoors: "sage",
  personalized: "lilac",
};
const GRAD_CYCLE: Grad[] = ["peach", "rose", "butter", "lilac", "sky", "sage", "coral"];

export function gradFor(category: string, i = 0): Grad {
  return CATEGORY_GRAD[category] ?? GRAD_CYCLE[i % GRAD_CYCLE.length];
}

// Friendly category label for the pill on each idea card.
export const categoryLabel = (c: string) =>
  ({ art_handmade: "handmade", drinkware: "drinks" } as Record<string, string>)[c] ?? c;

// Recipient -> emoji for the picker chips.
const RECIPIENT_EMOJI: Record<string, string> = {
  mom: "🌷", dad: "🧰", wife: "💍", husband: "🎯",
  girlfriend: "💕", boyfriend: "💙", partner: "💞", couple: "💑",
  sister: "🌸", brother: "🎮", daughter: "🎀", son: "⚽",
  parents: "🏡", grandma: "🧶", grandpa: "📻", kids: "🧸", teen: "🎧",
  friend: "🤝", coworker: "💼", teacher: "🍎", men: "🧔", women: "💃",
};
export const recipientEmoji = (r: string) => RECIPIENT_EMOJI[r] ?? "🎁";

// Group-gift fundraising pools — chip in toward one bigger gift for someone's
// birthday, graduation, farewell, etc. Persisted in localStorage (demo; no real
// payments). Seeded with a few live-looking pools on first load.
import type { Grad } from "@/lib/data";

export type Contribution = { id: string; name: string; amount: number; at: number };

export type Fundraiser = {
  id: string;
  title: string;
  recipient: string;
  occasion: string;
  blurb: string;
  emoji: string;
  grad: Grad;
  image?: string | null;
  goal: number;
  organizer: string;
  contributions: Contribution[];
  deadline?: string;
  createdAt: number;
};

const KEY = "giftmaxxing_fundraisers";

export function raisedOf(f: Fundraiser): number {
  return f.contributions.reduce((s, c) => s + c.amount, 0);
}
export function progressOf(f: Fundraiser): number {
  return Math.min(1, raisedOf(f) / f.goal);
}

function seed(): Fundraiser[] {
  const now = Date.now();
  return [
    {
      id: "f_sam_farewell",
      title: "Sam's send-off to Lisbon",
      recipient: "sam",
      occasion: "Farewell",
      blurb: "Sam's moving abroad 🛫 Let's pool for noise-cancelling buds + a travel kit so the flights fly by.",
      emoji: "🎧",
      grad: "sky",
      image: "https://i.pinimg.com/736x/a4/9a/b8/a49ab809bcdf24e7fcdd5c6c63212a6e.jpg",
      goal: 240,
      organizer: "jules",
      deadline: "5 days left",
      createdAt: now - 86400000 * 2,
      contributions: [
        { id: "c1", name: "jules", amount: 40, at: now - 86400000 * 2 },
        { id: "c2", name: "maya", amount: 35, at: now - 86400000 },
        { id: "c3", name: "theo", amount: 50, at: now - 43200000 },
        { id: "c4", name: "noor", amount: 40, at: now - 3600000 },
      ],
    },
    {
      id: "f_theo_grad",
      title: "Theo's graduation vinyl setup",
      recipient: "theo",
      occasion: "Graduation",
      blurb: "Our favorite vinyl hoarder is graduating 🎓 Let's get the turntable upgrade he keeps talking about.",
      emoji: "🎶",
      grad: "lilac",
      image: "https://i.pinimg.com/736x/c7/57/5c/c7575cefa0b1ebe104e1f3fe6bf42803.jpg",
      goal: 300,
      organizer: "ivy",
      deadline: "12 days left",
      createdAt: now - 86400000 * 4,
      contributions: [
        { id: "c1", name: "ivy", amount: 60, at: now - 86400000 * 4 },
        { id: "c2", name: "remy", amount: 45, at: now - 86400000 * 3 },
        { id: "c3", name: "maya", amount: 50, at: now - 86400000 },
        { id: "c4", name: "sam", amount: 55, at: now - 7200000 },
      ],
    },
    {
      id: "f_maya_bday",
      title: "Maya's birthday camera fund",
      recipient: "maya",
      occasion: "Birthday",
      blurb: "Maya's deep in her film-photo era 📸 Let's get her the instant camera she's been saving.",
      emoji: "📷",
      grad: "rose",
      image: "https://i.pinimg.com/736x/ca/a1/45/caa145a8291aa5cb72df9df760062b0d.jpg",
      goal: 180,
      organizer: "you",
      deadline: "4 days left",
      createdAt: now - 86400000,
      contributions: [
        { id: "c1", name: "noor", amount: 30, at: now - 86400000 },
        { id: "c2", name: "jules", amount: 25, at: now - 43200000 },
      ],
    },
  ];
}

export function loadFundraisers(): Fundraiser[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Fundraiser[]) : seed();
  } catch {
    return seed();
  }
}

export function saveFundraisers(list: Fundraiser[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function addContribution(list: Fundraiser[], id: string, name: string, amount: number): Fundraiser[] {
  return list.map((f) =>
    f.id === id
      ? { ...f, contributions: [...f.contributions, { id: `c${Date.now()}`, name: name || "you", amount, at: Date.now() }] }
      : f
  );
}

export function newFundraiser(input: {
  title: string;
  recipient?: string;
  occasion: string;
  blurb: string;
  goal: number;
  emoji?: string;
  grad?: Grad;
  image?: string | null;
  organizer?: string;
}): Fundraiser {
  return {
    id: `f_${Date.now()}`,
    title: input.title,
    recipient: input.recipient ?? "",
    occasion: input.occasion,
    blurb: input.blurb,
    emoji: input.emoji ?? "🎁",
    grad: input.grad ?? "coral",
    image: input.image ?? null,
    goal: Math.max(10, Math.round(input.goal)),
    organizer: input.organizer ?? "you",
    deadline: "14 days left",
    createdAt: Date.now(),
    contributions: [],
  };
}

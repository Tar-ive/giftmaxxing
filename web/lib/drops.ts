// Drops — curated gift packages worth a target amount. Each package bundles a
// few real-photo pins around a theme; the "value" is the sum of item prices and
// we frame a small bundle saving. Built deterministically from the pin set.
import { PINS, type Pin } from "@/lib/pins";
import type { Grad } from "@/lib/data";

export type DropPackage = {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
  tag: string;
  grad: Grad;
  items: Pin[];
  value: number; // sum of item prices (what the bundle is "worth")
  was: number; // pre-bundle value, for the savings framing
};

type Theme = {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
  tag: string;
  grad: Grad;
  cats: string[];
  count: number;
};

const THEMES: Theme[] = [
  { id: "cozy-night", title: "Cozy Night In", blurb: "Candles, soft textures, and slow-evening energy.", emoji: "🕯️", tag: "Cozy", grad: "peach", cats: ["home", "wellness"], count: 3 },
  { id: "foodie-box", title: "The Foodie Box", blurb: "For the friend who reads recipes for fun.", emoji: "🍳", tag: "Foodie", grad: "butter", cats: ["kitchen"], count: 3 },
  { id: "plant-parent", title: "Plant Parent", blurb: "Greenery and garden joy for the nurturer.", emoji: "🌿", tag: "Plants", grad: "sage", cats: ["plants"], count: 3 },
  { id: "vintage-soul", title: "Vintage Soul", blurb: "Old-school charm with a handmade heart.", emoji: "📻", tag: "Vintage", grad: "lilac", cats: ["vintage", "art"], count: 3 },
  { id: "self-care", title: "Self-Care Sunday", blurb: "Permission to slow down and reset.", emoji: "🧘", tag: "Wellness", grad: "rose", cats: ["wellness", "home"], count: 3 },
  { id: "the-maker", title: "The Maker", blurb: "For hands that love to create.", emoji: "🎨", tag: "Creative", grad: "sky", cats: ["art"], count: 3 },
  { id: "summer-ready", title: "Summer Ready", blurb: "Sun, sand, and coastal-leaning finds.", emoji: "🌊", tag: "Travel", grad: "sky", cats: ["travel", "party"], count: 3 },
  { id: "the-fan", title: "For the Sports Fan", blurb: "Game-day gear they'll actually use.", emoji: "🏈", tag: "Sports", grad: "coral", cats: ["sports", "tech"], count: 3 },
];

function pickItems(cats: string[], count: number, usedIds: Set<string>): Pin[] {
  const out: Pin[] = [];
  for (const cat of cats) {
    for (const p of PINS) {
      if (out.length >= count) break;
      if (p.category === cat && !usedIds.has(p.id) && !out.some((o) => o.id === p.id)) out.push(p);
    }
  }
  // top up from anywhere if a theme's categories were thin
  if (out.length < count) {
    for (const p of PINS) {
      if (out.length >= count) break;
      if (!usedIds.has(p.id) && !out.some((o) => o.id === p.id)) out.push(p);
    }
  }
  out.forEach((p) => usedIds.add(p.id));
  return out.slice(0, count);
}

function build(): DropPackage[] {
  const used = new Set<string>();
  return THEMES.map((t) => {
    const items = pickItems(t.cats, t.count, used);
    const value = items.reduce((s, p) => s + p.price, 0);
    return {
      id: t.id,
      title: t.title,
      blurb: t.blurb,
      emoji: t.emoji,
      tag: t.tag,
      grad: t.grad,
      items,
      value,
      was: Math.round(value * 1.18),
    };
  });
}

export const DROPS: DropPackage[] = build();

export function getDrop(id: string): DropPackage | undefined {
  return DROPS.find((d) => d.id === id);
}

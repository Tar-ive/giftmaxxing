// Map a saved recipient's onboarding interest tags onto concrete gift picks from
// the local Pinterest catalog (lib/pins). Matches on the pin's category AND on
// keywords in its title/brand, since the catalog has only a handful of broad
// categories. Returns [] when there are no interests or nothing relevant.

import { PINS, type Pin } from "@/lib/pins";

type Rule = { cats: string[]; words: string[] };

// Keys mirror onboarding's InterestTag. `cats` are lib/pins categories; `words`
// are lowercase substrings matched against the pin title + brand.
const INTEREST_RULES: Record<string, Rule> = {
  cozy: { cats: ["home"], words: ["cozy", "blanket", "knit", "throw", "soft", "warm", "candle"] },
  minimalist: { cats: ["home", "tech"], words: ["minimal", "sleek", "simple", "modern", "clean"] },
  vintage: { cats: ["vintage"], words: ["vintage", "retro", "antique", "classic", "old school"] },
  luxury: { cats: ["jewelry"], words: ["luxury", "gold", "silver", "diamond", "elegant", "premium", "ornate"] },
  outdoors: { cats: ["travel", "sports"], words: ["outdoor", "camp", "hike", "travel", "adventure", "trail"] },
  foodie: { cats: ["kitchen"], words: ["kitchen", "cook", "chef", "food", "recipe", "bake", "gourmet"] },
  wellness: { cats: ["wellness"], words: ["wellness", "spa", "self-care", "relax", "yoga", "calm", "sleep", "bath"] },
  photography: { cats: ["tech"], words: ["camera", "photo", "lens", "film", "polaroid"] },
  sustainable: { cats: ["plants"], words: ["sustainable", "eco", "recycled", "organic", "handmade", "reusable"] },
  diy: { cats: ["art"], words: ["diy", "craft", "handmade", "kit", "make", "knit", "quilt"] },
  "pop-culture": { cats: [], words: ["movie", "game", "music", "fan", "vinyl", "anime", "comic"] },
  plants: { cats: ["plants"], words: ["plant", "garden", "succulent", "flower", "botanical", "leaf", "greenery"] },
  pets: { cats: [], words: ["pet", "dog", "cat", "puppy", "kitten", "paw"] },
  stationery: { cats: [], words: ["journal", "notebook", "pen", "paper", "stationery", "planner", "sticker"] },
  candles: { cats: ["home"], words: ["candle", "scent", "fragrance", "aroma", "wax"] },
  "coffee-tea": { cats: ["kitchen"], words: ["coffee", "tea", "matcha", "mug", "espresso", "brew"] },
};

// Rank catalog pins by how well they match the recipient's interests.
//   +2  pin.category is in a matched interest's categories
//   +1  pin title/brand contains any matched keyword
// Pins scoring 0 are dropped, so an empty/mismatched interest set yields [].
export function picksForInterests(interests: string[], n = 6): Pin[] {
  const tags = (interests ?? []).filter((t) => t in INTEREST_RULES);
  if (tags.length === 0) return [];

  const cats = new Set<string>();
  const words: string[] = [];
  for (const t of tags) {
    INTEREST_RULES[t].cats.forEach((c) => cats.add(c));
    words.push(...INTEREST_RULES[t].words);
  }

  const scored = PINS.map((p) => {
    let score = 0;
    if (cats.has(p.category)) score += 2;
    const hay = `${p.title} ${p.brand}`.toLowerCase();
    if (words.some((w) => hay.includes(w))) score += 1;
    return { p, score: score + Math.random() * 0.05 };
  }).filter((s) => s.score >= 1);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.p);
}

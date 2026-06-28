// ────────────────────────────────────────────────────────────────────────────
// Gender preferences — recipient-side filter for swipe deck personalization.
//
// The recipient toggles their gender/preference BEFORE swiping so the deck
// shows contextually relevant starting items. This is NOT assumed by the sender;
// only the recipient picks it for themselves. Stored in the invite session and
// reported back in the soft profile so Maxi can tailor future bundles.
// ────────────────────────────────────────────────────────────────────────────

export type GenderPref = "he" | "she" | "they";

export const GENDER_PREF_META: Record<GenderPref, { label: string; emoji: string; description: string }> = {
  he: { label: "He / Him", emoji: "👔", description: "Show me watches, tech, fitness gear, cologne" },
  she: { label: "She / Her", emoji: "👗", description: "Show me makeup, jewelry, dresses, designer" },
  they: { label: "They / Them", emoji: "✨", description: "Show me a curated mix of everything" },
};

// Category weight maps for each preference — higher weight = more likely to appear
// early in the deck. Neutral categories always appear.
const CATEGORY_WEIGHTS: Record<GenderPref, Record<string, number>> = {
  he: {
    tech: 5,
    sports: 5,
    wellness: 4,
    travel: 3,
    kitchen: 2,
    home: 2,
    gifts: 3,
    jewelry: 1,
    plants: 2,
    art: 2,
    vintage: 1,
  },
  she: {
    jewelry: 5,
    vintage: 4,
    home: 3,
    plants: 3,
    art: 3,
    wellness: 4,
    kitchen: 2,
    gifts: 3,
    travel: 2,
    tech: 1,
    sports: 1,
  },
  they: {
    gifts: 3,
    home: 3,
    plants: 3,
    wellness: 3,
    kitchen: 3,
    jewelry: 3,
    tech: 3,
    art: 3,
    travel: 3,
    vintage: 3,
    sports: 3,
  },
};

export function getCategoryWeight(pref: GenderPref, category: string): number {
  return CATEGORY_WEIGHTS[pref]?.[category] ?? 2;
}

// Sort pins by weight for the chosen gender preference (higher weight first,
// with randomization within the same weight tier for variety).
export function sortByGenderPref<T extends { category: string; id: string }>(
  items: T[],
  pref: GenderPref
): T[] {
  return [...items].sort((a, b) => {
    const wa = getCategoryWeight(pref, a.category);
    const wb = getCategoryWeight(pref, b.category);
    if (wa !== wb) return wb - wa;
    // Stable tie-break with hash for reproducible ordering
    return hashStr(a.id) - hashStr(b.id);
  });
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

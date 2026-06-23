// Maxi — the agentic gift companion's "brain". Pure-ish intent parsing + an
// async responder. Product search runs over the bundled Pinterest pins (real
// photos + prices); taste/visual search calls the LIVE S3 Vectors kNN endpoint
// (/recommendations vector path) and falls back to a local taste match. Cart +
// checkout are simulated (no real commerce backend).
import { PINS, type Pin } from "@/lib/pins";
import { SEED_PINS, pickSeedPins } from "@/lib/seed-pins";
import { fetchVectorRecommendations } from "@/lib/api";
import type { CartItem } from "@/lib/cart";
import { cartTotal } from "@/lib/cart";

export type MaxiReply = {
  text: string;
  pins?: Pin[];
  addPins?: Pin[]; // auto-added to the cart by this turn
  openCart?: boolean;
  checkout?: boolean;
  chips?: string[];
  source?: string; // "vector" | "facet" | "local" | "catalog"
};

export type MaxiContext = {
  lastShown: Pin[]; // products from Maxi's previous turn (for "add that to cart")
  vibes: string[]; // taste vibes derived from the user's onboarding interests
  cart: CartItem[];
  name?: string; // current user's first name, for a personal touch
};

const money = (n: number) => `$${Math.round(n)}`;

// ── parsing helpers ──────────────────────────────────────────────────────────
function parseBudget(t: string): number | null {
  const m =
    t.match(/\$\s?(\d{1,4})/) ||
    t.match(/(?:under|below|less than|max(?:imum)?|up to|within)\s+\$?(\d{1,4})/) ||
    t.match(/(\d{1,4})\s?(?:dollars|bucks|usd|\$)/);
  if (m) return Math.max(1, parseInt(m[1], 10));
  return null;
}

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  home: ["home", "cozy", "decor", "candle", "apartment", "living", "blanket"],
  kitchen: ["kitchen", "cook", "baking", "bake", "chef", "foodie", "food", "coffee", "tea"],
  plants: ["plant", "garden", "green", "flower", "botanical"],
  jewelry: ["jewelry", "jewellery", "ring", "necklace", "bracelet", "charm", "gold"],
  art: ["art", "print", "paint", "creative", "craft", "diy", "photo"],
  vintage: ["vintage", "retro", "antique", "old school", "nostalgic"],
  wellness: ["wellness", "self care", "selfcare", "spa", "relax", "sleep", "calm"],
  sports: ["sport", "fitness", "grill", "bbq", "outdoors", "dad", "hockey"],
  tech: ["tech", "gadget", "useful", "organize", "practical", "gear"],
  travel: ["travel", "beach", "summer", "trip", "coastal", "nautical"],
  party: ["party", "fun", "celebrate", "whimsical"],
};

// Map common recipients/occasions to a leaning category.
const RECIPIENT_HINT: Record<string, string> = {
  mom: "home", mother: "home", grandma: "home",
  dad: "sports", father: "sports", grandpa: "sports",
  girlfriend: "jewelry", boyfriend: "tech", wife: "jewelry", husband: "tech",
  sister: "art", brother: "tech", friend: "home", bestie: "art",
  graduate: "tech", grad: "tech", teacher: "art", coworker: "kitchen",
};

function parseCategory(t: string): string | null {
  for (const [cat, syns] of Object.entries(CATEGORY_SYNONYMS)) {
    if (syns.some((s) => t.includes(s))) return cat;
  }
  for (const [who, cat] of Object.entries(RECIPIENT_HINT)) {
    if (new RegExp(`\\b${who}\\b`).test(t)) return cat;
  }
  return null;
}

// ── product search over the pin set ──────────────────────────────────────────
function search(opts: { budget?: number | null; category?: string | null; n?: number }): Pin[] {
  const n = opts.n ?? 4;
  let pool = PINS.slice();
  if (opts.category) pool = pool.filter((p) => p.category === opts.category);
  if (opts.budget != null) pool = pool.filter((p) => p.price <= opts.budget!);
  if (!pool.length) {
    // relax the category but keep the budget
    pool = PINS.filter((p) => opts.budget == null || p.price <= opts.budget!);
  }
  // premium-within-budget first, then spread for variety
  pool.sort((a, b) => b.price - a.price);
  return pool.slice(0, n);
}

function vibesToCategories(vibes: string[]): string[] {
  const cats = new Set<string>();
  for (const v of vibes) {
    for (const [cat, syns] of Object.entries(CATEGORY_SYNONYMS)) {
      if (cat === v || syns.includes(v)) cats.add(cat);
    }
  }
  return [...cats];
}

function localTaste(vibes: string[], n: number): Pin[] {
  const cats = vibesToCategories(vibes);
  if (cats.length) {
    const matched = PINS.filter((p) => cats.includes(p.category));
    if (matched.length) {
      // spread across matched categories
      const out: Pin[] = [];
      const step = Math.max(1, Math.floor(matched.length / n));
      for (let i = 0; i < matched.length && out.length < n; i += step) out.push(matched[i]);
      return out;
    }
  }
  const step = Math.max(1, Math.floor(PINS.length / n));
  const out: Pin[] = [];
  for (let i = 0; i < PINS.length && out.length < n; i += step) out.push(PINS[i]);
  return out;
}

// Live S3 Vectors kNN, mapped back to our bundled pins (the index holds the same
// 72 pins). Falls back to a local taste match if the API is unreachable.
async function tasteSearch(vibes: string[], n: number): Promise<{ pins: Pin[]; source: string }> {
  try {
    const seeds = pickSeedPins(SEED_PINS.map((p) => ({ k: p.k, t: p.t })), vibes, 4);
    const res = await fetchVectorRecommendations({ seedKeys: seeds, vibes, limit: 16 });
    const byId = new Map(PINS.map((p) => [p.id, p]));
    const pins = res.items
      .map((it) => byId.get(it.postId))
      .filter((p): p is Pin => Boolean(p));
    if (pins.length) return { pins: pins.slice(0, n), source: res.source ?? "vector" };
  } catch {
    /* fall through to local */
  }
  return { pins: localTaste(vibes, n), source: "local" };
}

const HELP_CHIPS = ["Gift under $40", "Something cozy", "Find a deal", "Like my taste", "Checkout"];

// ── main responder ───────────────────────────────────────────────────────────
export async function respond(input: string, ctx: MaxiContext): Promise<MaxiReply> {
  const t = input.toLowerCase().trim();
  const who = ctx.name ? `, ${ctx.name}` : "";

  // checkout
  if (/\b(check\s?out|place (the |my )?order|buy (it|them|now|these)|complete (my )?purchase|pay now)\b/.test(t)) {
    if (!ctx.cart.length)
      return { text: "Your cart's empty right now — want me to find a few gifts first?", chips: HELP_CHIPS };
    return {
      text: `Done${who}! I placed your order for ${ctx.cart.length} item${ctx.cart.length > 1 ? "s" : ""} totaling ${money(
        cartTotal(ctx.cart)
      )}. (Simulated checkout — no real charge.) I'll watch for price drops on similar finds. 🎁`,
      checkout: true,
    };
  }

  // view cart
  if (/\b(my cart|the cart|what('?s| is) in my (cart|basket)|view cart|show (me )?(my )?cart|basket)\b/.test(t) && !/\badd\b/.test(t)) {
    if (!ctx.cart.length) return { text: "Nothing in your cart yet. Tell me a budget or a vibe and I'll fill it up.", chips: HELP_CHIPS };
    return { text: `You've got ${ctx.cart.length} item${ctx.cart.length > 1 ? "s" : ""} (${money(cartTotal(ctx.cart))}). Say "checkout" when you're ready.`, openCart: true };
  }

  // add to cart (from the last shown items)
  if (/\badd\b/.test(t) && /(cart|basket|it|that|this|these|them|all|first|one|two|three)/.test(t)) {
    if (!ctx.lastShown.length) return { text: "Let me pull up some options first — what's the occasion or budget?", chips: HELP_CHIPS };
    let toAdd = ctx.lastShown;
    if (/\b(first|one|1)\b/.test(t)) toAdd = ctx.lastShown.slice(0, 1);
    else if (/\b(second|two|2)\b/.test(t)) toAdd = ctx.lastShown.slice(1, 2);
    else if (/\b(third|three|3)\b/.test(t)) toAdd = ctx.lastShown.slice(2, 3);
    else if (!/\ball\b/.test(t)) toAdd = ctx.lastShown.slice(0, 1);
    const total = toAdd.reduce((s, p) => s + p.price, 0);
    return {
      text: `Added ${toAdd.length === 1 ? `"${toAdd[0].title.slice(0, 32)}…"` : `${toAdd.length} items`} to your cart (+${money(total)}). Want anything else, or shall we checkout?`,
      addPins: toAdd,
      openCart: true,
      chips: ["Checkout", "Find more", "Something cheaper"],
    };
  }

  // discounts / deals
  if (/\b(deal|discount|sale|on sale|cheap(er|est)?|coupon|bargain|save money|budget friendly)\b/.test(t)) {
    const budget = parseBudget(t);
    const cat = parseCategory(t);
    const picks = search({ budget: budget ?? 60, category: cat, n: 4 }).sort((a, b) => a.price - b.price);
    return {
      text: `Here are the best value finds${budget ? ` under ${money(budget)}` : ""}${cat ? ` in ${cat}` : ""} right now${who}. I flagged the lowest prices first 🔖`,
      pins: picks,
      source: "catalog",
      chips: ["Add the first", "Checkout", "Show pricier ones"],
    };
  }

  // taste / visual search (uses S3 Vectors)
  if (/\b(like (this|these|that|mine)|similar|more like|my taste|my vibe|visual|looks like|match my|my style|aesthetic)\b/.test(t)) {
    const { pins, source } = await tasteSearch(ctx.vibes, 4);
    const how =
      source === "local"
        ? "based on your saved taste"
        : `via S3 Vectors similarity (${source})`;
    return {
      text: `Pulled these ${how}${who} — closest matches to your vibe ✨`,
      pins,
      source,
      chips: ["Add the first", "Cheaper options", "Checkout"],
    };
  }

  // greeting
  if (/^(hi|hey+|hello|yo|sup|howdy|good (morning|afternoon|evening))\b/.test(t)) {
    return {
      text: `Hey${who}! I'm Maxi — your gift concierge. Tell me a budget, a vibe, or who it's for and I'll find the gift, add it to your cart, and even check out for you.`,
      chips: HELP_CHIPS,
    };
  }

  // help / who are you
  if (/\b(help|what can you|how do you work|who are you|what do you do)\b/.test(t)) {
    return {
      text: "I can: 🔎 find gifts by budget or vibe, 🏷️ hunt discounts, 🧠 match someone's taste with visual search, 🛒 add to cart, and ✅ check out. Try the chips below or just talk to me (mic works too).",
      chips: HELP_CHIPS,
    };
  }

  // default: treat as a gift search using any budget/category we can find
  const budget = parseBudget(t);
  const cat = parseCategory(t);
  if (budget != null || cat != null) {
    const picks = search({ budget, category: cat, n: 4 });
    const label = [cat ? cat : "gift", budget ? `under ${money(budget)}` : ""].filter(Boolean).join(" ");
    return {
      text: `Found ${picks.length} ${label} pick${picks.length > 1 ? "s" : ""}${who}. Want me to add one to your cart?`,
      pins: picks,
      source: "catalog",
      chips: ["Add the first", "Find a deal", "Like my taste"],
    };
  }

  // generic fallback → taste picks
  const { pins, source } = await tasteSearch(ctx.vibes, 4);
  return {
    text: `Not sure I caught that${who} — here are a few you might love. Tell me a budget (e.g. "gift under $50") or a vibe and I'll narrow it down.`,
    pins,
    source,
    chips: HELP_CHIPS,
  };
}

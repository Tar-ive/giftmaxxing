// Amazon Associates affiliate helpers.
//
// The associate tag is PUBLIC (it travels in every outbound URL), so it lives in
// a NEXT_PUBLIC_* env var with a safe default. Until Product Advertising API
// access is granted (requires ~3 qualifying sales), we ONLY build links from
// ASINs — we never fetch, cache, or display Amazon prices/images. That keeps us
// inside the Associates Operating Agreement (no scraped prices, ≤24h cache rule).
import type { Grad } from "@/lib/data";

export const AMAZON_ASSOC_TAG =
  process.env.NEXT_PUBLIC_AMAZON_ASSOC_TAG || "giftmaxxingde-20";

export const AMAZON_MARKETPLACE = "https://www.amazon.com";

// rel for affiliate / paid outbound links — Google + Amazon both expect these.
export const AFFILIATE_REL = "sponsored nofollow noopener noreferrer";

const ASIN_RE = /^[A-Z0-9]{10}$/;

export function isValidAsin(asin: string): boolean {
  return ASIN_RE.test(asin);
}

// Pull a 10-char ASIN out of any Amazon URL, or return it if already an ASIN.
export function extractAsin(input: string): string | null {
  const s = input.trim().toUpperCase();
  if (ASIN_RE.test(s)) return s;
  const m = s.match(/\/(?:DP|GP\/PRODUCT|GP\/AW\/D)\/([A-Z0-9]{10})/);
  return m ? m[1] : null;
}

// Clean, tagged product link. Intentionally minimal — no tracking cruft.
export function amazonUrl(asin: string): string {
  const normalized = asin.trim().toUpperCase();
  // A malformed ASIN must never crash the Shop render: fall back to a tagged
  // search link (still carries the affiliate tag) instead of emitting /dp/<junk>.
  if (!isValidAsin(normalized)) {
    return `${AMAZON_MARKETPLACE}/s?k=${encodeURIComponent(asin)}&tag=${AMAZON_ASSOC_TAG}`;
  }
  return `${AMAZON_MARKETPLACE}/dp/${normalized}?tag=${AMAZON_ASSOC_TAG}`;
}

// Deterministic, stable visuals so a pick always renders the same tile even
// before we have real metadata. Gradient varies by ASIN; emoji is decorative.
const GRAD_KEYS: Grad[] = ["peach", "rose", "butter", "lilac", "sky", "sage", "coral"];
const PICK_EMOJI = ["🎁", "✨", "🛍️", "💝", "🎀", "⭐", "🧧", "🪄"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function gradForAsin(asin: string): Grad {
  return GRAD_KEYS[hashStr(asin) % GRAD_KEYS.length];
}

export function emojiForAsin(asin: string): string {
  return PICK_EMOJI[hashStr(asin) % PICK_EMOJI.length];
}

// Map a free-text category to a representative emoji so a tile signals what it
// is even before a product image exists. Keyword-matched and forgiving.
const CATEGORY_EMOJI: [RegExp, string][] = [
  [/head\s?phone|earbud|audio|speaker|sound/i, "🎧"],
  [/camera|photo|instax|polaroid/i, "📷"],
  [/game|gaming|console|controller|puzzle|lego|toy/i, "🎮"],
  [/book|read|novel|journal|stationery|notebook|pen\b/i, "📚"],
  [/kitchen|cook|coffee|espresso|tea|matcha|mug|barware/i, "☕"],
  [/home|decor|candle|fragrance|diffuser|blanket|pillow/i, "🕯️"],
  [/beauty|skin|makeup|cosmetic|hair|nail|spa/i, "💄"],
  [/fashion|apparel|cloth|shirt|hoodie|sock|wear|accessor/i, "👕"],
  [/jewel|ring|necklace|bracelet|watch/i, "💍"],
  [/fitness|gym|sport|yoga|run|outdoor|camp|hike/i, "🏕️"],
  [/tech|gadget|electronic|charger|laptop|computer|desk/i, "🔌"],
  [/pet|dog|cat/i, "🐾"],
  [/baby|kid|child|nursery/i, "🧸"],
  [/art|craft|paint|draw|diy/i, "🎨"],
  [/plant|garden|flower/i, "🪴"],
  [/food|snack|chocolate|candy|gourmet/i, "🍫"],
  [/music|vinyl|record|instrument/i, "🎶"],
];

export function emojiForCategory(category: string): string | null {
  for (const [re, emoji] of CATEGORY_EMOJI) if (re.test(category)) return emoji;
  return null;
}

// Resolve the gradient + emoji for a pick: explicit values win, then a
// category-derived emoji, then a stable per-ASIN fallback. Keeps every tile
// visually meaningful with or without enrichment.
export function visualForPick(pick: {
  asin: string;
  category?: string;
  emoji?: string;
  grad?: Grad;
}): { grad: Grad; emoji: string } {
  const grad = pick.grad ?? gradForAsin(pick.asin);
  const emoji =
    pick.emoji ?? (pick.category ? emojiForCategory(pick.category) : null) ?? emojiForAsin(pick.asin);
  return { grad, emoji };
}

// ── International locale fallback (9.3) ─────────────────────────────────────
//
// When Amazon OneLink is NOT configured (NEXT_PUBLIC_AMAZON_ONELINK_INSTANCE_ID
// is unset), we detect the user's locale from `navigator.language` and suggest
// the closest Amazon marketplace. This is a client-side-only helper.

export type AmazonMarketplace = {
  code: string;
  domain: string;
  label: string;
};

const AMAZON_MARKETPLACES: AmazonMarketplace[] = [
  { code: "US", domain: "amazon.com", label: "Amazon.com (US)" },
  { code: "UK", domain: "amazon.co.uk", label: "Amazon.co.uk (UK)" },
  { code: "DE", domain: "amazon.de", label: "Amazon.de (Germany)" },
  { code: "FR", domain: "amazon.fr", label: "Amazon.fr (France)" },
  { code: "ES", domain: "amazon.es", label: "Amazon.es (Spain)" },
  { code: "IT", domain: "amazon.it", label: "Amazon.it (Italy)" },
  { code: "IN", domain: "amazon.in", label: "Amazon.in (India)" },
  { code: "JP", domain: "amazon.co.jp", label: "Amazon.co.jp (Japan)" },
  { code: "CA", domain: "amazon.ca", label: "Amazon.ca (Canada)" },
  { code: "AU", domain: "amazon.com.au", label: "Amazon.com.au (Australia)" },
  { code: "BR", domain: "amazon.com.br", label: "Amazon.com.br (Brazil)" },
  { code: "MX", domain: "amazon.com.mx", label: "Amazon.com.mx (Mexico)" },
  { code: "NL", domain: "amazon.nl", label: "Amazon.nl (Netherlands)" },
  { code: "SG", domain: "amazon.sg", label: "Amazon.sg (Singapore)" },
  { code: "AE", domain: "amazon.ae", label: "Amazon.ae (UAE)" },
  { code: "SA", domain: "amazon.sa", label: "Amazon.sa (Saudi Arabia)" },
  { code: "SE", domain: "amazon.se", label: "Amazon.se (Sweden)" },
  { code: "PL", domain: "amazon.pl", label: "Amazon.pl (Poland)" },
];

// Language-tag region → marketplace code map for common locales.
const REGION_TO_MARKETPLACE: Record<string, string> = {
  US: "US", GB: "UK", UK: "UK",
  DE: "DE", AT: "DE", CH: "DE",
  FR: "FR", BE: "FR",
  ES: "ES",
  IT: "IT",
  IN: "IN",
  JP: "JP",
  CA: "CA",
  AU: "AU",
  BR: "BR",
  MX: "MX",
  NL: "NL",
  SG: "SG",
  AE: "AE",
  SA: "SA",
  SE: "SE",
  PL: "PL",
};

// Language subtag fallback (when region is absent, e.g. "ja" → JP).
const LANG_TO_MARKETPLACE: Record<string, string> = {
  ja: "JP",
  hi: "IN",
  pt: "BR",
  de: "DE",
  fr: "FR",
  es: "ES",
  it: "IT",
  nl: "NL",
  sv: "SE",
  pl: "PL",
  ar: "AE",
};

export function detectMarketplace(): AmazonMarketplace {
  const fallback = AMAZON_MARKETPLACES[0]; // US
  if (typeof navigator === "undefined") return fallback;
  const lang = navigator.language || "";
  const parts = lang.split("-");
  const region = (parts[1] ?? "").toUpperCase();
  const langBase = parts[0].toLowerCase();
  const code =
    REGION_TO_MARKETPLACE[region] ??
    LANG_TO_MARKETPLACE[langBase] ??
    "US";
  return AMAZON_MARKETPLACES.find((m) => m.code === code) ?? fallback;
}

export function amazonUrlForMarketplace(asin: string, marketplace: AmazonMarketplace): string {
  const normalized = asin.trim().toUpperCase();
  if (!isValidAsin(normalized)) {
    return `https://www.${marketplace.domain}/s?k=${encodeURIComponent(asin)}&tag=${AMAZON_ASSOC_TAG}`;
  }
  return `https://www.${marketplace.domain}/dp/${normalized}?tag=${AMAZON_ASSOC_TAG}`;
}

export const ONELINK_CONFIGURED = !!process.env.NEXT_PUBLIC_AMAZON_ONELINK_INSTANCE_ID;

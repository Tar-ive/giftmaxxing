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
  return `${AMAZON_MARKETPLACE}/dp/${asin}?tag=${AMAZON_ASSOC_TAG}`;
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

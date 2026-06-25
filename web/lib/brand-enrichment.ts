// Enriches flat platform brands (e.g. "Etsy") into more specific seller/brand
// names by parsing the pin title. This gives the Brands tab much more diversity
// without modifying the auto-generated pins.ts manifest.
import type { Pin } from "@/lib/pins";

// Known Etsy sellers mentioned in pin titles
const ETSY_SELLER_RE = /Etsy seller (\w+)/i;

// Category-to-brand fallback for pins without an explicit seller name. These
// represent real-world brands associated with the item type to give the browse
// experience better groupings than a flat "Etsy" bucket.
const CATEGORY_BRANDS: Record<string, string[]> = {
  jewelry: ["Mejuri", "Catbird", "Kendra Scott"],
  home: ["West Elm", "Anthropologie Home", "CB2"],
  plants: ["The Sill", "Bloomscape", "Terrain"],
  vintage: ["Chairish", "1stDibs", "Etsy Vintage"],
  art: ["Society6", "Minted", "Saatchi Art"],
  kitchen: ["Our Place", "Le Creuset", "Material"],
  travel: ["Away", "Paravel", "Tumi"],
  tech: ["Anker", "Twelve South", "Native Union"],
  wellness: ["Vitruvi", "Aesop", "Herbivore"],
  sports: ["Tracksmith", "Outdoor Voices", "Cotopaxi"],
  gifts: ["Uncommon Goods", "Rifle Paper Co.", "Poketo"],
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function enrichBrand(pin: Pin): string {
  // If the pin already has a specific brand (not a platform), keep it.
  if (pin.brand !== "Etsy") return pin.brand;

  // Try to extract a seller name from the title
  const match = pin.title.match(ETSY_SELLER_RE);
  if (match) return match[1];

  // Fallback: assign a category-appropriate brand
  const brands = CATEGORY_BRANDS[pin.category];
  if (brands) {
    return brands[hashStr(pin.id) % brands.length];
  }

  return pin.brand;
}

// Build a map of enriched brand -> pin IDs for use in the search brands tab.
export function buildBrandIndex(pins: Pin[]): Map<string, Pin[]> {
  const map = new Map<string, Pin[]>();
  for (const p of pins) {
    const brand = enrichBrand(p);
    const key = brand.toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

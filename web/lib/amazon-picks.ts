// Amazon affiliate catalog (the ASIN list shown on /feed/shop).
//
// DATA lives in amazon-picks.json and is managed by the importer:
//   node infra/ingest/import-asins.mjs <file-of-asins>
// Paste more ASINs and re-run to grow the list. Optional fields (title, brand,
// category) can be enriched manually now, or via PA-API once approved. `price`
// is intentionally only ever set from PA-API later — never a scraped price.
import data from "@/lib/amazon-picks.json";
import type { Grad } from "@/lib/data";

export type AmazonPick = {
  asin: string;
  title?: string;
  brand?: string;
  category?: string;
  blurb?: string; // short description: your own words, or PA-API "Features"
  image?: string; // primary product image URL — PA-API ONLY, never scraped
  price?: number; // amount; stored for future use, not rendered (PA-API 24h price rule)
  currency?: string;
  priceUpdatedAt?: string; // ISO timestamp the price was fetched (enforces the 24h rule)
  updatedAt?: string; // ISO timestamp this pick was last enriched
  emoji?: string;
  grad?: Grad;
};

export const AMAZON_PICKS: AmazonPick[] = data as AmazonPick[];

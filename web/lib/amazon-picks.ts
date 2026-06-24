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
  price?: number;
  emoji?: string;
  grad?: Grad;
};

export const AMAZON_PICKS: AmazonPick[] = data as AmazonPick[];

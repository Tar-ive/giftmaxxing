#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Enrich the Amazon affiliate catalog (web/lib/amazon-picks.json) with OFFICIAL
// product data from the Amazon Product Advertising API (PA-API 5.0).
//
// This is the ONLY compliant way to show Amazon images/titles/details — we never
// scrape pages. PA-API access requires an approved Associate account that has
// made ~3 qualifying sales within 180 days; until then this script will fail the
// preflight (use --dry-run to inspect what it WOULD request without credentials).
//
// Reads the ASIN list from amazon-picks.json, calls GetItems in batches of 10
// (throttled), and merges title/brand/category/blurb/image/price back in.
//
// Usage:
//   node infra/ingest/paapi-enrich.mjs               # enrich picks missing data
//   node infra/ingest/paapi-enrich.mjs --force       # re-fetch ALL picks
//   node infra/ingest/paapi-enrich.mjs --limit 10    # only the first 10 ASINs
//   node infra/ingest/paapi-enrich.mjs --dry-run     # show the request, no call
//
// Credentials (repo-root .env — NEVER NEXT_PUBLIC_, NEVER in Vercel):
//   AMAZON_PAAPI_ACCESS_KEY, AMAZON_PAAPI_SECRET_KEY, AMAZON_PARTNER_TAG
//   AMAZON_PAAPI_HOST (default webservices.amazon.com)
//   AMAZON_PAAPI_REGION (default us-east-1)
//   AMAZON_PAAPI_MARKETPLACE (default www.amazon.com)
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../web/lib/amazon-picks.json");

// ── Config ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const DRY_RUN = has("--dry-run");
const FORCE = has("--force");
const LIMIT = Number(valOf("--limit", "0")) || 0;

const ACCESS_KEY = process.env.AMAZON_PAAPI_ACCESS_KEY || "";
const SECRET_KEY = process.env.AMAZON_PAAPI_SECRET_KEY || "";
const PARTNER_TAG =
  process.env.AMAZON_PARTNER_TAG || process.env.NEXT_PUBLIC_AMAZON_ASSOC_TAG || "giftmaxxingde-20";
const HOST = process.env.AMAZON_PAAPI_HOST || "webservices.amazon.com";
const REGION = process.env.AMAZON_PAAPI_REGION || "us-east-1";
const MARKETPLACE = process.env.AMAZON_PAAPI_MARKETPLACE || "www.amazon.com";

const SERVICE = "ProductAdvertisingAPI";
const PATH = "/paapi5/getitems";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems";
const RESOURCES = [
  "Images.Primary.Large",
  "ItemInfo.Title",
  "ItemInfo.ByLineInfo",
  "ItemInfo.Features",
  "ItemInfo.Classifications",
  "Offers.Listings.Price",
];
const BATCH = 10; // PA-API GetItems hard limit
const THROTTLE_MS = 1100; // new accounts are ~1 TPS; be polite
const MAX_RETRIES = 3;

// ── AWS Signature V4 (PA-API 5.0) ────────────────────────────────────────────
const sha256hex = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");
const hmac = (key, s) => crypto.createHmac("sha256", key).update(s, "utf8").digest();

function signedHeaders(payload) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const contentType = "application/json; charset=utf-8";
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:${contentType}\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${TARGET}\n`;
  const signed = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    PATH,
    "",
    canonicalHeaders,
    signed,
    sha256hex(payload),
  ].join("\n");
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256hex(canonicalRequest),
  ].join("\n");
  const kSigning = hmac(
    hmac(hmac(hmac("AWS4" + SECRET_KEY, dateStamp), REGION), SERVICE),
    "aws4_request"
  );
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");
  return {
    "content-encoding": "amz-1.0",
    "content-type": contentType,
    host: HOST,
    "x-amz-date": amzDate,
    "x-amz-target": TARGET,
    Authorization: `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getItems(asins) {
  const payload = JSON.stringify({
    ItemIds: asins,
    ItemIdType: "ASIN",
    Resources: RESOURCES,
    PartnerTag: PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: MARKETPLACE,
  });

  if (DRY_RUN) {
    console.log(`  [dry-run] GetItems ${asins.length} ASIN(s): ${asins.join(", ")}`);
    return { items: [], errors: [] };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res, text;
    try {
      res = await fetch(`https://${HOST}${PATH}`, {
        method: "POST",
        headers: signedHeaders(payload),
        body: payload,
      });
      text = await res.text();
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await sleep(THROTTLE_MS * attempt * 2);
      continue;
    }
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON error body */
    }
    if (res.ok) {
      return {
        items: json?.ItemsResult?.Items || [],
        errors: json?.Errors || [],
      };
    }
    // 429 / 5xx -> back off and retry; 4xx -> surface immediately.
    const retriable = res.status === 429 || res.status >= 500;
    const msg = json?.Errors?.map((e) => `${e.Code}: ${e.Message}`).join("; ") || text.slice(0, 300);
    if (!retriable || attempt === MAX_RETRIES) {
      throw new Error(`PA-API ${res.status}: ${msg}`);
    }
    await sleep(THROTTLE_MS * attempt * 2);
  }
  return { items: [], errors: [] };
}

// Map one PA-API item to our enrichment fields.
function mapItem(item) {
  const info = item.ItemInfo || {};
  const features = info.Features?.DisplayValues || [];
  const blurb = features.length ? features.slice(0, 2).join(" · ").slice(0, 180) : undefined;
  const listing = item.Offers?.Listings?.[0];
  const now = new Date().toISOString();
  const rec = { asin: item.ASIN, updatedAt: now };
  const title = info.Title?.DisplayValue;
  const brand = info.ByLineInfo?.Brand?.DisplayValue || info.ByLineInfo?.Manufacturer?.DisplayValue;
  const category =
    info.Classifications?.Binding?.DisplayValue || info.Classifications?.ProductGroup?.DisplayValue;
  const image = item.Images?.Primary?.Large?.URL;
  if (title) rec.title = title;
  if (brand) rec.brand = brand;
  if (category) rec.category = category;
  if (blurb) rec.blurb = blurb;
  if (image) rec.image = image;
  if (listing?.Price?.Amount != null) {
    rec.price = listing.Price.Amount;
    rec.currency = listing.Price.Currency;
    rec.priceUpdatedAt = now;
  }
  return rec;
}

// ── Main ─────────────────────────────────────────────────────────────────────
if (!existsSync(OUT)) {
  console.error(`No catalog at ${OUT}. Run import-asins.mjs first.`);
  process.exit(1);
}
if (!DRY_RUN && (!ACCESS_KEY || !SECRET_KEY)) {
  console.error(
    "Missing PA-API credentials. Set AMAZON_PAAPI_ACCESS_KEY + AMAZON_PAAPI_SECRET_KEY\n" +
      "(repo-root .env). PA-API access is granted after ~3 qualifying sales.\n" +
      "Tip: run with --dry-run to preview requests without credentials."
  );
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(OUT, "utf8"));
const byAsin = new Map(catalog.map((p) => [p.asin, p]));

// Which ASINs to (re)fetch: by default only those missing a title or image.
let targets = catalog
  .filter((p) => FORCE || !p.title || !p.image)
  .map((p) => p.asin);
if (LIMIT > 0) targets = targets.slice(0, LIMIT);

if (targets.length === 0) {
  console.log("Nothing to enrich (all picks already have title + image). Use --force to refetch.");
  process.exit(0);
}

console.log(
  `Enriching ${targets.length}/${catalog.length} pick(s) via PA-API ` +
    `(tag=${PARTNER_TAG}, host=${HOST})${DRY_RUN ? " [dry-run]" : ""}…`
);

let enriched = 0;
let failed = 0;
for (let i = 0; i < targets.length; i += BATCH) {
  const chunk = targets.slice(i, i + BATCH);
  try {
    const { items, errors } = await getItems(chunk);
    for (const e of errors) console.warn(`  ! ${e.Code}: ${e.Message}`);
    for (const item of items) {
      const rec = mapItem(item);
      const cur = byAsin.get(rec.asin) || { asin: rec.asin };
      // Fill curated text only when empty (preserve manual edits) unless --force;
      // always refresh PA-API-owned fields (image/price/timestamps).
      for (const k of ["title", "brand", "category", "blurb"]) {
        if (rec[k] != null && (FORCE || !cur[k])) cur[k] = rec[k];
      }
      for (const k of ["image", "price", "currency", "priceUpdatedAt", "updatedAt"]) {
        if (rec[k] != null) cur[k] = rec[k];
      }
      byAsin.set(rec.asin, cur);
      enriched++;
    }
  } catch (e) {
    failed += chunk.length;
    console.error(`  x batch ${i / BATCH + 1} failed: ${e.message}`);
  }
  if (i + BATCH < targets.length) await sleep(THROTTLE_MS);
}

if (!DRY_RUN) {
  writeFileSync(OUT, JSON.stringify([...byAsin.values()], null, 2) + "\n");
}
console.log(`\u2713 enriched ${enriched}, failed ${failed} \u2192 ${OUT}${DRY_RUN ? " (dry-run, not written)" : ""}`);

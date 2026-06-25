#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Import Amazon ASINs into the affiliate catalog (web/lib/amazon-picks.json).
//
// The JSON ACCUMULATES — re-running merges new ASINs and enriches existing ones
// without losing manual edits. Canonical source of truth = the JSON.
//
// Usage:
//   node infra/ingest/import-asins.mjs asins.seed.txt          # from a file
//   node infra/ingest/import-asins.mjs B0XXXX B0YYYY ...        # inline args
//   pbpaste | node infra/ingest/import-asins.mjs                # from stdin
//
// Input is forgiving: one ASIN per line, or comma/space/tab separated, or full
// Amazon URLs (the ASIN is extracted). For enrichment, a line may be a CSV/TSV
// record:  ASIN, Title, Brand, Category, Description  (after the ASIN is metadata).
// Blank lines and lines starting with '#' are ignored.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../web/lib/amazon-picks.json");

const ASIN_RE = /^[A-Z0-9]{10}$/;
const URL_ASIN_RE = /\/(?:DP|GP\/PRODUCT|GP\/AW\/D)\/([A-Z0-9]{10})/;

// Return a 10-char ASIN from a raw token or an Amazon URL, else null.
function toAsin(token) {
  const s = String(token || "").trim().toUpperCase();
  if (ASIN_RE.test(s)) return s;
  const m = s.match(URL_ASIN_RE);
  return m ? m[1] : null;
}

// Parse the whole input blob into records: { asin, title?, brand?, category? }.
function parseRecords(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    // Skip an optional CSV header row.
    if (/^asin\b/i.test(t) && /(title|brand|category|desc)/i.test(t)) continue;

    // Prefer tab as the separator when present (titles often contain commas).
    const sep = t.includes("\t") ? /\t+/ : /,/;
    let fields = t.split(sep).map((s) => s.trim()).filter(Boolean);
    // A whitespace-separated bag of ASINs on one line (no commas/tabs).
    if (fields.length === 1 && /\s/.test(t)) {
      const toks = t.split(/\s+/).filter(Boolean);
      if (toks.filter(toAsin).length >= 2) fields = toks;
    }

    const asinFlags = fields.map(toAsin);
    const validCount = asinFlags.filter(Boolean).length;
    if (validCount === 0) continue;

    // Two or more fields are ASINs -> treat the line as a plain list of ASINs.
    if (validCount >= 2) {
      for (const a of asinFlags) if (a) out.push({ asin: a });
      continue;
    }

    // Single ASIN (+ optional metadata in the remaining fields).
    const idx = asinFlags.findIndex(Boolean);
    const asin = asinFlags[idx];
    const rest = fields.filter((_, i) => i !== idx);
    const [title, brand, category, blurb] = rest;
    const rec = { asin };
    if (title) rec.title = title;
    if (brand) rec.brand = brand;
    if (category) rec.category = category;
    if (blurb) rec.blurb = blurb;
    out.push(rec);
  }
  return out;
}

// ── Gather input from file args, inline ASIN args, and/or stdin ──────────────
const args = process.argv.slice(2);
let text = "";
const inline = [];
for (const arg of args) {
  if (existsSync(arg)) text += "\n" + readFileSync(arg, "utf8");
  else inline.push(arg);
}
if (inline.length) text += "\n" + inline.join("\n");
if (!text.trim() && !process.stdin.isTTY) {
  text += "\n" + readFileSync(0, "utf8"); // read piped stdin
}
if (!text.trim()) {
  console.error("No input. Pass a file, inline ASINs, or pipe via stdin.");
  process.exit(1);
}

// ── Merge into the existing catalog ──────────────────────────────────────────
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const byAsin = new Map(existing.map((p) => [p.asin, p]));

let added = 0;
let enriched = 0;
let skipped = 0;
for (const rec of parseRecords(text)) {
  if (!ASIN_RE.test(rec.asin)) {
    skipped++;
    continue;
  }
  const cur = byAsin.get(rec.asin);
  if (!cur) {
    byAsin.set(rec.asin, rec);
    added++;
    continue;
  }
  let changed = false;
  for (const k of ["title", "brand", "category", "blurb", "price"]) {
    if (rec[k] != null && rec[k] !== cur[k]) {
      cur[k] = rec[k];
      changed = true;
    }
  }
  if (changed) enriched++;
}

const picks = [...byAsin.values()];
writeFileSync(OUT, JSON.stringify(picks, null, 2) + "\n");

console.log(`\u2713 ${OUT}`);
console.log(`  +${added} new, ${enriched} enriched, ${skipped} skipped \u2192 ${picks.length} total`);

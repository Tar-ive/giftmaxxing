// Pinterest (internal resource API) -> enriched manifest scraper.
//
// The public RSS feeds only return ~25 recent pins/feed and carry NO outbound
// product link. Pinterest's own SPA endpoints do, and work without auth:
//   PinResource        -> full pin (link, price, rich_summary, board.id, …)
//   BoardFeedResource  -> a whole board, paginated by bookmark (the volume engine)
//   BaseSearchResource -> pins for a query (diversity + board discovery)
//
// Strategy: seed pins from RSS users + search queries -> resolve each seed's
// board.id via PinResource -> bulk-crawl those boards via BoardFeedResource
// (every pin already carries link + price) -> filter / dedup / diversity-cap to
// a target count. Writes the same manifest shape embed.mjs / ingest-pins.mjs
// consume, plus real fields: link, domain, price, ratingCount, recipient, etc.
//
// Usage:
//   node pinterest-scrape.mjs --target 200 --dry-run        # small validation run
//   node pinterest-scrape.mjs --target 10000                # full crawl -> manifest
//   node pinterest-scrape.mjs --resume                      # continue after a stop
//   node pinterest-scrape.mjs --target 10000 --bucket giftmaxxing-dev-media --skip-existing
//
// Config (env): MEDIA_BUCKET, AWS_REGION (only needed with --bucket). Node 18+.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const a = {
    target: 10000,
    dryRun: false,
    resume: false,
    seeds: join(__dirname, "seed-boards.json"),
    out: join(__dirname, "pins.manifest.json"),
    state: join(__dirname, ".scrape-state.json"),
    maxPerBoard: 250,
    maxPerDomain: 1500,
    pageCap: 40, // max board-feed pages per board (~25 pins each)
    minInterval: 1200, // ms between requests (politeness)
    jitter: 600,
    rssSeeds: 25, // pins pulled per seed user RSS
    flushEvery: 100,
    useSearch: true,
    useRss: true,
    prefix: "images/",
    concurrency: 6,
  };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--dry-run") a.dryRun = true;
    else if (x === "--resume") a.resume = true;
    else if (x === "--no-search") a.useSearch = false;
    else if (x === "--no-rss") a.useRss = false;
    else if (x === "--skip-existing") a.skipExisting = true;
    else if (x === "--target") a.target = Number(argv[++i]);
    else if (x === "--seeds") a.seeds = resolve(process.cwd(), argv[++i]);
    else if (x === "--out") a.out = resolve(process.cwd(), argv[++i]);
    else if (x === "--state") a.state = resolve(process.cwd(), argv[++i]);
    else if (x === "--bucket") a.bucket = argv[++i];
    else if (x === "--prefix") a.prefix = argv[++i];
    else if (x === "--max-per-board") a.maxPerBoard = Number(argv[++i]);
    else if (x === "--max-per-domain") a.maxPerDomain = Number(argv[++i]);
    else if (x === "--page-cap") a.pageCap = Number(argv[++i]);
    else if (x === "--min-interval") a.minInterval = Number(argv[++i]);
  }
  return a;
}

// ── HTTP layer: global throttle + retry/backoff ──────────────────────────────
let ARGS;
let lastReq = 0;
async function throttle() {
  const wait = Math.max(0, ARGS.minInterval - (Date.now() - lastReq)) + Math.random() * ARGS.jitter;
  if (wait > 0) await sleep(wait);
  lastReq = Date.now();
}

function headers(referer) {
  return {
    "User-Agent": UA,
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "X-Requested-With": "XMLHttpRequest",
    "X-Pinterest-PWS-Handler": "www/[username]/[slug].js",
    Referer: referer || "https://www.pinterest.com/",
  };
}

async function resourceGet(name, options, { sourceUrl, referer, retries = 3 } = {}) {
  const data = encodeURIComponent(JSON.stringify({ options }));
  const su = encodeURIComponent(sourceUrl || "/");
  const url = `https://www.pinterest.com/resource/${name}/get/?source_url=${su}&data=${data}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle();
    try {
      const res = await fetch(url, { headers: headers(referer) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`);
      return JSON.parse(text);
    } catch (e) {
      if (attempt === retries) {
        console.warn(`  ! ${name} failed: ${e.message}`);
        return null;
      }
      await sleep(1500 * 2 ** attempt + Math.random() * 800);
    }
  }
}

async function fetchRssPinIds(user) {
  try {
    await throttle();
    const res = await fetch(`https://www.pinterest.com/${user}/feed.rss`, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml,text/xml" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const ids = [];
    for (const m of xml.matchAll(/\/pin\/(\d+)/g)) ids.push(m[1]);
    return [...new Set(ids)].slice(0, ARGS.rssSeeds);
  } catch {
    return [];
  }
}

// ── Resource calls ───────────────────────────────────────────────────────────
const pinResource = (id) =>
  resourceGet("PinResource", { id: String(id), field_set_key: "detailed" }, {
    sourceUrl: `/pin/${id}/`,
    referer: `https://www.pinterest.com/pin/${id}/`,
  }).then((j) => j?.resource_response?.data || null);

async function boardFeedPage(boardId, bookmark) {
  const options = { board_id: String(boardId), page_size: 25, currentFilter: -1 };
  if (bookmark) options.bookmarks = [bookmark];
  const j = await resourceGet("BoardFeedResource", options, { sourceUrl: "/" });
  const data = j?.resource_response?.data;
  const list = Array.isArray(data) ? data : data?.results || [];
  const next = j?.resource_response?.bookmark;
  return { pins: list, bookmark: next && next !== "-end-" ? next : null };
}

async function searchPage(query, bookmark) {
  const options = { query, scope: "pins", page_size: 25 };
  if (bookmark) options.bookmarks = [bookmark];
  const su = `/search/pins/?q=${encodeURIComponent(query)}`;
  const j = await resourceGet("BaseSearchResource", options, {
    sourceUrl: su,
    referer: `https://www.pinterest.com${su}`,
  });
  const data = j?.resource_response?.data;
  const list = Array.isArray(data) ? data : data?.results || [];
  const next = j?.resource_response?.bookmark;
  return { pins: list, bookmark: next && next !== "-end-" ? next : null };
}

// ── Extraction + classification ──────────────────────────────────────────────
function pickImage(p) {
  const imgs = p.images || {};
  const o = imgs.orig || imgs["736x"] || imgs["564x"] || Object.values(imgs)[0];
  let url = o?.url || p.image_large_url || null;
  if (url) url = url.replace(/\/\d+x\d*\//, "/originals/");
  return url;
}

const CAT_RULES = [
  { c: "kitchen", k: ["kitchen", "cook", "bake", "recipe", "mug", "coffee", "tea", "knife", "cutting board", "apron"] },
  { c: "home", k: ["home", "decor", "candle", "blanket", "throw", "vase", "pillow", "lamp", "wall art", "rug"] },
  { c: "jewelry", k: ["necklace", "bracelet", "earring", "ring", "jewel", "pendant", "charm"] },
  { c: "fashion", k: ["dress", "shirt", "sweater", "jacket", "scarf", "bag", "tote", "hat", "beanie", "socks", "outfit"] },
  { c: "beauty", k: ["skincare", "lipstick", "perfume", "beauty", "makeup", "serum", "lotion"] },
  { c: "tech", k: ["gadget", "headphone", "charger", "speaker", "tech", "phone", "laptop", "keyboard"] },
  { c: "wellness", k: ["self care", "spa", "wellness", "yoga", "journal", "sleep", "candle set", "bath"] },
  { c: "outdoors", k: ["camp", "hike", "outdoor", "travel", "water bottle", "backpack", "adventure"] },
  { c: "kids", k: ["kid", "baby", "toddler", "toy", "nursery", "child"] },
  { c: "art", k: ["art", "print", "poster", "paint", "photo", "frame", "craft", "diy"] },
  { c: "food", k: ["chocolate", "snack", "candy", "gourmet", "sauce", "spice", "coffee bean"] },
  { c: "pets", k: ["dog", "cat", "pet", "puppy"] },
];
function mapCategory(p, name, desc) {
  const tagList = Array.isArray(p.manual_interest_tags)
    ? p.manual_interest_tags.filter((t) => typeof t === "string")
    : [];
  const tags = tagList.join(" ").toLowerCase();
  const hay = `${name} ${desc} ${tags} ${asText(p.category)}`.toLowerCase();
  for (const r of CAT_RULES) if (r.k.some((kw) => hay.includes(kw))) return r.c;
  return "gifts";
}

const asText = (v) => (typeof v === "string" ? v : "");

function normalize(p, facets) {
  const product = p.rich_summary?.products?.[0] || p.rich_metadata?.products?.[0];
  const offer = product?.offer_summary;
  const rawPrice =
    typeof offer?.price_val === "number" ? offer.price_val : p.price_value;
  const price = typeof rawPrice === "number" && rawPrice > 0 ? rawPrice : null; // 0 == "no price"
  const name = (asText(product?.name) || asText(p.grid_title) || asText(p.title))
    .replace(/\s+/g, " ")
    .trim();
  const desc = (asText(p.closeup_description) || asText(p.description) || asText(p.rich_metadata?.description))
    .replace(/\s+/g, " ")
    .trim();
  const domain = asText(p.domain) || asText(p.link_domain) || null;
  return {
    id: `pin-${p.id}`,
    pinId: String(p.id),
    source: "pinterest",
    sourceUser:
      facets.sourceUser ||
      (domain ? domain.replace(/^www\./, "").split(".")[0] : null) ||
      p.pinner?.username ||
      "pinterest",
    pinUrl: `https://www.pinterest.com/pin/${p.id}/`,
    title: name,
    description: desc.slice(0, 600),
    imageUrl: pickImage(p),
    imageSignature: p.image_signature || null,
    link: asText(p.link) || asText(p.tracked_link) || null, // real outbound product URL
    domain,
    price,
    priceCurrency: offer?.currency || p.price_currency || "USD",
    priceDisplay: price != null ? offer?.price || `$${price}` : null,
    inStock: offer?.in_stock ?? null,
    ratingCount: p.rich_metadata?.aggregate_rating?.rating_count ?? null,
    siteName: p.rich_metadata?.site_name || null,
    boardId: p.board?.id || null,
    boardName: p.board?.name || null,
    category: facets.categoryHint || mapCategory(p, name, desc),
    recipient: facets.recipient || "anyone",
    occasion: facets.occasion || "any",
    dominantColor: p.dominant_color || null,
  };
}

// Domains that are not shoppable product pages (social, link aggregators, etc).
const BLOCK_DOMAINS = new Set([
  "facebook.com", "instagram.com", "youtube.com", "youtu.be", "tiktok.com",
  "twitter.com", "x.com", "pinterest.com", "linktr.ee", "google.com", "bit.ly",
]);
function isQuality(r) {
  if (!r.imageUrl || !r.link) return false;
  if (!r.title || r.title.length < 3) return false;
  if (!r.domain) return false;
  if (BLOCK_DOMAINS.has(r.domain.replace(/^www\./, ""))) return false;
  if (/pinterest\.com/i.test(r.link)) return false; // must leave Pinterest
  return true;
}

// ── State (resumable) ────────────────────────────────────────────────────────
function emptyState() {
  return { visited: [], boards: {}, domainCounts: {}, recipientCounts: {} };
}
async function loadState() {
  if (ARGS.resume && existsSync(ARGS.state)) {
    try {
      return JSON.parse(await readFile(ARGS.state, "utf8"));
    } catch {}
  }
  return emptyState();
}

async function main() {
  ARGS = parseArgs(process.argv.slice(2));
  const seeds = JSON.parse(await readFile(ARGS.seeds, "utf8"));
  const state = await loadState();

  // Resume: reload any manifest written so far.
  let records = [];
  if (ARGS.resume && existsSync(ARGS.out)) {
    try {
      records = JSON.parse(await readFile(ARGS.out, "utf8"));
    } catch {}
  }
  const visited = new Set(state.visited);
  const sigSeen = new Set(records.map((r) => r.imageSignature).filter(Boolean));
  const domainCounts = state.domainCounts || {};
  const recipientCounts = state.recipientCounts || {};
  records.forEach((r) => visited.add(r.pinId));

  // boardQueue: { boardId, bookmark, facets, pages, done }
  const boardQueue = [];
  const knownBoards = new Set(Object.keys(state.boards));
  for (const [boardId, b] of Object.entries(state.boards)) {
    if (b.done) continue;
    const item = { boardId, bookmark: b.bookmark, facets: b.facets || {}, pages: b.pages || 0 };
    if (b.priority) boardQueue.unshift(item);
    else boardQueue.push(item);
  }

  // Brand/RSS boards are higher quality, so enqueue them with priority (front of
  // the FIFO queue); search-discovered + sibling boards go to the back.
  const enqueueBoard = (boardId, facets, priority = false) => {
    if (!boardId || knownBoards.has(boardId)) return;
    knownBoards.add(boardId);
    state.boards[boardId] = { bookmark: null, facets, pages: 0, done: false, priority };
    const item = { boardId, bookmark: null, facets, pages: 0 };
    if (priority) boardQueue.unshift(item);
    else boardQueue.push(item);
  };

  const flush = async () => {
    state.visited = [...visited];
    state.domainCounts = domainCounts;
    state.recipientCounts = recipientCounts;
    await writeFile(ARGS.out, JSON.stringify(records, null, 2) + "\n");
    await writeFile(ARGS.state, JSON.stringify(state, null, 2) + "\n");
  };

  // Try to add a normalized pin; returns true if accepted.
  const tryAdd = (p, facets) => {
    if (!p?.id || visited.has(String(p.id))) return false;
    visited.add(String(p.id));
    const r = normalize(p, facets);
    if (!isQuality(r)) return false;
    if (r.imageSignature && sigSeen.has(r.imageSignature)) return false;
    if ((domainCounts[r.domain] || 0) >= ARGS.maxPerDomain) return false;
    if (r.imageSignature) sigSeen.add(r.imageSignature);
    domainCounts[r.domain] = (domainCounts[r.domain] || 0) + 1;
    recipientCounts[r.recipient] = (recipientCounts[r.recipient] || 0) + 1;
    records.push(r);
    if (p.board?.id) enqueueBoard(p.board.id, facets); // discover sibling boards
    return true;
  };

  console.log(`Target ${ARGS.target} pins. Resuming with ${records.length} already collected.`);

  // 1. SEED via brand users (RSS) -> PinResource -> board.id. Curated, higher
  //    quality, so their boards are crawled FIRST (priority).
  if (ARGS.useRss && records.length < ARGS.target) {
    for (const u of seeds.users || []) {
      if (records.length >= ARGS.target) break;
      const facets = { sourceUser: u.user, recipient: u.recipient, occasion: u.occasion, categoryHint: u.categoryHint };
      const ids = await fetchRssPinIds(u.user);
      for (const id of ids.slice(0, 8)) {
        if (visited.has(id)) continue;
        const pin = await pinResource(id);
        if (pin?.board?.id) enqueueBoard(pin.board.id, facets, true);
        if (pin) tryAdd(pin, facets);
      }
      console.log(`  rss ${u.user}: ${ids.length} seed pins, boards queued: ${boardQueue.length}`);
    }
  }

  // 2. SEED via search (diverse recipients/occasions) — adds pins directly and
  //    discovers more boards (lower priority than brand boards above).
  if (ARGS.useSearch && records.length < ARGS.target) {
    for (const s of seeds.queries || []) {
      if (records.length >= ARGS.target) break;
      const facets = { recipient: s.recipient, occasion: s.occasion, categoryHint: s.categoryHint };
      const { pins } = await searchPage(s.q);
      let added = 0;
      for (const p of pins) if (tryAdd(p, facets)) added++;
      console.log(`  search "${s.q}": +${added} (boards queued: ${boardQueue.length})`);
      await flush();
    }
  }

  // 3. CRAWL boards (the volume engine) until target reached.
  while (boardQueue.length && records.length < ARGS.target) {
    const b = boardQueue.shift();
    const meta = state.boards[b.boardId];
    let bookmark = b.bookmark;
    let perBoard = 0;
    let pages = b.pages || 0;
    while (records.length < ARGS.target && pages < ARGS.pageCap && perBoard < ARGS.maxPerBoard) {
      const { pins, bookmark: next } = await boardFeedPage(b.boardId, bookmark);
      if (!pins.length) break;
      let added = 0;
      for (const p of pins) if (tryAdd(p, b.facets)) (added++, perBoard++);
      pages++;
      meta.bookmark = next;
      meta.pages = pages;
      if (added) console.log(`  board ${b.boardId} p${pages}: +${added} (total ${records.length}/${ARGS.target})`);
      if (records.length % ARGS.flushEvery < pins.length) await flush();
      bookmark = next;
      if (!next) break;
    }
    meta.done = !bookmark || perBoard >= ARGS.maxPerBoard || pages >= ARGS.pageCap;
    await flush();
  }

  await flush();
  console.log(`\n✓ collected ${records.length} pins -> ${ARGS.out}`);
  console.log(`  recipients: ${JSON.stringify(recipientCounts)}`);
  const topDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`  top merchants: ${topDomains.map(([d, n]) => `${d}:${n}`).join(", ")}`);
  const withPrice = records.filter((r) => r.price != null).length;
  console.log(`  with real price: ${withPrice}/${records.length}`);

  if (ARGS.dryRun) {
    console.log("\n[dry-run] sample:\n" + JSON.stringify(records[0], null, 2));
    return;
  }

  if (ARGS.bucket) await uploadToS3(records);
}

// ── Optional S3 upload (download originals -> media bucket) ───────────────────
async function uploadToS3(records) {
  const region = process.env.AWS_REGION || "us-east-1";
  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({ region });
  let uploaded = 0,
    skipped = 0,
    failed = 0;
  let i = 0;
  const worker = async () => {
    while (i < records.length) {
      const rec = records[i++];
      const Key = `${ARGS.prefix}${rec.id}.jpg`;
      rec.bucket = ARGS.bucket;
      rec.s3Key = Key;
      rec.s3Uri = `s3://${ARGS.bucket}/${Key}`;
      if (ARGS.skipExisting) {
        try {
          await s3.send(new HeadObjectCommand({ Bucket: ARGS.bucket, Key }));
          skipped++;
          continue;
        } catch {}
      }
      try {
        const res = await fetch(rec.imageUrl, { headers: { "User-Agent": UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1024) throw new Error("too small");
        await s3.send(
          new PutObjectCommand({
            Bucket: ARGS.bucket,
            Key,
            Body: buf,
            ContentType: res.headers.get("content-type") || "image/jpeg",
            Metadata: { source: "pinterest", "pin-id": rec.pinId },
          })
        );
        uploaded++;
        if (uploaded % 50 === 0) console.log(`  …uploaded ${uploaded}`);
      } catch (e) {
        rec.uploadError = e.message;
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: ARGS.concurrency }, worker));
  await writeFile(ARGS.out, JSON.stringify(records, null, 2) + "\n");
  console.log(`\n✓ uploaded ${uploaded}, skipped ${skipped}, failed ${failed} -> s3://${ARGS.bucket}/${ARGS.prefix}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

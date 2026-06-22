// Pinterest (public RSS) -> S3 image scraper.
//
// The Pinterest v5 content API is user-scoped and our app token is currently
// rejected ("consumer type not supported"), so this pulls PUBLIC pins from the
// no-auth RSS feeds Pinterest still serves:
//   user feed : https://www.pinterest.com/<user>/feed.rss
//   board feed: https://www.pinterest.com/<user>/<board-slug>.rss
//
// For each pin it extracts the i.pinimg.com image, upgrades the resolution
// (236x -> originals), downloads it, and uploads it to the S3 media bucket,
// writing a manifest the embedder step can consume.
//
// Usage:
//   node pinterest-rss.mjs --dry-run                      # parse only, no AWS
//   node pinterest-rss.mjs --users etsy,marthastewart     # scrape -> $MEDIA_BUCKET
//   node pinterest-rss.mjs --boards etsy/gift-guide --limit 50
//   node pinterest-rss.mjs --bucket giftmaxxing-dev-media --skip-existing
//
// Config (env): MEDIA_BUCKET, AWS_REGION, PINTEREST_RSS_USERS (comma list),
// plus the standard AWS credential chain. Node 18+ (global fetch).

import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Sensible gift-relevant public accounts so a bare run does something useful.
// Override with --users / --boards / PINTEREST_RSS_USERS.
const DEFAULT_USERS = ["etsy", "marthastewart", "uncommongoods"];

function parseArgs(argv) {
  const args = { dryRun: false, limit: 0, prefix: "images/", concurrency: 6 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--skip-existing") args.skipExisting = true;
    else if (a === "--users") args.users = argv[++i];
    else if (a === "--boards") args.boards = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--bucket") args.bucket = argv[++i];
    else if (a === "--prefix") args.prefix = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--concurrency") args.concurrency = Number(argv[++i]);
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s) {
  return String(s ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : "";
};

// Swap the i.pinimg.com size segment (e.g. /236x/ or /564x/) for `size`.
function withSize(url, size) {
  return url.replace(/\/(originals|\d+x\d*)\//, `/${size}/`);
}

// Build the feed URL: "user" -> user feed, "user/board" -> board feed.
function feedUrl(source) {
  const clean = source.replace(/^https?:\/\/(www\.)?pinterest\.com\//i, "").replace(/\/+$/g, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length >= 2) return `https://www.pinterest.com/${parts[0]}/${parts[1]}.rss`;
  return `https://www.pinterest.com/${parts[0]}/feed.rss`;
}

async function fetchFeed(source) {
  const url = feedUrl(source);
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml,text/xml" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

function parseItems(xml, source) {
  const owner = source.split("/")[0];
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const link = decodeEntities(tag(block, "link"));
    const title = decodeEntities(tag(block, "title"));
    const pubDate = tag(block, "pubDate");
    const desc = decodeEntities(tag(block, "description"));
    const img = (desc.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1];
    const pinId = (link.match(/\/pin\/(\d+)/) || [])[1];
    if (!pinId || !img) continue;
    out.push({
      id: `pin-${pinId}`,
      pinId,
      source: "pinterest-rss",
      sourceUser: owner,
      pinUrl: link,
      title,
      pubDate: pubDate || null,
      imageUrl: img,
    });
  }
  return out;
}

async function fetchImage(rec) {
  const candidates = [...new Set([withSize(rec.imageUrl, "originals"), withSize(rec.imageUrl, "736x"), rec.imageUrl])];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) continue; // skip 1px / error images
      return { buf, contentType, resolvedUrl: url };
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

// Run async `worker` over `items` with a fixed-size pool.
async function pool(items, size, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = (args.boards || args.users || process.env.PINTEREST_RSS_USERS || DEFAULT_USERS.join(","))
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Sources (${sources.length}): ${sources.join(", ")}`);

  // 1. Fetch + parse every feed, dedup pins by id.
  const byId = new Map();
  for (const src of sources) {
    try {
      const xml = await fetchFeed(src);
      let recs = parseItems(xml, src);
      if (args.limit) recs = recs.slice(0, args.limit);
      for (const r of recs) if (!byId.has(r.id)) byId.set(r.id, r);
      console.log(`  ✓ ${src}: ${recs.length} pins`);
    } catch (e) {
      console.warn(`  ! ${src}: ${e.message}`);
    }
    await sleep(500); // be polite
  }
  const records = [...byId.values()];
  console.log(`\nParsed ${records.length} unique pins.`);

  const outFile = args.out ? resolve(process.cwd(), args.out) : join(__dirname, "pins.manifest.json");

  if (args.dryRun) {
    await writeFile(outFile, JSON.stringify(records, null, 2) + "\n");
    console.log(`\n[dry-run] wrote manifest -> ${outFile}`);
    if (records[0]) console.log("Sample:\n" + JSON.stringify(records[0], null, 2));
    return;
  }

  // 2. Download + upload to S3.
  const bucket = args.bucket || process.env.MEDIA_BUCKET;
  if (!bucket) throw new Error("No bucket: pass --bucket or set MEDIA_BUCKET (run terraform apply first).");
  const region = process.env.AWS_REGION || "us-east-1";

  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({ region });

  let uploaded = 0,
    skipped = 0,
    failed = 0;

  await pool(records, args.concurrency, async (rec) => {
    const Key = `${args.prefix}${rec.id}.jpg`;
    rec.bucket = bucket;
    rec.s3Key = Key;
    rec.s3Uri = `s3://${bucket}/${Key}`;

    if (args.skipExisting) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key }));
        rec.skipped = true;
        skipped++;
        return;
      } catch {
        /* not present -> upload */
      }
    }

    const img = await fetchImage(rec);
    if (!img) {
      rec.error = "image fetch failed";
      failed++;
      console.warn(`  ! ${rec.id}: image fetch failed`);
      return;
    }
    rec.resolvedUrl = img.resolvedUrl;
    rec.contentType = img.contentType;
    rec.bytes = img.buf.length;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key,
        Body: img.buf,
        ContentType: img.contentType,
        // S3 metadata must be ASCII; keep the full title in the manifest only.
        Metadata: { source: rec.source, "source-user": rec.sourceUser, "pin-id": rec.pinId },
      })
    );
    uploaded++;
    if (uploaded % 25 === 0) console.log(`  …uploaded ${uploaded}`);
  });

  await writeFile(outFile, JSON.stringify(records, null, 2) + "\n");
  console.log(`\n✓ uploaded ${uploaded}, skipped ${skipped}, failed ${failed} -> s3://${bucket}/${args.prefix}`);
  console.log(`Manifest (${records.length} records) -> ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

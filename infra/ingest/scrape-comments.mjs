// Comment scraper for the gift-knowledge base.
//
// The actual "here's what to give them" suggestions live in the COMMENTS of the
// gift-discussion threads. This fetches top comments (via PullPush) for every
// scraped thread that has a known recipient, so we can mine recipient -> ideas
// from the real discussion. Writes reddit-comments.json.
//
// Usage:
//   node scrape-comments.mjs --dry-run        # show target count + breakdown
//   node scrape-comments.mjs --limit=600      # cap number of threads
//   node scrape-comments.mjs                  # full run

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichRecord } from "./enrich.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));
const COMMENT_API = "https://api.pullpush.io/reddit/search/comment/";

async function fetchComments(linkId, { size = 40, retries = 3 } = {}) {
  const url = `${COMMENT_API}?link_id=${linkId}&size=${size}&sort=desc&sort_type=score`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "giftmaxxing-comment-scraper" } });
      if (res.status === 429) {
        await SLEEP(3000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.data ?? [])
        .map((c) => ({ body: (c.body ?? "").slice(0, 500), score: c.score ?? 0 }))
        .filter((c) => c.body && c.body !== "[deleted]" && c.body !== "[removed]");
    } catch (e) {
      if (attempt === retries) {
        console.warn(`  ! ${linkId}: ${e.message}`);
        return [];
      }
      await SLEEP(1000 * attempt);
    }
  }
  return [];
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const maxThreads = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const inFile = join(__dirname, "..", "..", "web", "lib", "reddit-gifts.json");
  const subs = JSON.parse(await readFile(inFile, "utf8"));

  // Targets: threads with a known recipient, highest-engagement first.
  const targets = subs
    .map((r) => ({ r, e: enrichRecord(r) }))
    .filter(({ e }) => e.recipient !== "anyone")
    .sort((a, b) => (b.r.score || 0) - (a.r.score || 0))
    .slice(0, maxThreads);

  const breakdown = {};
  for (const { e } of targets) breakdown[e.recipient] = (breakdown[e.recipient] || 0) + 1;
  console.log(`Recipient-bearing threads: ${targets.length} (of ${subs.length})`);
  console.log("By recipient:", breakdown);
  console.log(`Est. time at ~0.7s/thread: ~${Math.ceil((targets.length * 0.7) / 60)} min`);
  if (dry) return;

  const out = [];
  let done = 0;
  for (const { r, e } of targets) {
    const linkId = String(r.id).split("-").pop(); // rd-<sub>-<base36id> -> <base36id>
    const comments = await fetchComments(linkId);
    out.push({
      id: linkId,
      recipient: e.recipient,
      occasion: e.occasion,
      subreddit: r.subreddit,
      title: r.name,
      url: r.url,
      score: r.score || 0,
      comments,
    });
    done++;
    if (done % 25 === 0) {
      const total = out.reduce((n, t) => n + t.comments.length, 0);
      console.log(`  ${done}/${targets.length} threads · ${total} comments`);
    }
    await SLEEP(700);
  }

  const outFile = join(__dirname, "reddit-comments.json");
  await writeFile(outFile, JSON.stringify(out, null, 2) + "\n");
  const total = out.reduce((n, t) => n + t.comments.length, 0);
  console.log(`\nWrote ${outFile}: ${out.length} threads, ${total} comments.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

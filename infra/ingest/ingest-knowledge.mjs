// Reddit knowledge -> DynamoDB ingestion.
//
// Builds the recipient -> {ideas, bundles} knowledge base (see knowledge.mjs)
// from the scraped posts + comments, then writes ONE item per recipient into the
// KNOWLEDGE table. Run after scraping comments + posts.
//
// Usage:
//   node ingest-knowledge.mjs --dry-run         # write knowledge.ingest.json, no AWS
//   node ingest-knowledge.mjs                    # load into $KNOWLEDGE_TABLE
//   node ingest-knowledge.mjs --table giftmaxxing-dev-knowledge
//
// Config (env): KNOWLEDGE_TABLE, AWS_REGION, plus the standard AWS credentials.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichRecord } from "./enrich.mjs";
import { buildKnowledge } from "./knowledge.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function loadJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function batchWrite(ddb, BatchWriteCommand, table, items) {
  let written = 0;
  for (const c of chunk(items, 25)) {
    let request = { [table]: c.map((Item) => ({ PutRequest: { Item } })) };
    for (let attempt = 0; attempt < 6; attempt++) {
      const out = await ddb.send(new BatchWriteCommand({ RequestItems: request }));
      const unprocessed = out.UnprocessedItems?.[table] ?? [];
      written += request[table].length - unprocessed.length;
      if (unprocessed.length === 0) break;
      request = { [table]: unprocessed };
      await sleep(2 ** attempt * 100);
    }
  }
  return written;
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const tableArg = argv.includes("--table") ? argv[argv.indexOf("--table") + 1] : null;

  const records = (await loadJson(join(__dirname, "..", "..", "web", "lib", "reddit-gifts.json"), [])).map(
    (r) => ({ ...r, __enriched: enrichRecord(r) })
  );
  const comments = await loadJson(join(__dirname, "reddit-comments.json"), []);
  const kb = buildKnowledge(records, comments);
  const items = kb.recipients.map((r) => ({ ...r, generatedAt: kb.generatedAt }));
  console.log(
    `Built knowledge for ${items.length} recipients from ${records.length} posts + ${comments.length} comment threads.`
  );

  if (dryRun) {
    const out = join(__dirname, "knowledge.ingest.json");
    await writeFile(out, JSON.stringify(items, null, 2) + "\n");
    console.log(`[dry-run] wrote ${items.length} items -> ${out}`);
    return;
  }

  const table = tableArg || process.env.KNOWLEDGE_TABLE || "giftmaxxing-dev-knowledge";
  const region = process.env.AWS_REGION || "us-east-1";
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient, BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  console.log(`Writing to DynamoDB table "${table}" in ${region}…`);
  const written = await batchWrite(ddb, BatchWriteCommand, table, items);
  console.log(`\n✓ ingested ${written}/${items.length} recipients into ${table}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

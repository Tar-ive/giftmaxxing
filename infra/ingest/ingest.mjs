// Reddit -> DynamoDB ingestion pipeline.
//
// Reads scraped gift records from web/lib/reddit-gifts.json, transforms them
// into the `posts` table item shape (see transform.mjs), and bulk-loads them
// into DynamoDB via BatchWrite (25/req) with retry of UnprocessedItems.
//
// This is designed to run the moment the AWS resources exist. Until then use
// --dry-run to validate the transformed payload without touching AWS.
//
// Usage:
//   node ingest.mjs --dry-run                 # write posts.ingest.json, no AWS
//   node ingest.mjs                           # load into $POSTS_TABLE
//   node ingest.mjs --table giftmaxxing-dev-posts --limit 200
//   node ingest.mjs --file ../../web/lib/reddit-gifts.json
//
// Config (env): POSTS_TABLE, AWS_REGION, plus the standard AWS credential
// chain (env vars, shared config, or SSO profile).

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "./transform.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--table") args.table = argv[++i];
    else if (a === "--file") args.file = argv[++i];
    else if (a === "--out") args.out = argv[++i];
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chunk(arr, n) {
  return Array.from({ length: Math.ceil(arr.length / n) }, (_, i) =>
    arr.slice(i * n, i * n + n)
  );
}

// BatchWrite a single table with exponential-backoff retry of UnprocessedItems.
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
      await sleep(2 ** attempt * 100); // 100ms, 200ms, 400ms, ...
    }
  }
  return written;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args.file
    ? resolve(process.cwd(), args.file)
    : join(__dirname, "..", "..", "web", "lib", "reddit-gifts.json");

  const records = JSON.parse(await readFile(file, "utf8"));
  const items = transform(records, { limit: args.limit });
  console.log(`Transformed ${items.length} posts from ${records.length} scraped records.`);

  if (args.dryRun) {
    const out = args.out
      ? resolve(process.cwd(), args.out)
      : join(__dirname, "posts.ingest.json");
    await writeFile(out, JSON.stringify(items, null, 2) + "\n");
    console.log(`\n[dry-run] wrote payload -> ${out}`);
    console.log("Sample item:\n" + JSON.stringify(items[0], null, 2));
    return;
  }

  const table = args.table || process.env.POSTS_TABLE || "giftmaxxing-dev-posts";
  const region = process.env.AWS_REGION || "us-east-1";

  // Import the AWS SDK lazily so --dry-run works without it installed.
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient, BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  console.log(`Writing to DynamoDB table "${table}" in ${region}…`);
  const written = await batchWrite(ddb, BatchWriteCommand, table, items);
  console.log(`\n✓ ingested ${written}/${items.length} posts into ${table}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Embedder backfill: S3 image (+ pin title) -> Bedrock Titan Multimodal -> S3 Vectors.
//
// Reads the manifest written by pinterest-rss.mjs, pulls each image from the S3
// media bucket, embeds it (image + title in one shared-space vector) with Titan
// Multimodal Embeddings, and upserts it into the S3 Vectors index via PutVectors.
//
// Usage:
//   set -a; source ../../.env; set +a
//   node embed.mjs                       # embed everything in pins.manifest.json
//   node embed.mjs --limit 10 --dry-run  # embed N, print vectors, skip PutVectors
//
// Config (env): MEDIA_BUCKET, VECTOR_BUCKET, VECTOR_INDEX, VECTOR_DIM,
// BEDROCK_EMBED_MODEL_ID, AWS_REGION. Run s3vectors-setup.mjs first.

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3VectorsClient, PutVectorsCommand } from "@aws-sdk/client-s3vectors";

const __dirname = dirname(fileURLToPath(import.meta.url));

const REGION = process.env.AWS_REGION || "us-east-1";
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || "giftmaxxing-dev-media";
const VECTOR_BUCKET = process.env.VECTOR_BUCKET || "giftmaxxing-dev-vectors";
const VECTOR_INDEX = process.env.VECTOR_INDEX || "pins";
const DIM = Number(process.env.VECTOR_DIM || 1024);
const MODEL = process.env.BEDROCK_EMBED_MODEL_ID || "amazon.titan-embed-image-v1";

const s3 = new S3Client({ region: REGION });
const bedrock = new BedrockRuntimeClient({ region: REGION });
const s3v = new S3VectorsClient({ region: REGION });

function parseArgs(argv) {
  const a = { limit: 0, dryRun: false, batch: 50, concurrency: 5 };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--dry-run") a.dryRun = true;
    else if (x === "--limit") a.limit = Number(argv[++i]);
    else if (x === "--manifest") a.manifest = argv[++i];
    else if (x === "--batch") a.batch = Number(argv[++i]);
    else if (x === "--concurrency") a.concurrency = Number(argv[++i]);
  }
  return a;
}

const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function imageB64(rec) {
  if (rec.s3Key) {
    const out = await s3.send(new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: rec.s3Key }));
    return (await streamToBuffer(out.Body)).toString("base64");
  }
  const res = await fetch(rec.imageUrl);
  if (!res.ok) throw new Error(`image ${rec.imageUrl} -> HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

// One shared-space vector from the image + (truncated) title.
async function embed(rec) {
  const body = { inputImage: await imageB64(rec), embeddingConfig: { outputEmbeddingLength: DIM } };
  if (rec.title) body.inputText = rec.title.slice(0, 200); // Titan MM text cap
  const out = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    })
  );
  const { embedding } = JSON.parse(Buffer.from(out.body).toString("utf8"));
  return embedding;
}

async function pool(items, size, worker) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        await worker(items[idx], idx);
      }
    })
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args.manifest
    ? resolve(process.cwd(), args.manifest)
    : join(__dirname, "pins.manifest.json");
  let records = JSON.parse(await readFile(file, "utf8"));
  if (args.limit) records = records.slice(0, args.limit);
  console.log(`Embedding ${records.length} pins (model=${MODEL}, dim=${DIM})…`);

  const vectors = [];
  let done = 0,
    failed = 0;
  await pool(records, args.concurrency, async (rec) => {
    try {
      const embedding = await embed(rec);
      vectors.push({
        key: rec.id,
        data: { float32: embedding },
        metadata: {
          title: rec.title ?? "",
          pinUrl: rec.pinUrl ?? "",
          imageUrl: rec.imageUrl ?? "",
          s3Key: rec.s3Key ?? "",
          sourceUser: rec.sourceUser ?? "",
          source: rec.source ?? "pinterest-rss",
        },
      });
      if (++done % 20 === 0) console.log(`  …embedded ${done}`);
    } catch (e) {
      failed++;
      console.warn(`  ! ${rec.id}: ${e.message}`);
    }
  });
  console.log(`Embedded ${vectors.length} (failed ${failed}).`);

  if (args.dryRun) {
    console.log("[dry-run] skipping PutVectors. Sample vector:");
    const s = vectors[0];
    if (s) console.log(JSON.stringify({ key: s.key, dims: s.data.float32.length, metadata: s.metadata }, null, 2));
    return;
  }

  let put = 0;
  for (const c of chunk(vectors, args.batch)) {
    await s3v.send(
      new PutVectorsCommand({ vectorBucketName: VECTOR_BUCKET, indexName: VECTOR_INDEX, vectors: c })
    );
    put += c.length;
    console.log(`  …put ${put}/${vectors.length}`);
  }
  console.log(`\n✓ upserted ${put} vectors into ${VECTOR_BUCKET}/${VECTOR_INDEX}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

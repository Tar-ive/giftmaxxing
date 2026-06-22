// Query the S3 Vectors index — proves the recommendation similarity search works.
//
//   set -a; source ../../.env; set +a
//   node vector-query.mjs --text "cozy ceramic coffee mug"   # text -> image kNN
//   node vector-query.mjs --key pin-155303888285817876        # "more like this"
//   node vector-query.mjs --text "vintage camera" --user etsy --top-k 8
//
// Config (env): VECTOR_BUCKET, VECTOR_INDEX, VECTOR_DIM, BEDROCK_EMBED_MODEL_ID.

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import {
  S3VectorsClient,
  QueryVectorsCommand,
  GetVectorsCommand,
} from "@aws-sdk/client-s3vectors";

const REGION = process.env.AWS_REGION || "us-east-1";
const VECTOR_BUCKET = process.env.VECTOR_BUCKET || "giftmaxxing-dev-vectors";
const VECTOR_INDEX = process.env.VECTOR_INDEX || "pins";
const DIM = Number(process.env.VECTOR_DIM || 1024);
const MODEL = process.env.BEDROCK_EMBED_MODEL_ID || "amazon.titan-embed-image-v1";

const bedrock = new BedrockRuntimeClient({ region: REGION });
const s3v = new S3VectorsClient({ region: REGION });

function parseArgs(argv) {
  const a = { topK: 5 };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--text") a.text = argv[++i];
    else if (x === "--key") a.key = argv[++i];
    else if (x === "--user") a.user = argv[++i];
    else if (x === "--top-k") a.topK = Number(argv[++i]);
  }
  return a;
}

async function embedText(text) {
  const out = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputText: text, embeddingConfig: { outputEmbeddingLength: DIM } }),
    })
  );
  return JSON.parse(Buffer.from(out.body).toString("utf8")).embedding;
}

async function vectorForKey(key) {
  const out = await s3v.send(
    new GetVectorsCommand({
      vectorBucketName: VECTOR_BUCKET,
      indexName: VECTOR_INDEX,
      keys: [key],
      returnData: true,
    })
  );
  const v = (out.vectors ?? [])[0];
  if (!v) throw new Error(`key not found: ${key}`);
  return v.data?.float32;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.text && !args.key) throw new Error("pass --text <query> or --key <vector-key>");

  const queryVector = args.text ? await embedText(args.text) : await vectorForKey(args.key);
  const filter = args.user ? { sourceUser: { $eq: args.user } } : undefined;

  const out = await s3v.send(
    new QueryVectorsCommand({
      vectorBucketName: VECTOR_BUCKET,
      indexName: VECTOR_INDEX,
      topK: args.topK + (args.key ? 1 : 0), // drop the seed itself for --key
      queryVector: { float32: queryVector },
      returnMetadata: true,
      returnDistance: true,
      filter,
    })
  );

  const results = (out.vectors ?? []).filter((v) => v.key !== args.key);
  console.log(`\nQuery: ${args.text ? `"${args.text}"` : `like ${args.key}`}${args.user ? ` [user=${args.user}]` : ""}`);
  console.log(`Top ${results.length} of ${VECTOR_BUCKET}/${VECTOR_INDEX}:\n`);
  for (const v of results.slice(0, args.topK)) {
    const sim = v.distance != null ? (1 - v.distance).toFixed(3) : "?";
    const title = (v.metadata?.title ?? "").slice(0, 70);
    console.log(`  ${sim}  ${v.key}  [${v.metadata?.sourceUser ?? "?"}]  ${title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

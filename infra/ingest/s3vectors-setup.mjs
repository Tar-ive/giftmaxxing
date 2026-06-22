// Create the S3 Vectors bucket + index for pin embeddings (idempotent).
//
// S3 Vectors (preview) is the canonical vector store: a "vector bucket" holds
// one or more "indexes"; each index has a fixed dimension + distance metric and
// stores { key, float32[], metadata } records you query with kNN.
//
// Run once (re-running is safe — already-exists is treated as success):
//   set -a; source ../../.env; set +a
//   node s3vectors-setup.mjs
//
// Config (env): VECTOR_BUCKET, VECTOR_INDEX, VECTOR_DIM, VECTOR_METRIC, AWS_REGION.

import {
  S3VectorsClient,
  CreateVectorBucketCommand,
  CreateIndexCommand,
  GetIndexCommand,
} from "@aws-sdk/client-s3vectors";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.VECTOR_BUCKET || "giftmaxxing-dev-vectors";
const INDEX = process.env.VECTOR_INDEX || "pins";
const DIM = Number(process.env.VECTOR_DIM || 1024);
const METRIC = process.env.VECTOR_METRIC || "cosine"; // cosine | euclidean

// Large/opaque fields we want to store but never filter on (keeps filterable
// metadata small; titles/URLs are returned with results for rendering).
const NON_FILTERABLE = ["title", "pinUrl", "imageUrl", "s3Key"];

const s3v = new S3VectorsClient({ region: REGION });
const isExists = (e) =>
  /Conflict|AlreadyExists|exists/i.test(e?.name || "") || /exist/i.test(e?.message || "");

async function main() {
  // 1. Vector bucket
  try {
    await s3v.send(new CreateVectorBucketCommand({ vectorBucketName: BUCKET }));
    console.log(`✓ created vector bucket ${BUCKET}`);
  } catch (e) {
    if (isExists(e)) console.log(`• vector bucket ${BUCKET} already exists`);
    else throw e;
  }

  // 2. Index
  try {
    await s3v.send(
      new CreateIndexCommand({
        vectorBucketName: BUCKET,
        indexName: INDEX,
        dataType: "float32",
        dimension: DIM,
        distanceMetric: METRIC,
        metadataConfiguration: { nonFilterableMetadataKeys: NON_FILTERABLE },
      })
    );
    console.log(`✓ created index ${INDEX} (dim=${DIM}, ${METRIC})`);
  } catch (e) {
    if (isExists(e)) console.log(`• index ${INDEX} already exists`);
    else throw e;
  }

  // 3. Print the ARNs (used to scope IAM for the API Lambda).
  const { index } = await s3v.send(
    new GetIndexCommand({ vectorBucketName: BUCKET, indexName: INDEX })
  );
  console.log("\nIndex details:");
  console.log(JSON.stringify(index, null, 2));
  console.log(`\nVECTOR_BUCKET=${BUCKET}\nVECTOR_INDEX=${INDEX}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

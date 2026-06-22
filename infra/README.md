# Giftmaxxing — Terraform infrastructure

Serverless backend for the Giftmaxxing app: **DynamoDB + Lambda + API Gateway (HTTP API)**.

## Resources

- `dynamodb.tf` — `users`, `posts`, `interactions` tables (PAY_PER_REQUEST, PITR on). `posts` has a `byAuthor` GSI.
- `lambda.tf` — single Node.js 20 API handler (`src/handler.mjs`), zipped via the `archive` provider.
- `iam.tf` — least-privilege role: CloudWatch Logs + DynamoDB scoped to these tables.
- `apigateway.tf` — HTTP API with a `$default` proxy route to the Lambda, CORS, and access logs.

## Prerequisites

Valid AWS credentials in your shell. From the repo root the `.env` holds temporary
SSO creds; load them before running Terraform:

```bash
set -a; source ../.env; set +a
```

## Usage

```bash
terraform init
terraform plan
terraform apply
```

After apply, grab the API URL:

```bash
terraform output -raw api_endpoint
```

Put that in `web/.env.local` as `NEXT_PUBLIC_API_URL=<url>`.

## API routes (handled inside the Lambda)

| Method | Path                      | Purpose                                  |
|--------|---------------------------|------------------------------------------|
| GET    | `/feed?limit=&author=`    | List posts (optionally by author)        |
| GET    | `/posts/{id}`             | Single post                              |
| POST   | `/interactions`           | Record like/save/comment (idempotent)    |
| GET    | `/recommendations?userId=`| Ranked posts for a user                  |
| POST   | `/seed`                   | Dev-only: bulk-load sample users/posts   |

## Planned: image → vector pipeline (see `../CLOUD.md`)

The next infra additions wire Pinterest/catalog images into the recommender as
multimodal embeddings. Full design, rate limits, and cost are in
[`../CLOUD.md`](../CLOUD.md); the Terraform to add:

- `s3.tf` — private media bucket (`giftmaxxing-<env>-media`) for source images + thumbnails, with an `ObjectCreated` notification to the embedder Lambda.
- `dynamodb.tf` — `embeddings` table (PK `itemId`; `vector`, `dims`, `source`, `ownerId`, `pHash`, `tags`, `link`) with a `bySource` GSI. (Phase 1 stores vectors here; Phase 2 migrates to **Amazon S3 Vectors**.)
- `lambda.tf` — `embedder` function: S3 event → **Bedrock `InvokeModel`** (`amazon.titan-embed-image-v1`) → write vector + metadata.
- `iam.tf` — add `bedrock:InvokeModel` on the Titan model, S3 read on the media bucket, DynamoDB write on `embeddings`.

> **Before deploying:** enable Bedrock model access for Titan Multimodal Embeddings in
> the account/region, and re-verify list prices (Titan MM, S3 Vectors). Dev-scale cost
> is **≈ a few $/mo** (embedding 10k images ≈ $0.60 one-time; vectors ~$0 in Phase 1).

## Teardown

```bash
terraform destroy
```

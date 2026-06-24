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

## Monitoring & cost runbook

Everything here is **free** — there are **no CloudWatch alarms** (by design). After
`terraform apply`, grab the console links:

```bash
terraform output resource_group_url   # all resources, one tag-based view
terraform output dashboard_url        # usage metrics dashboard
terraform output cost_dashboard_url   # estimated charges (month-to-date)
```

### Resource Group ("Resource Manager")
`Resource Groups & Tag Editor → Saved resource groups → giftmaxxing-<env>-resources`.
It selects everything tagged `Project=giftmaxxing` + `Env=<env>` — and since the
provider's `default_tags` stamp every taggable resource, new resources appear
automatically. Use the **Tag Editor** there to find/fix any untagged resources.

### Usage stats (CloudWatch dashboard, no alarms)
`giftmaxxing-<env>-overview`: API Gateway (requests / 4xx / 5xx / latency), API +
reminders Lambdas (invocations / errors / duration / throttles), all six DynamoDB
tables (read / write / throttle), S3 media, SNS, Bedrock, and a recent-errors log panel.

### Price (two ways)
1. **CloudWatch cost dashboard** `giftmaxxing-<env>-cost` — `AWS/Billing` total +
   by-service. One-time enable: **Billing → Billing preferences → "Receive
   CloudWatch billing alerts"** (us-east-1 only; data lags ~6h).
2. **Cost Explorer, by project** — activate the tag once (set
   `enable_cost_allocation_tags = true` on the payer account, or Billing → Cost
   allocation tags → activate `Project` / `Env`; ~24h to populate), then
   **Cost Explorer → Group by → Tag: `Project`**.

### Weekly habit (~2 min, console-only)
- [ ] **Resource Group** — confirm nothing unexpected / everything tagged.
- [ ] **overview** dashboard — scan for error / 5xx / throttle spikes + latency.
- [ ] **cost** dashboard — MTD total vs last week; eyeball by-service.
- [ ] (monthly) **Cost Explorer** grouped by `Project` for the real per-project bill.

### Notes
- **No alarms** are provisioned (each ~$0.10/mo). For a passive email cap later, AWS
  **Budgets** offers 2 free budgets — cheaper than alarms.
- **CloudWatch free tier**: 3 dashboards × up to 50 metrics each. Usage (~49) and
  cost (9) are split to stay free; piling more metrics onto `overview` may tip it over.
- **S3 Vectors** (`giftmaxxing-<env>-vectors`, index `pins`) is **not** Terraform-
  managed (created by `ingest/s3vectors-setup.mjs`), but that script now **tags** the
  bucket + index (`Project` / `Env` / `ManagedBy=s3vectors-setup`), so they're covered by
  cost allocation and the Tag Editor. Caveat: S3 Vectors is a new resource type, so it may
  not yet surface in the Resource Group UI even though it's correctly tagged.

## Teardown

```bash
terraform destroy
```

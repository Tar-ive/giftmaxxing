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

## Teardown

```bash
terraform destroy
```

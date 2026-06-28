# Post-Deploy Wiring Instructions

This document describes the Terraform and backend wiring steps required after the
frontend changes in this PR are merged. These cannot be run inside Devin's VM and
must be executed in an environment with AWS credentials for account `445056752928`
in `us-east-1`.

---

## Summary of Infrastructure Changes

| Change | File | Impact |
|--------|------|--------|
| `genderPref` field stored on connections | `infra/src/handler.mjs` | No schema migration needed (DynamoDB is schemaless) |
| `GET /bundles` API route added | `infra/src/handler.mjs` | New read-only route; no new tables or IAM |
| No new DynamoDB tables | — | Existing `connections` + `posts` tables used |
| No new Lambda functions | — | All routes in the single `handler.mjs` monolith |

---

## Step 1: Deploy the Lambda (handler.mjs changes)

The handler update adds:
1. `genderPref` parsing + storage on `POST /connections`
2. `GET /bundles?userId=&connectionId=` route (reads from connections + posts tables)

```bash
cd infra

# Install handler dependencies (s3vectors SDK)
cd src && npm ci && cd ..

# Plan — should show only the Lambda function updating (source_code_hash change)
terraform plan -var-file=production.tfvars -out=plan.out

# Expected changes:
#   ~ aws_lambda_function.api (source_code_hash, filename)
#   ~ data.archive_file.api (output_base64sha256)
# NO new resources, NO IAM changes, NO table changes.

# Apply
terraform apply plan.out
```

### Verification

```bash
# Test genderPref is stored
curl -X POST https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com/connections \
  -H "content-type: application/json" \
  -d '{"senderId":"test_user","guest":{"name":"TestGuy","genderPref":"he","vibes":["tech"],"seeds":["pin_1"]}}'

# Test bundle endpoint
curl "https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com/bundles?userId=test_user&connectionId=<id_from_above>"
```

---

## Step 2: Verify Frontend Reads

After the Lambda is deployed, the frontend will:
1. Send `genderPref` in `POST /connections` when a challenge is completed
2. Read connections via `GET /connections?userId=` (already works, now returns `genderPref`)
3. Optionally call `GET /bundles` for server-side bundle generation (currently bundles
   are computed client-side from seeds stored in the connection — the API route is a
   future enhancement for when the catalog grows beyond what ships in `pins.ts`)

No `NEXT_PUBLIC_*` env var changes needed — the API base URL is unchanged.

---

## Step 3: Future Enhancements (not blocking this PR)

These are optional follow-ups that extend the bundle/delivery system:

### 3a. Real delivery date integration

Currently `estimatedDeliveryDays()` uses a simple price-tier heuristic (3/5/7 days).
To integrate real shipping data:

1. Add an `estimatedDeliveryDays` field to posts in DynamoDB (populate via PA-API
   enrichment in `infra/ingest/paapi-enrich.mjs`)
2. Update `GET /bundles` to read `item.estimatedDeliveryDays` instead of computing it

### 3b. Maxi-powered bundle curation

The current bundle is a direct lookup of seed pins. To have Maxi (Bedrock) curate a
smarter bundle that accounts for gender preference, budget, and occasion:

1. Add a `POST /bundles/generate` route that invokes Bedrock Converse with the
   connection's taste profile
2. Cache generated bundles in a new `bundles` DynamoDB table (PK: connectionId)
3. Update the frontend `SoloGiftCard` to call this endpoint

### 3c. One-click checkout

The "One-click checkout bundle" button is scaffolded in the frontend but not wired.
To complete:

1. Integrate with Amazon Associates / PA-API cart creation
2. Or implement Stripe Checkout for direct purchase flow
3. Add a `POST /checkout` route that creates an order record

### 3d. Gender-preference-aware vector recommendations

Currently gender preference only reorders the local PINS deck. To use it in the
vector recommender:

1. Add `genderPref` as a metadata filter in the S3 Vectors query
   (`infra/src/handler.mjs` → `GET /recommendations` route)
2. Tag each vector with gender-affinity metadata during ingest
   (`infra/ingest/ingest-pins.mjs` → add `genderAffinity` to vector metadata)

---

## No-Op Confirmation Checklist

Before applying, confirm:
- [ ] `terraform plan` shows ONLY the Lambda function update (no surprise resource creation)
- [ ] No new IAM permissions are required (bundles route reads from existing tables the Lambda already has access to)
- [ ] No DynamoDB table changes (genderPref is an optional attribute, no GSI needed)
- [ ] The `GET /bundles` route is NOT in `isPublicRoute()` — it requires auth (only the sender can view their own bundles)

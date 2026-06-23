# DEPLOY.md — Agent Deployment Playbook for Giftmaxxing

> **What this is.** A step-by-step prompt for an AI coding agent (Devin, Claude Code,
> Cursor, etc.) to deploy the pending changes that surface Pinterest images in the
> feed alongside Reddit posts. Follow every step in order. Do not skip steps.

---

## Prerequisites

You need **AWS credentials** with permissions for:
- Lambda (`lambda:UpdateFunctionCode`, `lambda:GetFunction`)
- DynamoDB (`dynamodb:Scan`, `dynamodb:BatchWriteItem`, `dynamodb:GetItem`)
- S3 (`s3:GetObject` on `giftmaxxing-dev-media`)
- Terraform state (S3 backend or local, depending on setup)

**Region:** `us-east-1`  
**Account:** `445056752928`  
**Repo:** `github.com/Tar-ive/giftmaxxing`

---

## Step 1: Merge the open PRs

There are two PRs that need to be merged into `main` in order:

1. **PR #1** — [feat: swap Home and Drops](https://github.com/Tar-ive/giftmaxxing/pull/1)
   - Moves the IdeasExplorer (recipient picker + gift ideas) from Home (`/feed`) to Drops (`/feed/drops`)
   - Restores the infinite-scroll recommendation feed on the Home page
   - Vercel preview build passes

2. **PR #3** — [feat: ingest Pinterest pins into feed](https://github.com/Tar-ive/giftmaxxing/pull/3)
   - Adds `infra/ingest/ingest-pins.mjs` (Pinterest → DynamoDB ingest script)
   - Updates `infra/src/handler.mjs` (over-samples DynamoDB scan for proper source blending)
   - Fixes store race condition in `web/components/app/store.tsx`
   - Updates `CLOUD.md` roadmap
   - Vercel preview build passes

Merge both PRs (squash merge is fine). The Vercel frontend will auto-deploy on push to `main`.

```bash
gh pr merge 1 --squash
gh pr merge 3 --squash
```

---

## Step 2: Deploy the Lambda (required for feed blending)

The handler change in PR #3 (over-sampling scan) needs a Lambda redeployment. The Lambda
is managed by Terraform in `infra/`.

### Option A: Terraform apply (recommended)

```bash
cd infra/

# Install the S3 Vectors SDK that gets bundled with the Lambda zip
cd src && npm ci && cd ..

# Plan and apply
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

This will:
- Re-zip `infra/src/` (handler.mjs + node_modules) into `infra/build/api.zip`
- Update the Lambda function `giftmaxxing-dev-api` with the new code
- The `source_code_hash` change triggers the update automatically

### Option B: Manual Lambda update (if Terraform state is not available)

```bash
cd infra/src && npm ci && cd ..

# Zip the Lambda code
cd src && zip -r ../build/api.zip . && cd ..

# Update the Lambda function directly
aws lambda update-function-code \
  --function-name giftmaxxing-dev-api \
  --zip-file fileb://build/api.zip \
  --region us-east-1
```

---

## Step 3: Verify Pinterest pins are in DynamoDB

The 72 Pinterest pins have already been ingested into the `posts` table via the `/seed`
API endpoint. Verify they exist:

```bash
# Check a known pin by ID
curl -s "https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com/posts/pin-155303888285821723" | python3 -m json.tool | head -5
```

Expected: a JSON object with `"postId": "pin-155303888285821723"`, `"source": "Pinterest/etsy"`, and an `image` URL pointing to `i.pinimg.com/originals/...`.

If the pins are NOT in DynamoDB (e.g., the table was wiped), re-run the ingest:

```bash
cd infra/ingest

# 1. Regenerate the Pinterest RSS manifest (no AWS creds needed)
node pinterest-rss.mjs --dry-run

# 2. Ingest into DynamoDB via the /seed API endpoint (no AWS creds needed)
node ingest-pins.mjs
```

This scrapes 72 pins from etsy/marthastewart/uncommongoods public RSS feeds, transforms
them into the same post schema as Reddit items, and POSTs them to the `/seed` endpoint.

---

## Step 4: Verify the feed shows Pinterest images

After the Lambda is deployed, test the feed:

```bash
curl -s "https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com/feed?limit=20" | \
  python3 -c "
import json, sys
d = json.load(sys.stdin)
items = d.get('items', [])
pinterest = [i for i in items if 'pin-' in i.get('postId', '')]
reddit = [i for i in items if i not in pinterest]
print(f'Total: {len(items)}, Pinterest: {len(pinterest)}, Reddit: {len(reddit)}')
for p in pinterest[:3]:
    print(f'  {p[\"postId\"]}: {p[\"source\"]} — {p.get(\"caption\",\"\")[:60]}')
"
```

**Expected:** A mix of Pinterest and Reddit posts on page 1 (e.g., 5-8 Pinterest out of 20).

If Pinterest posts only appear on page 2+, the Lambda has NOT been redeployed yet (the
old handler scans only `limit` items instead of `4 * limit`).

---

## Step 5: Verify the deployed frontend

After PRs are merged and Vercel auto-deploys:

1. Open **https://giftmaxxing.vercel.app/feed** — should show an infinite-scroll feed
   with PostCards (mix of Reddit and Pinterest images). Pinterest items have
   `Pinterest/etsy` or similar as the source, and images from `i.pinimg.com`.

2. Open **https://giftmaxxing.vercel.app/feed/drops** — should show the IdeasExplorer
   (recipient picker → ranked gift ideas with Reddit discussion evidence).

3. Check browser console for errors — there should be none.

---

## Architecture summary

```
Pinterest RSS feeds (etsy, marthastewart, uncommongoods)
  │
  ├─► pinterest-rss.mjs ─► S3 media bucket (images/)
  │                          │
  │                          ├─► embed.mjs ─► S3 Vectors (pins index, 1024-d cosine)
  │                          │                  │
  │                          │                  └─► /recommendations (kNN vector path)
  │                          │
  ├─► ingest-pins.mjs ─► DynamoDB posts table ─► /feed (scan + scorePost ranking)
  │
Reddit scraped data (reddit-gifts.json)
  │
  └─► ingest.mjs ─► DynamoDB posts table ─► /feed (same table, blended by ranker)
```

The `/feed` handler over-samples (scans 4x the request limit, min 80) so the `scorePost`
ranker sees items from both Reddit and Pinterest partitions, then returns the top N.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Feed shows only Reddit posts on page 1 | Lambda not redeployed | Run Step 2 |
| Feed shows no posts at all | DynamoDB table empty or API down | Check `curl /feed` directly; re-run ingest scripts |
| Pinterest images show broken/tiny thumbnails | Using 236x Pinterest URLs | `ingest-pins.mjs` already upgrades to `/originals/`; re-run if needed |
| Home page shows IdeasExplorer instead of feed | PR #1 not merged | Merge PR #1 |
| Drops page shows "Coming Soon" | PR #1 not merged | Merge PR #1 |
| `terraform apply` fails on Lambda | Missing `node_modules` in `src/` | Run `cd infra/src && npm ci` first |
| `/seed` endpoint returns 500 | Lambda IAM missing DynamoDB write | Check `infra/iam.tf` has `dynamodb:BatchWriteItem` |

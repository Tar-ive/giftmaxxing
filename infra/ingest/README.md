# Reddit → DynamoDB ingestion pipeline

Loads scraped Reddit gift finds into the `posts` DynamoDB table created by the
Terraform stack in `../`.

## Flow

```
web/scripts/scrape-reddit.mjs  ->  web/lib/reddit-gifts.json
                                          │
                                   infra/ingest/ingest.mjs  (transform.mjs)
                                          │
                                   DynamoDB  giftmaxxing-dev-posts
                                          │
                                   API Lambda  GET /feed, /recommendations
```

## 1. Scrape (no credentials needed — uses PullPush)

```bash
cd ../../web && npm run scrape:reddit
```

## 2. Dry run (validate transform, no AWS needed)

```bash
node ingest.mjs --dry-run
# writes posts.ingest.json + prints a sample item
```

## 3. Ingest (once AWS resources exist)

Requires valid AWS credentials and the table to exist. Load creds from the repo
root `.env` (SSO/temporary creds), then run:

```bash
set -a; source ../../.env; set +a   # AWS_*  +  optional POSTS_TABLE
npm install                          # installs @aws-sdk/* (first run only)
node ingest.mjs                      # -> $POSTS_TABLE (default giftmaxxing-dev-posts)
```

## Options

| Flag         | Default                          | Purpose                              |
|--------------|----------------------------------|--------------------------------------|
| `--dry-run`  | off                              | Write payload to JSON, skip AWS      |
| `--table`    | `$POSTS_TABLE` / `giftmaxxing-dev-posts` | Target DynamoDB table        |
| `--limit N`  | all                              | Cap number of posts ingested         |
| `--file P`   | `../../web/lib/reddit-gifts.json`| Input file                           |
| `--out P`    | `posts.ingest.json`              | Dry-run output path                  |

Writes use `BatchWrite` (25/request) and retry `UnprocessedItems` with backoff,
so re-running is safe (idempotent upsert by `postId`).

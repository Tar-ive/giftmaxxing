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

---

# Pinterest pin-page scraper (`pinterest-scrape.mjs`)

The real, shoppable pin catalog. Unlike the RSS feeds (~25 recent pins/feed, **no
outbound product link**), this uses Pinterest's own SPA resource endpoints — which
work without auth — to pull pins **with real prices, real product links, real
names, ratings, and board/category metadata**.

## Why these endpoints

| Endpoint              | Role                                                      |
|-----------------------|----------------------------------------------------------|
| `PinResource`         | Full pin: `link` (outbound URL), price, `board.id`, …    |
| `BoardFeedResource`   | A whole board, paginated by bookmark — **the volume engine** (every pin already carries link + price) |
| `BaseSearchResource`  | Gift queries → diverse pins + board discovery            |

> ⚠️ This reads Pinterest's internal JSON. It is ToS-gray and markup/endpoint
> names can change. The crawler throttles, backs off, and is **resumable**, but
> run it politely (default ~1.5 s/request).

## Flow

```
seed-boards.json (users + queries)
   │  RSS user pins ─► PinResource ─► board.id   (brand boards, crawled first)
   │  search queries ─► pins + more board.ids
   ▼
BoardFeedResource (paginate each board) ─► filter / dedup / diversity-cap
   ▼
pins.manifest.json   (+ optional S3 image upload with --bucket)
   ▼
embed.mjs ─► S3 Vectors      ingest-pins.mjs ─► DynamoDB posts (real link/price/facets)
```

## Run

```bash
npm run scrape:dry          # 200-pin dry run -> ./pins.manifest.json, no S3
npm run scrape              # full 10k crawl  -> ./pins.manifest.json
npm run scrape:resume       # continue after a stop/block (uses .scrape-state.json)

# crawl + upload originals to the media bucket in one pass:
set -a; source ../../.env; set +a
node pinterest-scrape.mjs --target 10000 --bucket "$MEDIA_BUCKET" --skip-existing
```

## Options

| Flag                | Default            | Purpose                                   |
|---------------------|--------------------|-------------------------------------------|
| `--target N`        | `10000`            | Stop after N unique quality pins          |
| `--seeds P`         | `seed-boards.json` | Curated users / queries (facet-tagged)    |
| `--out P`           | `pins.manifest.json` | Manifest output                         |
| `--bucket NAME`     | —                  | Also upload originals to this S3 bucket    |
| `--skip-existing`   | off                | Skip S3 objects that already exist        |
| `--resume`          | off                | Resume from `.scrape-state.json`          |
| `--dry-run`         | off                | Skip S3 upload (manifest only)            |
| `--max-per-board`   | `250`              | Diversity cap per board                    |
| `--max-per-domain`  | `1500`             | Diversity cap per merchant                 |
| `--min-interval`    | `1200` (ms)        | Throttle between requests                  |
| `--no-search` / `--no-rss` | both on     | Disable a seeding path                     |

Quality filter drops pins with no image, no outbound link, off-Pinterest social
domains (`facebook.com`, …), and out-of-stock/stale products; dedup is by pin id
**and** image signature. Diversity comes from facet-tagged seeds + per-board /
per-merchant caps.

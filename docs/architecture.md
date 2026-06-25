# Giftmaxxing Architecture

Full-stack social gifting platform: Next.js 16 on Vercel, serverless AWS backend
(DynamoDB + S3 Vectors + Bedrock + Lambda + API Gateway), Terraform IaC.

## System diagram

```mermaid
flowchart LR
  subgraph Client["Frontend · Vercel"]
    UI["Next.js 16 / React 19\nFeed · Swipe · Recs Lab · Visual Search · Group Gifts"]
  end

  subgraph AWS["Backend · AWS us-east-1 · Terraform IaC"]
    APIGW["API Gateway\nHTTP API ($default proxy)"]
    L["AWS Lambda\nsingle handler · Node 20"]
    DDB[("Amazon DynamoDB\nusers · posts · interactions · knowledge\nevents · graph · connections · config")]
    S3[("Amazon S3\npin / product images")]
    S3V[("Amazon S3 Vectors\npins index · taste & visual kNN")]
    BR["Amazon Bedrock\nTitan Multimodal Embeddings (1024-d)\nAmazon Nova · Claude Haiku (Maxi)"]
  end

  UI -->|NEXT_PUBLIC_API_URL| APIGW --> L
  L -->|metadata, feed, interactions, knowledge| DDB
  L -->|kNN / centroid / list| S3V
  L -->|embed query image| BR
  S3 -->|images| BR -->|vectors| S3V
```

## Runtime request flow — personalized recommendations

```mermaid
sequenceDiagram
  autonumber
  participant U as User browser
  participant W as Next.js (Vercel)
  participant C as web/lib/api.ts
  participant A as API Gateway
  participant L as Lambda handler.mjs
  participant P as DynamoDB posts
  participant I as DynamoDB interactions
  participant V as S3 Vectors (pins)
  participant B as Bedrock Titan MM

  U->>W: Open /feed/recommendations
  W->>C: fetchVectorRecommendations({ seedKeys })
  C->>A: GET /recommendations?seedKeys=pin-a,pin-b&limit=12
  A->>L: $default proxy event
  L->>V: GetVectors(seedKeys) → fetch seed embeddings
  V-->>L: seed vectors (1024-d each)
  L->>L: compute centroid (mean embedding)
  L->>V: QueryVectors(centroid, topK) → kNN
  V-->>L: ranked matches with metadata
  L->>L: quality filter (drop listicles/guides)
  L-->>C: { items, source: "vectors" }
  C->>W: render recommendation cards
  W-->>U: Personalized taste-matched gifts

  Note over L,P: Falls back to DynamoDB facet ranker if no vectors available
```

## Visual search flow

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant W as Next.js
  participant A as API Gateway
  participant L as Lambda
  participant B as Bedrock Titan MM
  participant V as S3 Vectors

  U->>W: Upload/snap photo on /feed/search (Visual tab)
  W->>A: POST /visual-search { imageBase64, limit }
  A->>L: $default proxy event
  L->>B: InvokeModel(imageBase64) → embed image
  B-->>L: 1024-d query vector
  L->>V: QueryVectors(queryVector, topK) → kNN
  V-->>L: visually similar pins with metadata
  L->>L: quality filter + limit
  L-->>W: { items, source: "visual" }
  W-->>U: Grid of visually similar buyable products
```

## DynamoDB tables (8 tables, all on-demand + PITR)

| Table | Keys | Purpose |
|---|---|---|
| `users` | PK `userId` | Profiles / identity |
| `posts` | PK `postId`; GSI `byAuthor`, GSI `byFeed` | Feed items; powers profile grids and global feed index |
| `interactions` | PK `userId`, SK `targetId` | Likes / saves / comments (idempotent) |
| `knowledge` | PK `recipient` | Reddit-mined gift ideas per recipient type |
| `events` | PK `userId`, SK `eventId`; GSI `byScope` | Personal milestones + shared occasions |
| `graph` | PK `pk`, SK `sk`; GSI `byEntity` | Single-table adjacency: onboarding + taste graph |
| `connections` | PK `userId`, SK `connectionId` | Soft profiles from swipe challenge guests |
| `config` | PK `key` | Feature flags + cost kill-switch |

## Offline data pipeline

```mermaid
sequenceDiagram
  autonumber
  participant R as PullPush Reddit archive
  participant S as scrape-reddit.mjs
  participant J as reddit-gifts.json
  participant E as enrich.mjs
  participant T as transform.mjs
  participant G as ingest.mjs
  participant D as DynamoDB posts

  S->>R: Fetch gift/product subreddits
  R-->>S: submissions with title, score, comments, image, link
  S->>J: Write scraped records
  G->>J: Read records
  G->>E: enrichRecord(record)
  E-->>G: recipient, occasion, category, vibes, merchant, productUrl
  G->>T: transform(records)
  T-->>G: post items matching API/UI shape
  G->>D: BatchWrite upserts to giftmaxxing-dev-posts
```

## Pinterest → S3 Vectors embedding pipeline

```mermaid
sequenceDiagram
  autonumber
  participant P as Pinterest RSS / API
  participant I as pinterest-rss.mjs
  participant S as S3 media bucket
  participant E as embed.mjs
  participant B as Bedrock Titan MM
  participant V as S3 Vectors

  I->>P: Fetch pins from seed profiles
  P-->>I: Pin data (image URLs, titles, links)
  I->>S: Download images → s3:image/...
  E->>S: Read images
  E->>B: InvokeModel(image + text) → embed
  B-->>E: 1024-d vector per pin
  E->>V: PutVectors({ key, vector, metadata })
  Note over V: Metadata includes title, imageUrl, price, domain, link
```

## Key API routes (Lambda handler.mjs)

| Method | Path | Purpose |
|---|---|---|
| GET | `/feed` | Paginated social feed with freshness + de-dup |
| GET | `/recommendations` | Personalized picks via S3 Vectors kNN or facet fallback |
| POST | `/visual-search` | Image → Titan MM embed → kNN visual search |
| POST | `/interactions` | Record likes / saves / comments |
| POST | `/maxi` | AI gift concierge (Nova base / Haiku shopping) |
| GET | `/posts/:id` | Single post detail |
| GET | `/knowledge` | Gift ideas by recipient |
| POST | `/events` | Create/update user events |
| GET | `/connections` | List soft profiles |

## Important implementation details

- Public API base: `https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com` (set as `NEXT_PUBLIC_API_URL`).
- Lambda reads table names from env vars (`USERS_TABLE`, `POSTS_TABLE`, etc.).
- `/feed` and `/recommendations` use opaque base64url cursors; `/feed` may encode a DynamoDB `LastEvaluatedKey` or an `_offset` fallback depending on the code path.
- Cost kill-switch: breaker Lambda sets `{ paused: true }` in the config table when spend exceeds threshold; expensive routes (Bedrock, S3 Vectors) short-circuit while basic feed/auth keeps serving.
- Vector recommendations fall back to a facet-based ranker over DynamoDB when S3 Vectors is unavailable or has no seed data.

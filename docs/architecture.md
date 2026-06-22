# Giftmaxxing Architecture

This diagram represents the current deployed Giftmaxxing system plus the near-term commerce layer we are building toward.

## System diagram

```mermaid
flowchart LR
  subgraph Users[Users]
    Hunter[Product Hunt visitor]
    User[Giftmaxxing user]
  end

  subgraph Web[Next.js web app]
    Landing[Landing page]
    FeedUI[Social feed UI]
    AppStore[AppStore / infinite scroll]
    ApiClient[web/lib/api.ts\nNEXT_PUBLIC_API_URL]
    LocalFallback[Local demo fallback\nPOSTS + client ranker]
  end

  subgraph ProductSources[Discovery and product sources]
    PullPush[PullPush Reddit archive API]
    RedditScraper[web/scripts/scrape-reddit.mjs]
    RedditJson[web/lib/reddit-gifts.json]
    FutureProductApis[Planned product search APIs\nSerpApi / RapidAPI / eBay / Best Buy / Walmart]
    AffiliateNetworks[Planned monetization layer\nSovrn / Skimlinks / Impact / EPN]
  end

  subgraph Ingest[Offline enrichment + ingestion]
    Enrich[infra/ingest/enrich.mjs\nrecipient / occasion / category / vibes\nmerchant / productUrl / hasProductImage]
    Transform[infra/ingest/transform.mjs\nDynamoDB post shape]
    IngestScript[infra/ingest/ingest.mjs\nBatchWrite + retry]
  end

  subgraph AWS[AWS us-east-1 account 445056752928]
    APIGW[API Gateway HTTP API\ngiftmaxxing-dev-api\n$default proxy + CORS]
    Lambda[Lambda Node.js 20\ngiftmaxxing-dev-api\ninfra/src/handler.mjs]
    Logs[CloudWatch logs]

    subgraph DynamoDB[DynamoDB on-demand + PITR]
      UsersTable[(giftmaxxing-dev-users\nPK userId)]
      PostsTable[(giftmaxxing-dev-posts\nPK postId\nGSI byAuthor author + createdAt)]
      InteractionsTable[(giftmaxxing-dev-interactions\nPK userId / SK targetId)]
    end
  end

  subgraph ApiRoutes[Lambda routes]
    FeedRoute[GET /feed\ncursor pagination\nscorePost ranking\noptional imagesOnly filter]
    RecsRoute[GET /recommendations\ninteraction-aware ranking\nfacet filters + imagesOnly]
    PostRoute[GET /posts/{id}]
    InteractionsRoute[POST /interactions\nlike / save / comment ids]
    SeedRoute[POST /seed\ndev bulk load]
  end

  Hunter --> Landing
  User --> FeedUI
  Landing --> FeedUI
  FeedUI --> AppStore
  AppStore --> ApiClient
  AppStore -. if API unset/unreachable .-> LocalFallback

  ApiClient -->|GET /feed by default\nGET /recommendations available| APIGW
  ApiClient -. planned persisted likes/saves .-> APIGW
  APIGW --> Lambda
  Lambda --> FeedRoute
  Lambda --> RecsRoute
  Lambda --> PostRoute
  Lambda --> InteractionsRoute
  Lambda --> SeedRoute
  Lambda --> Logs
  APIGW --> Logs

  FeedRoute --> PostsTable
  RecsRoute --> PostsTable
  RecsRoute --> InteractionsTable
  PostRoute --> PostsTable
  InteractionsRoute --> InteractionsTable
  SeedRoute --> UsersTable
  SeedRoute --> PostsTable

  PullPush --> RedditScraper --> RedditJson --> Enrich --> Transform --> IngestScript --> PostsTable
  FutureProductApis -. enrich real images / prices / merchants .-> Enrich
  AffiliateNetworks -. wrap productUrl / outbound buy links .-> ApiClient

  classDef live fill:#f7f2eb,stroke:#211a14,color:#211a14;
  classDef aws fill:#fff4df,stroke:#fb6f52,color:#211a14;
  classDef planned fill:#f2eefc,stroke:#8b6fe8,stroke-dasharray: 5 5,color:#211a14;
  classDef data fill:#eaf6ef,stroke:#5b8c6a,color:#211a14;

  class Hunter,User,Landing,FeedUI,AppStore,ApiClient,LocalFallback live;
  class APIGW,Lambda,Logs,FeedRoute,RecsRoute,PostRoute,InteractionsRoute,SeedRoute aws;
  class PullPush,RedditScraper,RedditJson,Enrich,Transform,IngestScript data;
  class FutureProductApis,AffiliateNetworks planned;
```

## Runtime request flow

```mermaid
sequenceDiagram
  autonumber
  participant U as User browser
  participant W as Next.js feed
  participant C as web/lib/api.ts
  participant A as API Gateway
  participant L as Lambda handler.mjs
  participant P as DynamoDB posts
  participant I as DynamoDB interactions

  U->>W: Open /feed
  W->>C: fetchFeed({ limit, cursor, filters, imagesOnly? })
  C->>A: GET /feed?limit=&cursor=&vibes=&recipient=&occasion=&category=&imagesOnly=1
  A->>L: $default proxy event
  L->>P: Scan posts, optional hasProductImage filter
  L->>L: scorePost() + sort page
  L-->>C: { items, cursor }
  C->>W: mapApiPost() -> Post[]
  W-->>U: Infinite social product feed

  U->>W: Like / save / comment
  W->>W: Update local AppStore state today

  Note over W,I: Backend POST /interactions exists for persisted likes/saves, but the current UI store has not wired it yet.
  W-->>C: future persistence: interaction payload
  C-->>A: POST /interactions
  A-->>L: $default proxy event
  L-->>I: Put { userId, targetId, type, target, createdAt }
  L-->>C: { ok: true }
```

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
  R-->>S: submissions with title, score, comments, image, link, selftext
  S->>J: Write scraped records
  G->>J: Read records
  G->>E: enrichRecord(record)
  E-->>G: recipient, occasion, category, vibes, merchant, productUrl, hasProductImage
  G->>T: transform(records)
  T-->>G: post items matching API/UI shape
  G->>D: BatchWrite upserts to giftmaxxing-dev-posts
```

## What is live vs planned

| Layer | Live now | Planned next |
|---|---|---|
| Frontend | Next.js landing + social feed, infinite scroll, local fallback | Product Hunt asset flow, stronger onboarding, social imports |
| Backend | API Gateway `$default` → single Lambda router | Split services only if load/ownership requires it |
| Storage | DynamoDB users/posts/interactions, on-demand + PITR | Additional GSIs if feed scans become the bottleneck |
| Recommendations | Server-side `scorePost()` for API pages; local client fallback ranker | Embeddings, co-save graph, Pinterest/Spotify taste signals |
| Product sourcing | Reddit/PullPush scrape + rule-based enrichment | Product search APIs for real titles/images/prices/merchants |
| Monetization | `productUrl` field exists in API shape | Affiliate wrapping via Sovrn/Skimlinks/Impact/EPN |

## Important implementation details

- The public API base is `https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com`, set as `NEXT_PUBLIC_API_URL` for the web app.
- The Lambda reads table names from `USERS_TABLE`, `POSTS_TABLE`, and `INTERACTIONS_TABLE`.
- `/feed` and `/recommendations` are cursor-paginated with base64url-encoded DynamoDB `LastEvaluatedKey` cursors.
- `fetchFeed()` defaults to `imagesOnly=1`, so the feed asks for posts where `hasProductImage = true`.
- `POST /interactions` exists in the Lambda, but current `AppStore` like/save/comment actions are local-only until persistence is wired.
- The web app falls back to local demo data and `web/lib/recommend.ts` if the API is not configured or unreachable.

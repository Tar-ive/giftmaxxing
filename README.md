# Giftmaxxing

A social gifting app — an Instagram-style feed of gift-worthy finds, taste-based
recommendations, shared wishlists, and group gifts.

## Monorepo layout

| Path | What | Deploys to |
|---|---|---|
| `web/` | Next.js app (feed, recommender UI, landing) | **Vercel** (GitHub auto-deploy on push to `main`; Root Directory = `web`) |
| `infra/` | Terraform serverless backend: DynamoDB + Lambda + API Gateway HTTP API | **AWS** `us-east-1` (deployed) |
| `infra/ingest/` | Reddit → DynamoDB data-loading scripts | run locally |

The web app calls the AWS API via `NEXT_PUBLIC_API_URL`.

## Specs & roadmap (read these first)

| Doc | Purpose |
|---|---|
| **[`CLOUD.md`](./CLOUD.md)** | **Canonical cloud/AWS spec + agent memory** for the Pinterest-image → multimodal-embedding → vector-index → recommendation pipeline, the Pinterest-style **native-ad simulation**, cost analysis, and the **future visual-search** feature. Agents: treat `CLOUD.md` §8 as the working backlog. |
| [`infra/README.md`](./infra/README.md) | Terraform resources, deploy steps, API routes, planned embedding pipeline. |
| [`web/README.md`](./web/README.md) | Next.js app dev instructions. |

## Image → vector → feed pipeline (summary)

Connected **Pinterest** boards/pins (taste signal, user-scoped) and our catalog →
**Amazon S3** → **Amazon Bedrock Titan Multimodal Embeddings** (unified text+image
vectors) → vector index (brute-force in Lambda now → **Amazon S3 Vectors** at scale)
→ blended into the recommendation feed by cosine similarity. Sponsored items are
interleaved **seamlessly** (same card, subtle "Sponsored" label, ranked by the same
taste vector), mirroring Pinterest's native-ad pattern. Full design, rate limits, and
cost (≈ a few $/mo at dev scale) live in [`CLOUD.md`](./CLOUD.md).

### Future: visual search ("Google Lens for gifts")

Upload/snap a photo → embed with the same multimodal model → kNN against the product
catalog → return visually similar buyable products with **Amazon / Walmart affiliate
links**. Not built yet — designed and indexed in [`CLOUD.md` §6](./CLOUD.md) for a
later agent to implement.

## Getting started

- Web: see [`web/README.md`](./web/README.md).
- Infra: see [`infra/README.md`](./infra/README.md).
- Copy `.env.example` → `.env` and fill in real values (never commit `.env`).
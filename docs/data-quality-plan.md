# Feed Data-Quality & Moderation Plan

> Status: **PROPOSAL for review — no code yet.**
> Goal: the feed should be **buyable, curated products** people scroll to discover and
> purchase — not SEO gift-guide listicles ("30 Gifts for People Who Have Everything"),
> recipe-blog pins, or text-overlay graphics.

---

## 0. Evidence (audit of `infra/ingest/pins.manifest.json`, n = 10,014)

| Signal | Coverage | Read |
|---|---:|---|
| Has a real parsed **price** | 18.6% | strong *positive* |
| **Listicle caption** ("30 Gifts…", "Gift Ideas For Him") | 26.5% | strong *negative* |
| Caption **starts with a number** | 16.0% | high-precision *negative* |
| Listicle/blog **landing path** | 10.2% | negative |
| Pure content/blog **domain** | 5.2%+ | negative |
| Retailer domain | 45.4% | positive |
| Distinct domains | **1,269** | head curatable, tail needs ML |

**Three findings that drive the design:**
1. **Caption + landing-page > domain.** Great retailers still post junk: `uncommongoods.com → "41 Out-of-this-World Gifts for People Who Have Everything"`. Only **11% of listicles are on retailer domains** — but those exist, so we can't trust domain alone.
2. **Price is a clean discriminator.** Just **9% of priced pins** are listicles → "has price" ≈ "is a real product".
3. **Root cause is upstream sourcing.** We crawled *gift-guide boards*, which are listicle factories. The cheapest long-term fix is to **crawl better sources** (retailer product boards / shopping feeds), not just filter after the fact. See §12.

---

## 1. Quality taxonomy (the labels every pin gets)

A pin is classified into exactly one `contentType`:

| Label | Definition | Feed action | Example from our data |
|---|---|---|---|
| `single_product` | One specific, buyable item | **KEEP / BOOST** | "The Millie Two Piece Set in Matcha — $118" |
| `gift_guide` | Listicle / roundup / category page | **REMOVE** | "30 Birthday Gifts for The Friend with Elite Taste" |
| `editorial` | Blog post, how-to, inspiration | **REMOVE** | "Bridal Brooch Ideas" |
| `recipe` | Food/recipe content | **REMOVE** | anything from `rasamalaysia.com` |
| `seasonal_promo` | Banner/announcement, no product | **REMOVE** | "Father's Day is June 21st!" |
| `spam` | Affiliate farm, dead link, watermark spam | **REMOVE** | `sites.google.com` link dumps |
| `uncertain` | Model/heuristics not confident | **REDUCE** (demote) + queue for review | — |

Orthogonal `imageType` (from the image itself): `product_photo` (good) · `lifestyle` (ok) · `collage` (bad — multi-product grid) · `text_overlay` (bad — "25 GIFTS FOR HER" graphic) · `other`.

A pin is **feed-eligible** iff `contentType = single_product` (or `lifestyle`-imaged product) **and** `imageType ∉ {collage, text_overlay}`.

---

## 2. Signals (features we compute per pin)

**Caption signals**
- `listicleCaption` — regex set (see §4).
- `startsWithNumber` — `/^\s*\d{1,3}\b/` (16% hit, high precision).
- `captionLen` — chars; blog excerpts run long (median 44, p90 87 → flag > 120).
- `genericHeadline` — "ideas", "guide", "roundup", "best … gifts", "for him/her".

**Link / domain signals**
- `domainClass` — `allow` (retailer) / `block` (content) / `unknown` (tail). Starter lists in Appendix A.
- `pdpPath` — `/(dp|gp\/product|listing|products?|p|item|sku)\//`.
- `listPath` — `/(blog|gift-?(guide|ideas)|\d+-?gifts?|best-|roundup|-for-(her|him|mom|dad))/`.
- `mixedDomainPath` — for sites that are content **and** shop (e.g. `food52.com/shop/...` good vs `/recipes/...` bad).

**Commerce signals**
- `hasPrice` — parsed price > 0 (18.6%).
- `priceResolvable` — Layer C confirms a PDP price (target: raise coverage ≫ 18.6%).

**Image signals** (Layer B / C)
- `imageType` (above), via multimodal LLM or Rekognition `DetectText` (text-overlay) + `DetectLabels` (collage/object count).

---

## 3. Scoring model & thresholds — "Remove / Reduce / Boost"

We do **not** binary-delete most things. Mirroring Meta's *Remove · Reduce · Inform*: remove the worst, **demote** the borderline, boost the best.

### 3a. Heuristic base score (Layer A, free)
`base ∈ [0,1]`, start at `0.50`, add/subtract:

```
+0.30  hasPrice
+0.25  domainClass == allow
+0.15  pdpPath
+0.10  captionLen <= 60 && !listicleCaption
-0.35  listicleCaption
-0.25  startsWithNumber
-0.40  domainClass == block
-0.20  listPath
-0.15  captionLen > 120
base = clamp(0.50 + Σ, 0, 1)
```

### 3b. Final `qualityScore`
- **Without LLM:** `qualityScore = base`.
- **With LLM (Layer B):** category is authoritative for removal —
  - `contentType ∈ {gift_guide, editorial, recipe, seasonal_promo, spam}` → `qualityScore = min(base, 0.15)`
  - `imageType ∈ {collage, text_overlay}` → `qualityScore = min(qualityScore, 0.20)`
  - else `qualityScore = 0.4·base + 0.6·llmConfidence`

### 3c. Thresholds (tunable against the golden set, §11)
| Band | Range | Serving action |
|---|---|---|
| **Remove** | `< 0.35` | excluded from `/feed` & vector recs |
| **Reduce** | `0.35 – 0.60` | eligible but **demoted** (rank multiplier 0.5) + review queue if `uncertain` |
| **Normal** | `0.60 – 0.80` | normal rank |
| **Boost** | `> 0.80` | rank multiplier 1.25 |

---

## 4. Layer A — heuristic scorer (free, deterministic)

A pure function `scoreQuality(pin) → { qualityScore, contentTypeGuess, flags[] }`, run:
- **at ingest** (new `/seed` writes), and
- **as a one-time backfill** over the existing 10,014 (re-tag in DynamoDB + vector metadata).

Regex set (starting point, refined against golden set):
```js
const LISTICLE = [
  /\b\d{1,3}\s*\+?\s*(best|unique|cool|cute|thoughtful|top|essential|cheap|budget|last[- ]minute)?\s*(gifts?|ideas?|things?|presents?|reasons?|ways?)\b/i,
  /\bgift\s+(guide|ideas?|lists?|roundups?)\b/i,
  /\b(best|top|ultimate|unique|thoughtful|perfect)\s+gifts?\b/i,
  /\bgifts?\s+(for|under|that|your|to)\b/i,
];
const PDP_PATH  = /\/(dp|gp\/product|listing|products?|p|item|sku)\//i;
const LIST_PATH = /\/(blog|gift-?guide|gift-?ideas|\d+-?gifts?|best-|roundup|-for-(her|him|mom|dad))/i;
```
**Expected impact alone:** removes/demotes the obvious ~30–50% at $0.

---

## 5. Layer B — multimodal LLM classify + **clean** (the big quality jump)

Two complementary options:

### Option 1 — per-pin LLM pass (Bedrock **Claude 3.5 Haiku**, multimodal)
One call per pin → classification **and** a cleaned caption (fixes the ugly blog-excerpt titles). Input = 736x image (already downscaled) + raw title.

**Prompt (draft):**
```
System: You are a strict product-catalog curator for a gift-shopping feed.
Given a pin's IMAGE and raw CAPTION, decide if it is a single buyable product
suitable for a shoppable feed. Reject gift guides/listicles, blog/editorial,
recipes, seasonal banners, spam, collages, and text-overlay graphics.
Return ONLY JSON.

User: CAPTION: "<title>"   [image attached]

Output JSON:
{
  "contentType": "single_product|gift_guide|editorial|recipe|seasonal_promo|spam",
  "imageType":   "product_photo|lifestyle|collage|text_overlay|other",
  "isBuyable":   true|false,
  "confidence":  0.0-1.0,
  "cleanTitle":  "<= 8 words, the product name, no clickbait",
  "oneLiner":    "<= 120 chars, plain shopper description",
  "category":    "jewelry|home|beauty|kitchen|apparel|stationery|toy|other",
  "reason":      "<= 12 words"
}
```
Rules: **never invent a price** (price only ever comes from parsed data, §6).

### Option 2 — classifier on existing Titan embeddings (scalable, ~free/item)
We already embed every pin (Titan multimodal → S3 Vectors). This is exactly Meta's *Whole-Post Integrity Embeddings* pattern: train a small classifier (logistic reg / kNN / shallow MLP) on a **few hundred labeled examples** to predict `isBuyable` from the embedding. ~$0 marginal cost per pin, ideal for the **1,269-domain long tail** and all future ingests.

**Recommended:** run Option 1 once to clean captions + bootstrap a labeled set, then train Option 2 for ongoing/long-tail scoring.

---

## 6. Layer C — landing-page verification (raise price coverage)

For pins that pass §5 but lack a price, fetch the link and extract structured commerce data:
- JSON-LD `Product.offers.price` / `priceCurrency`
- `og:price:amount`, `product:price:amount`, microdata `itemprop="price"`
- presence of add-to-cart / availability → confirms PDP (vs category page)

Run **selectively** (good-but-priceless items), rate-limited, one-time over the catalog. Lifts the 18.6% price coverage substantially and converts `unknown` domains to verified PDPs. Risks: bot-blocking, latency → cache results, cap concurrency, treat failures as "unverified" (demote, don't remove).

---

## 7. Layer D — serving integration (`infra/src/handler.mjs`)

- **`scorePost`**: multiply final rank by the §3c band multiplier; hard-drop `< 0.35`.
- **`GET /feed`** (DynamoDB `byFeed` GSI): add `FilterExpression qualityScore >= :floor`; keep newest-first then quality-weighted rank.
- **`GET /recommendations` (vector)** & **`/visual-search`**: filter kNN results by `qualityScore` from vector metadata before returning; optionally pass a metadata filter to S3 Vectors query.
- **`/pins`**: same floor so seeds are clean.

All read a single stored `qualityScore` field — no recompute at serve time.

---

## 8. Layer E — human-in-the-loop + feedback loop

- **Admin review queue** (reuse the in-flight `admin-session.tsx`): surface `uncertain` / `0.35–0.60` pins; one-click keep/kill → grows the golden set, retrains Option-2 classifier.
- **User signals → ranking**: track `save`, outbound `click`, `hide`/"see less", dwell. Feed back as a per-pin and per-domain quality prior (Meta/Pinterest do exactly this).
- **Domain reputation** accrues from aggregate user signals → auto-promote/demote tail domains over time.

---

## 9. Data-model changes

Add to each `posts` item **and** vector metadata:
```
qualityScore: number        // 0..1, authoritative for serving
contentType:  string        // taxonomy §1
imageType:    string
cleanTitle:   string        // LLM-cleaned (display); keep raw `title` too
qualityFlags: string[]      // e.g. ["listicle","starts_with_number"]
qualityRev:   number        // scorer version, for re-scoring/idempotency
```
Backfill via a one-time script (like `ingest-pins.mjs`, idempotent by id). No schema migration needed (DynamoDB + vector metadata are schemaless).

---

## 10. Cost model (one-time, 10,014 pins)

| Layer | Approach | Est. cost |
|---|---|---|
| A heuristics | local node | **$0** |
| B opt-1 LLM, **text-only** Haiku | ~80 in / 80 out tok per pin | **~$4** |
| B opt-1 LLM, **multimodal** Haiku (low-res img) | ~700–1,400 in / 80 out | **~$6–16** |
| B opt-2 embedding classifier | reuse existing vectors + ~500 labels | **~$0** + label time |
| C price crawl | bandwidth only (rate-limited) | **~$0** (time) |
| D serving | code only | **$0** |

Ongoing per new pin: heuristics $0 + embedding-classifier $0 (+ existing embed cost already budgeted). **Stays well under the Bedrock kill-switch** (batch Haiku at < 1.3/s like the embed backfill, or text-only to avoid the image-model tripwire entirely).

---

## 11. Metrics & evaluation

- **Golden set:** hand-label ~300–500 pins `{buyable / not}` (stratified across top domains + tail).
- **Offline:** precision/recall/F1 of heuristic vs LLM vs blended, per threshold. Tune §3c to hit **feed precision ≥ 90%** (fraction of shown pins that are real buyable products) while keeping enough volume.
- **Catalog health dashboard:** % feed priced, % from allowlist, % each `contentType`, eligible-pin count after filtering.
- **Online KPIs:** save rate, outbound CTR to retailer, dwell, hide rate — the ultimate quality judges.

---

## 12. Rollout phases

| Phase | Scope | Cost | Outcome |
|---|---|---|---|
| **P0** | Layer A + D + backfill re-score | $0 | Junk gone from feed *today* |
| **P1** | Layer B opt-1 (clean + classify) + golden set | ~$4–16 | Clean captions + accurate labels |
| **P2** | Layer B opt-2 embedding classifier | ~$0 | Scalable long-tail + future ingests |
| **P3** | Layer C price crawl | ~$0 | Price coverage ≫ 18.6% |
| **P4** | Layer E admin queue + feedback | dev | Self-improving quality |
| **P5 (root cause)** | **Re-source**: crawl retailer product boards / shopping feeds; demote gift-guide boards in the scraper | dev | Junk drops *at the source* |

---

## 13. Risks & mitigations

- **Over-filtering good items** → prefer **Reduce** over Remove for borderline; track recall; human review of the demote band.
- **Thin catalog after filtering** (could drop ~40–50%) → still ~5–6k quality pins; combine with **P5 re-sourcing** to refill with quality. This is a *feature*: better to scroll 5k great products than 10k of half junk.
- **Regex false positives** (a real "Gift Set" product) → LLM/allowlist override.
- **LLM price hallucination** → prices ONLY from parsed/crawled data, never the model.
- **Mixed domains** (food52) → path rules + LLM, not domain verdict alone.
- **Re-scoring drift** → `qualityRev` guards idempotent backfills.

---

## Appendix A — starter allow / block lists (from audit top-50)

**Allow (retailer / PDP):** etsy.com, etsy.me, *.etsy.com, sephora.com, thegrommet.com, anthropologie.com, papersource.com, ebay.com, lowes.com, urbanoutfitters.com, uncommongoods.com, altardstate.com, amazon.com, amzn.to, poshmark.com, pukkagifts.uk, kisaf.com, bloomyboxshop.com.

**Block (content / blog / spam):** sites.google.com, rasamalaysia.com, thecanadianguy.com, loveandlavender.com, blossomhomelife.com, minimizemymess.com, within-yourhome.com, everydaysavvy.com, newtrendsetter.com, goodmomliving.com, sunshinencoffeemornings.com, mindfulnessinspo.com, thecreativebite.com, *.blogspot.com, luxeandleanblog.com, moritzfinedesigns.com, greenweddingshoes.com, m.youtube.com, flickr.com, linktw.in.

**Mixed (needs path rule):** food52.com (`/shop` ✓ vs `/recipes` ✗), presentatlas.com, lovedandfoundbox.com, laurelandwolf.com, casolia.com.

> Lists cover the head (~60% of volume). The 1,269-domain tail is handled by §5 (LLM/embedding classifier), not manual curation.

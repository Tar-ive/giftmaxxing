# Giftmaxxing — Launch & Monetization Research

> Prepared for the Product Hunt launch + first real users. Mixes **repo-grounded facts**
> (verified in this codebase) with **strategy from general knowledge**. Anything about
> third-party *program terms* (Amazon, Walmart, etc.) changes often — treat those as
> "verify before relying on" and confirm on the official page the week you apply.

---

## 0. TL;DR — the decisions that matter

1. **Decouple two problems you're currently treating as one:**
   - **Product DATA** (image, title, price, merchant, link) to fill the feed → solvable
     **today, with zero affiliate approval**, via a product-search API.
   - **MONETIZATION** (earning on clicks/sales) → add later via **easy-approval
     aggregators**, not Amazon directly.
2. **Don't start with Amazon Associates.** Its API (PA-API) is gated behind *real sales*,
   which a brand-new app can't produce yet — classic chicken-and-egg. Start with
   aggregators/networks that approve instantly, then graduate to direct Amazon/Walmart/
   Target deals once you have traffic.
3. **Walmart does have an affiliate program** (run through impact.com) plus a developer
   "Walmart.io" Affiliate API and a newer **Walmart Creator** program — all require an
   application, but Walmart is generally easier to get into than Amazon's API.
4. **Your differentiation is the *feed*, not the *list*.** Every competitor is a
   utility (wishlists/registries). You're a social-discovery feed + an AI companion that
   learns taste. Lean into that.
5. **Use the 4 screenshots we just captured** (`/screenshots`) as Product Hunt gallery
   assets — but fix the image hosting first (see §7).

---

## 1. Where the product is *today* (grounded in this repo)

| Area | Current reality | File |
|---|---|---|
| Feed content | **8 hand-authored sample products** rendered as emoji-on-gradient cards (no real photos/prices/buy links) | `web/lib/data.ts`, `web/lib/social.ts` |
| Real-data attempt | A **Reddit scraper** (PullPush, no auth) pulls gift-subreddit posts → JSON → DynamoDB | `web/scripts/scrape-reddit.mjs`, `infra/ingest/` |
| Data model | Already has `product.{name,brand,price,image,url}` + `link` (off-site URL) + `source/rec/reason` — **ready to hold real affiliate products** | `infra/ingest/transform.mjs` |
| Recommender | Small, explainable content-based ranker (taste vector from likes/saves/follows) | `web/lib/recommend.ts` |
| Affiliate strategy | **None documented anywhere.** The `docs/aws-action-plan.md` referenced in code does not exist | — |

**The gap:** the Reddit scraper produces *posts*, not *shoppable products*. `price` is a
regex over the title (usually `0`), `brand` is just the subreddit, and there are no real
buy links. So the feed can't yet show "real products you can actually buy."

---

## 2. The idea, stated as a hypothesis

> **For** people who want to give better gifts (and never double-buy), **Giftmaxxing is**
> a social feed + AI companion (Maxi) that learns each recipient's taste from their
> socials and surfaces *real, buyable* finds — where friends can save, claim, and
> group-gift — **unlike** wishlist/registry apps that are static utilities you only open
> at Christmas.

Two beliefs this bets on:
- **Discovery, not storage, is the hard part of gifting.** Lists assume you already know
  what to give. The feed + Maxi do the *finding*.
- **Gifting is inherently social and high-intent** → great for both affiliate (people
  click to buy) and native/sponsored placements (brands want to be the gift).

---

## 3. Competitor landscape

### A. Wishlist / registry / "claim it" (closest in *function*)
| Product | What it does | Keep / learn |
|---|---|---|
| **Elfster** | Secret Santa organizer + wishlists; huge at holidays | **Secret Santa / draw-names** = viral seasonal loop |
| **Giftster** | Family gift lists with **reserve/claim** so no duplicates | You already have claim; their *family group* model is sticky |
| **Amazon Wish List / MyRegistry** | Universal lists; MyRegistry aggregates any store | **Universal "add from any store"** bookmarklet/extension |
| **DreamList** | Kid-focused wishlists, surprise-preserving | Surprise-preserving UX done well |
| **Throne / ShopMy / LTK** | Public creator wishlists & shoppable storefronts | **Creator wishlists** = built-in distribution + monetization |
| Wishlistr, Gift Hero, Giftful, Wishify | Long-tail list apps | Mostly stagnant — opportunity to out-design |

### B. Group gifting / pooling
| Product | Note |
|---|---|
| **illume, Group Gift, GiftCrowd, GoFundMe-for-gifts, PayPal Pools** | Pooling exists but is clunky and one-off. Your **in-feed pool with a live ledger + deadline** is better UX. |

### C. AI gift recommendation / discovery
| Product | Note |
|---|---|
| **Gifts.com, Giftpack AI, Gander, Elfie, "gift genie" GPTs** | Mostly quiz → list. None is a *social feed* with persistent taste profiles. Maxi + the feed is the wedge. |

### D. Social-shopping feeds (your *model* analogs, not gifting-specific)
| Product | Lesson |
|---|---|
| **Pinterest** | Taste graph + shopping ads + "promoted pins" = the ad model you want |
| **Flip** | Social shopping feed, affiliate + creator payouts (watch their unit-economics struggles) |
| **LTK / ShopMy** | Creator → affiliate commerce at scale (LTK reportedly multi-$B GMV) |
| **Shop (Shopify), Karma, Verishop** | Feed + price-drop alerts + wishlist as retention |

**Net:** the gifting category is full of *utilities*; the social-shopping category proves
the *feed + affiliate + ads* model works. **Giftmaxxing sits in the white space between
them.**

### Features worth keeping / stealing
- **Claim/reserve** (you have it) — table stakes; keep it front-and-center.
- **Secret Santa / draw names** (Elfster) — add for Nov–Dec; huge acquisition loop.
- **Universal "add from any store"** (MyRegistry) — extension or paste-a-link.
- **Creator/public wishlists** (Throne/LTK) — distribution + monetization in one.
- **Price-drop alerts** (Maxi already pings) — strong retention hook.
- **Occasion calendar + reminders** (you have) — the reason people *return*.

---

## 4. Business model: affiliate + native/sponsored

### 4a. Affiliate (transactional)
You earn a % when someone buys via your outbound link. Typical commission ranges
(**verify current rates — they change**):

| Merchant | Rough commission | How you join |
|---|---|---|
| Amazon Associates | ~1–4% (category-dependent) | Own program (sales-gated API — see §5) |
| Walmart | ~1–4% | impact.com (see §6) |
| Target | ~1–8% | impact.com |
| eBay (EPN) | ~1–4% | eBay Partner Network (easy) |
| Etsy | ~4% | Awin |
| Best Buy | ~1–5% | impact.com (+ free Products API) |
| **Aggregators (Skimlinks/Sovrn)** | They take ~25% of the commission, you keep the rest | **Instant-ish approval** |

### 4b. Native / sponsored ads (brand-paid)
Gifting = high commercial intent, so in-feed brand placements are valuable:
- **Sponsored "drops"** (a brand's product featured in the 24h drops rail).
- **Promoted finds** in the feed (clearly labeled), Pinterest-style.
- **Sponsored gift guides** ("The cozy-home gift guide, by [Brand]").
- **Affiliate + ad stack together**: brand pays for placement *and* you earn on resulting
  sales — double dip, common in commerce media.

Comparables monetizing this exact stack: **Pinterest** (shopping ads), **LTK/ShopMy**
(creator commerce), **Flip** (feed + affiliate), **Wirecutter/BuzzFeed Shopping**
(affiliate content). The model is proven; the moat is *taste data + social graph*.

---

## 5. Product DATA without an affiliate program (the core unblock)

**Key insight:** you do **not** need to be an Amazon affiliate to *show* products. You
need a **product-data source**. Monetization links are a separable layer added on top.

### Why Amazon-first fails for a new app
- **PA-API (Product Advertising API) is sales-gated.** You must have an approved
  Associates account, and Amazon requires you to generate **qualifying sales (historically
  ~3 within 180 days)** to keep the account, and PA-API access/throughput is tied to
  recent sales — *no sales → no/revoked API access*. A brand-new app has no sales yet →
  can't get the API → can't show products → can't get sales. Chicken-and-egg.
  *(Verify exact thresholds on Amazon's site before relying on this.)*
- The **Amazon Influencer/Creator program** is a *storefront* for people with a social
  following — it is **not** a product-data API. Don't confuse the two.

### Options that need NO affiliate approval to get DATA
**1. Product-search APIs (recommended for the hackathon → launch):** real titles, images,
prices, merchant, and an outbound URL.
- **SerpApi** — Google Shopping / Amazon / Walmart / eBay "engines"; clean JSON; paid with
  a small free tier.
- **RapidAPI marketplace** — e.g. "Real-Time Product Search" (Google Shopping), "Real-Time
  Amazon Data"; cheap/free tiers, fastest to prototype.
- **Traject Data** — Rainforest API (Amazon), BlueCart (Walmart), Bigbox (Target).
- **Oxylabs / Bright Data / Apify** — e-commerce scraper APIs (heavier, pricier).

**2. Merchant APIs that are open-ish (data + later affiliate):**
- **eBay Browse API** + **eBay Partner Network** — relatively easy approval, real data
  *and* affiliate in one. Great first integration.
- **Best Buy Products API** (developer.bestbuy.com) — free API key, full electronics
  catalog; affiliate via Impact. Great for tech gifts.
- **Etsy Open API v3** — listings for the "thoughtful/handmade" aesthetic; affiliate via
  Awin. On-brand for gifting.

**3. Keep your Reddit/UGC discovery** as the *taste/trend* signal, then **resolve** each
trending item to a *real buyable product* via one of the search APIs above. This turns
your existing pipeline into "trending on Reddit → here's the actual product to buy."

> ⚠️ **Legal/ToS note:** scraping Amazon/Walmart directly violates their terms; third-party
> APIs assume that risk but you should still review their terms and add the required FTC
> affiliate disclosure + "prices/availability may change" disclaimers, and avoid long-term
> price caching where prohibited.

### Easy-approval MONETIZATION layer (add on top of the data)
- **Sovrn Commerce (ex-VigLink)** / **Skimlinks** — auto-convert your outbound links into
  affiliate links across tens of thousands of merchants, **without per-merchant approval**.
  They take a cut (~25%); you get monetization on day one.
- **Awin / CJ / Rakuten / ShareASale** — networks; per-merchant approval but many
  auto-approve; needed for Walmart/Target/Etsy specifically.
- **eBay Partner Network** — easy, and pairs with the Browse API.

### Recommended sourcing stack (hackathon → launch → scale)
1. **Now (hackathon):** RapidAPI/SerpApi Google-Shopping search → fill the feed with real
   image + title + price + merchant + URL. Feed looks *real* immediately.
2. **Launch:** wrap outbound URLs with **Sovrn/Skimlinks** → monetized from day one with
   no gatekeeping. Add **eBay Browse + EPN** and **Best Buy API** for first-party rates.
3. **Scale:** once you have clicks/sales, apply for **Amazon Associates** (now you can pass
   the sales gate), **Walmart/Target via Impact**, **Etsy via Awin** — better rates +
   unlock PA-API/Walmart.io for richer data.

---

## 6. Walmart affiliate — does it exist, and how?

**Yes.** Three related paths (all require an application; **verify current process**):

1. **Walmart Affiliate Program** — the standard publisher program, **managed through
   impact.com (Impact Radius)**. Apply at the Walmart affiliates page → get approved →
   generate tracking links / pull reports through Impact. This is the main route for a
   web app like yours. Commissions ~1–4% (category-dependent).
2. **Walmart.io Affiliate API** (developer portal) — programmatic **Catalog/Product/Taxonomy**
   APIs for approved partners; gives structured product data + affiliate linking. Requires
   a developer account + approval; better once you have traction.
3. **Walmart Creator** (creator.walmart.com) — newer **US creator** program for
   content/social creators to earn commissions; application-based. Useful if you position
   parts of Giftmaxxing as creator-driven.

**Process (typical):** apply (Impact) → approval (often days, not the sales-gate hell of
Amazon) → access links/reports → optionally apply for Walmart.io API key for bulk data.

---

## 7. Product Hunt launch + branding checklist

### Branding to lock before launch
- **Name check:** "Giftmaxxing" is playful/Gen-Z ("-maxxing" meme energy) — good for
  virality, but sanity-check connotations and **secure**: domain, `@giftmaxxing` social
  handles, basic **trademark search**. Decide on one spelling (`Giftmaxxing` vs
  `Giftmaxing` — the repo/folder uses both; pick one everywhere).
- **One-liner:** "The social gifting app with an AI companion." (already in the footer)
- **Visual identity:** the cream + coral, playful theme is distinctive — keep it
  consistent across PH assets, app icon, and OG image.

### Product Hunt assets needed
- **Logo/thumbnail** (square), **tagline** (≤60 chars), **description** (~240 chars).
- **Gallery: 3–5 images** → use `/screenshots` (landing + feed, desktop + mobile). ⚠️ Fix
  image hosting first (see below) so the gallery doesn't show empty hero areas.
- **30–60s demo video / GIF** — show: open feed → Maxi explains a pick → claim → group pool.
- **Maker's first comment** — the founder story + what feedback you want.
- **A PH-exclusive** — early access / a perk for hunters.

### Launch mechanics (PH norms)
- Set up a **"Coming soon"** page early to collect followers/notify-on-launch.
- Launch **Tue–Thu, 12:01am PT**; be online all day to reply to every comment.
- **Don't directly ask for upvotes** (against PH rules) — ask people to "check it out."
- Line up supporters/maker friends; engage genuinely; cross-post (X, LinkedIn, relevant
  subreddits/Discords) the same morning.

### ⚠️ Blocker to fix before showing it off: image hosting
The Midjourney images on the landing are hot-linked from `cdn.midjourney.com`, which is
**Cloudflare-protected** — they **don't load** for visitors without Midjourney cookies
(confirmed: they're blank in our headless-Chrome screenshots, and will be blank for PH
visitors/judges too). **Action:** download the chosen images and self-host in
`web/public/images/`, then point the components at local paths. (Gradients currently
fall back gracefully, but a hero with no image undersells the product.)

---

## 8. Differentiation — how to defend it

- **Feed-first gifting** (everyone else is list-first).
- **Maxi = explainable taste AI** ("Because you like film-photography finds") — the
  recommender already emits reasons; surface them everywhere.
- **Multi-merchant, not Amazon-locked** — one feed aggregates many stores (via
  aggregators), so recs are about *taste*, not *whatever pays most*.
- **Social-graph taste import** — Pinterest boards (open API), Spotify (open API) are the
  realistic, high-signal sources. **Instagram is the harder one** — see the reality check.
- **Surprise-preserving claim** — recipient stays surprised, giver sees what's taken.

### Reality check on "deep Instagram integration"
Meta's platform policy is restrictive: there is **no official API to read a user's saved
posts, follows, or browsing**. What's *actually* possible & compliant:
- **Login with Instagram** (via Facebook Login / Instagram API with Instagram Login — note
  Basic Display API was deprecated **Dec 2024**).
- **Read the user's OWN media** (with their consent) for taste signals.
- **Share-to-Story / deep links** out to Instagram.
For richer taste import, **Pinterest + Spotify APIs are the pragmatic "deep social ties."**
Position IG as *login + sharing*, not *scraping the graph*, to avoid building on something
Meta will shut off.

---

## 9. Concrete next steps (suggested order)

1. **Real products in the feed** — wire a Google-Shopping/Amazon search API (RapidAPI or
   SerpApi) into `infra/ingest` so cards show real image + price + merchant + URL.
2. **Day-one monetization** — wrap outbound links with **Sovrn or Skimlinks**; add the FTC
   disclosure + price disclaimer.
3. **First-party integrations** — **eBay Browse + EPN** and **Best Buy Products API** for
   real rates and clean data.
4. **Apply** — Walmart/Target/Etsy via **Impact/Awin** now; **Amazon Associates** after you
   have a few sales.
5. **Fix landing images** (self-host) and **assemble PH assets** from `/screenshots`.
6. **Add a seasonal viral loop** — Secret Santa / draw-names for the holiday window.

---

*Caveats: commission rates, API gates, and program names (esp. Amazon PA-API thresholds,
Walmart Creator availability, Instagram API surface) change frequently. Confirm each on the
official source the week you act on it.*

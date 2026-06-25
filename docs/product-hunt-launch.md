# Product Hunt launch kit — Giftmaxxing

Everything needed to launch Giftmaxxing on Product Hunt. Copy/paste the blocks
below, swap in final links, and upload the gallery assets.

- **Live site:** https://giftmaxxing.vercel.app
- **Jump straight to the app:** https://giftmaxxing.vercel.app/feed
- **The shop:** https://giftmaxxing.vercel.app/feed/shop
- **Privacy / data:** https://giftmaxxing.vercel.app/privacy

---

## 1. Name & tagline

**Name:** Giftmaxxing

**Tagline** (Product Hunt allows ~60 chars — pick one):

- Gifting, finally figured out.
- Social gifting with an AI companion
- Discover, wishlist & group-gift — with an AI concierge
- The group-gift app that finds the gift for you

---

## 2. Description (the "what is it", ~260 chars)

> Giftmaxxing is social gifting with an AI companion. Scroll a feed of real finds
> from friends, build shared wishlists nobody double-buys, and pool money for
> group gifts in a few taps. Maxi — your AI gift concierge — reads someone's
> taste and finds the perfect present in your budget.

---

## 3. Maker's first comment (post this immediately after launch)

> Hey Product Hunt 👋
>
> Every year the same thing happens: the group chat scrambles for a gift, two
> people buy the same thing, and someone ends up with a gift card. Gifting is a
> social act, but the tools are spreadsheets and last-minute panic.
>
> **Giftmaxxing** makes gifting feel like your favorite feed:
>
> - **A feed of finds** — 10k+ real, shoppable gift ideas mined from Pinterest,
>   discovered the way you scroll, not the way you search.
> - **Maxi, your AI gift concierge** — tell it a budget, a vibe, or who it's for
>   and it finds the gift, explains *why* it matches their taste, and lines it up
>   for you. You can even drop a photo and it finds similar finds.
> - **Shared wishlists & group gifting** — see what friends are saving, claim an
>   item so nobody double-buys, and pool money toward one great gift together.
>
> A few honest notes: we **coordinate** group gifts, we never touch your money or
> decide how a cost is split. Purchases happen on the retailer (the shop uses
> Amazon affiliate links). Sensitive details are redacted before anything reaches
> our AI, and you own and can delete your data.
>
> I'd love your feedback — especially on Maxi's picks and the group-gift flow.
> What's the best (or worst) gift you've ever given? 🎁

---

## 4. Gallery / media

**Social preview (Open Graph / Twitter card)** — auto-generated, on-brand 1200×630:
`web/app/opengraph-image.png` (served at `https://giftmaxxing.vercel.app/opengraph-image.png` after deploy).

**Gallery images** (self-hosted, live at `/shots/*` after deploy; high-res clean
captures are in `screenshots/launch/`):

| Order | Asset | Caption |
| ----- | ----- | ------- |
| 1 | `feed-desktop` | A feed of real, shoppable finds — discover like you scroll |
| 2 | `pools-desktop` | Group gifting: pool money toward one gift that actually lands |
| 3 | `maxi-desktop` | Meet Maxi — your AI gift concierge, in your budget |
| 4 | `shop-desktop` | A hand-picked Amazon shop; every purchase supports Giftmaxxing |
| 5 | `feed-mobile` | Built for the group chat — gifting on your phone |

Tips: lead with the feed (the "aha"), then group gifting (the differentiator).
PH recommends 1270×760 gallery images; the desktop shots are ~2000×1250 (crops
fine). A 30–60s screen-recording of asking Maxi for a gift converts well as the
first slot if you can record one.

---

## 5. Topics / categories

Gift Ideas · Shopping · Artificial Intelligence · Social · E-Commerce

---

## 6. Key features (for the listing body / talking points)

- **Discovery feed** — 10k+ real finds with outbound product links, ranked to your taste.
- **Maxi, agentic AI concierge** — budget/vibe/recipient → real picks, with the *why*; photo (visual) search; can assemble a cart.
- **Shared wishlists** — claim items so nobody double-buys; see friends' saves.
- **Group gifting (pools)** — start a pool, invite friends in-app or by link, track contributions toward a goal.
- **Events & reminders** — never miss the birthday you always forget.
- **Privacy-first** — PII redacted before AI; data encrypted at rest; full ownership + deletion.

---

## 7. Why now / differentiation

- **Social, not search.** Most gift tools are search boxes or listicles. Giftmaxxing is a feed — discovery that's actually fun.
- **An AI that gets taste, not just keywords.** Maxi reasons about *why* a gift fits a person, in a budget.
- **Group gifting that respects your money.** We coordinate the gift; we never process payments or dictate the split.

---

## 8. FAQ / anticipated questions

**Do you process payments / take a cut of group gifts?**
No. We coordinate who's chipping in toward a shared goal. Money moves between
people however they choose; we never hold funds or decide the split.

**Where do purchases happen?**
On the retailer. The shop uses Amazon affiliate links (we're an Amazon
Associate), so a qualifying purchase supports Giftmaxxing at no extra cost to you.
Prices and availability are always shown on Amazon.

**Is the cart/checkout real?**
The in-app cart and Maxi "checkout" are a simulated demo of the flow — no real
charge or shipment. Real buying happens via the retailer links.

**How is my data handled?**
Sensitive identifiers (emails, phone/payment/ID numbers) are redacted before any
text reaches our AI. Data is stored encrypted at rest in our own cloud with
least-privilege access. You own your data and can delete it. See /privacy.

**What's Maxi built on?**
An agentic LLM (Amazon Bedrock) with gift-specific tools; visual search uses a
multimodal embedding model so you can search by photo.

---

## 9. Launch-day checklist

- [ ] Launch at **12:01 AM PT** (PH day starts on Pacific time).
- [ ] Post the **maker's first comment** (section 3) immediately.
- [ ] Upload **gallery** in the order above; thumbnail = the feed shot.
- [ ] Confirm the **social preview** renders: paste the URL in the PH/X/Slack composer and on https://www.opengraph.xyz.
- [ ] Set **topics** (section 5).
- [ ] Have the team + early users ready to try the app and leave honest comments (no fake upvotes — PH penalizes it).
- [ ] Reply to **every** comment in the first few hours.
- [ ] Share to X/LinkedIn/relevant communities with the same link.
- [ ] Pin one clear CTA: "Try it → giftmaxxing.vercel.app/feed".

---

## 10. Pre-launch polish (nice-to-haves)

- Record a 30–60s Maxi demo for the first gallery slot.
- Wire the landing waitlist form to a real list (currently client-only).
- Seed a few real group-gift pools so /feed/pools looks alive on launch day.
- Curate the shop: fill `infra/ingest/asins.curate.tsv` (Title/Category/Description) and re-import so cards show real names, not "Amazon find".

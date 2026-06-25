# Giftmaxxing — User Stories

User stories for the Giftmaxxing app, grounded in the actual routes and code
(`web/app/**`, `infra/**`) and the architecture + agent-roadmap docs.

**Format:** `As a <persona>, I want <goal>, so that <benefit>.` Each story has
acceptance criteria and a status tag.

**Status legend**
- **[Live]** — implemented and working today.
- **[Partial]** — UI works (often on local/demo data); persistence or backend is pending.
- **[Planned]** — on the roadmap, not built yet.

> Status reflects the codebase + `docs/architecture.md` and `docs/agent-roadmap.md`
> at time of writing. Treat tags as a snapshot, not a contract.

---

## Personas

| Persona | Who they are |
| --- | --- |
| **Giver** | The signed-in user looking for, saving, and buying gifts. Primary persona. |
| **Organizer** | A giver who starts and runs a group-gift pool. |
| **Contributor** | Someone who chips into a pool (may be a guest). |
| **Recipient** | The person being gifted — has a taste profile and key dates; benefits from no-duplicate, on-taste gifts. |
| **Guest** | An invited person who completes a challenge/pool invite **without signing up**, creating a soft profile. |
| **Creator** | A user who posts finds into the feed. |
| **Prospect** | A landing-page / Product Hunt visitor evaluating the product. |
| **Privacy-minded user** | Any user who cares about consent, what the AI sees, and deleting their data. |

---

## Epic 1 — Onboarding & account

**1.1 Sign up / sign in** — *As a Giver, I want to sign in (or use the app without an account), so that I can start without friction.* **[Live]**
- Clerk-backed sign-in/up at `/sign-in` and `/sign-up` when keys are configured.
- When Clerk is not configured, the app degrades gracefully — every feature works except auth.
- Auth state drives cloud profile sync.

**1.2 Taste onboarding** — *As a Giver, I want a short onboarding that learns my taste, so that recommendations feel personal from day one.* **[Live]**
- `/onboarding` captures preferences and persists them.
- A returning signed-in user with a completed profile is **not** forced back through onboarding.
- The onboarding gate waits for the cloud profile-restore "settle" signal before deciding to redirect.

**1.3 Profile sync across devices** — *As a Giver, I want my profile to follow me, so that my taste and saves are consistent everywhere.* **[Partial]**
- Signed-in profile restores from the cloud on load.
- Some interaction data (likes/saves) is local-only until persistence is wired (see 2.3).

---

## Epic 2 — Discover gifts (Feed & Swipe)

**2.1 Browse a discovery feed** — *As a Giver, I want an infinite, on-taste feed of gift finds, so that I discover ideas by scrolling instead of searching.* **[Live]**
- `/feed` renders a cursor-paginated, infinite-scroll feed ranked server-side (`scorePost`).
- Defaults to image-bearing posts (`imagesOnly`).
- Falls back to local demo data + client ranker when the API is unset/unreachable.

**2.2 Filter the feed** — *As a Giver, I want to filter by recipient, occasion, category, or vibe, so that I can zero in on the right kind of gift.* **[Live]**
- Facet filters (recipient / occasion / category / vibes) are supported by `/feed` and `/recommendations`.

**2.3 Like, save, and comment** — *As a Giver, I want to react to finds, so that I can shortlist gifts and signal my taste.* **[Partial]**
- Like / save / comment update the UI immediately.
- A `POST /interactions` backend exists, but the current store keeps these **local-only** until persistence is wired — saves don't yet sync across devices.

**2.4 Swipe to discover** — *As a Giver, I want a fast swipe deck of gift ideas, so that I can triage many options quickly.* **[Live]**
- `/feed/swipe` presents a yes/no deck; choices feed taste signals.

**2.5 Curated drops & ideas** — *As a Giver, I want curated collections and idea lists, so that I get inspiration beyond the raw feed.* **[Live]**
- `/feed/drops` (curated/themed collections) and `/feed/ideas` (idea lists) are available.

---

## Epic 3 — Search & recommendations

**3.1 Personalized recommendations** — *As a Giver, I want recommendations that adapt to what I engage with, so that the more I use it, the better it gets.* **[Live]**
- `/feed/recommendations` ranks interaction-aware results with facet filters.
- **[Planned]** richer taste signals (embeddings, co-save graph, Pinterest/Spotify).

**3.2 Find people** — *As a Giver, I want to search for friends, so that I can see their finds and gift them.* **[Live]**
- `/feed/search` supports people search.

**3.3 Search brands & items** — *As a Giver, I want to search brands and products, so that I can look up specific gifts.* **[Partial]**
- Brand/item search UI/logic exists in components and is being unified into `/feed/search` tabs.

**3.4 Visual (photo) search** — *As a Giver, I want to upload a photo and find similar gifts, so that I can shop by look, not keywords.* **[Partial]**
- Backend exists (Bedrock Titan multimodal embeddings + S3 Vectors); the search-tab UI wiring is pending.

---

## Epic 4 — Maxi, the AI gift concierge

**4.1 Ask Maxi for a gift** — *As a Giver, I want to tell Maxi a budget, vibe, or recipient and get real picks, so that I don't have to figure it out alone.* **[Live]**
- `/feed/maxi` is a full agentic chat (`MaxiConversation`), also available as a slide-over elsewhere with a **shared transcript + cart**.
- Maxi returns concrete gift picks with reasoning for the recipient/budget.

**4.2 Maxi builds a cart** — *As a Giver, I want Maxi to line up picks in my cart, so that I can act on its suggestions in one place.* **[Live]**
- Maxi reads/writes the shared cart; product cards and Maxi use the same cart helpers.

**4.3 Maxi visual search** — *As a Giver, I want to show Maxi a photo, so that it finds gifts in that style.* **[Partial]**
- Multimodal backend exists; in-chat photo flow depends on the visual-search wiring (3.4).

**4.4 Safe AI** — *As a Privacy-minded user, I want sensitive details stripped before they reach the AI, so that I can ask freely without leaking PII.* **[Live]**
- PII (emails, phone/payment/ID numbers) is redacted server-side before text reaches the model.

---

## Epic 5 — Wishlists, saves & profiles

**5.1 Save finds to a wishlist** — *As a Giver/Recipient, I want to save finds, so that I (and friends) know what I like.* **[Partial]**
- Saves are captured in-app; cross-device persistence is pending (see 2.3).

**5.2 View someone's finds** — *As a Giver, I want to see another user's profile and saves, so that I can gift them something they'll actually want.* **[Live]**
- `/feed/[user]` shows a user's profile and their finds.

**5.3 Avoid double-buying** — *As a Contributor, I want to see what's already claimed/covered, so that two of us don't buy the same gift.* **[Partial]**
- Group pools coordinate a single shared gift (Epic 6); per-item "claim" on shared wishlists is the next step.

---

## Epic 6 — Group gifting (Pools)

**6.1 Start a pool** — *As an Organizer, I want to start a group gift with a goal, so that friends can pool money toward one great present.* **[Live]**
- `/feed/pools` → "Start a pool" captures title, occasion, goal, and a note.
- Pools persist locally (`loadFundraisers`/`saveFundraisers`).

**6.2 Invite people to a pool** — *As an Organizer, I want to invite friends in-app or by link, so that everyone can join easily — even before they sign up.* **[Live]**
- In-app invite + shareable invite URL carrying a pool snapshot (and `senderId` when signed in).
- An invited guest who later signs in has the pending pool added to their list automatically.

**6.3 Chip in** — *As a Contributor, I want to contribute a quick or custom amount, so that I can join the gift in seconds.* **[Live]**
- Quick amounts ($10/$25/$50/$100) or a custom amount; progress bar, contributor avatars, and a "Funded!" state.
- **Contributions are simulated** — the UI explicitly states *"no real payment is processed."* See 6.4.

**6.4 Money movement (non-custodial)** — *As a Contributor, I want clarity that the app coordinates the gift but doesn't take my money, so that I trust the flow.* **[Live]**
- The app coordinates contributions toward a goal; it never holds funds or processes payments.
- **[Planned]** optional real payment/settlement integration.

---

## Epic 7 — Events & reminders

**7.1 Track key dates** — *As a Giver, I want personal and shared events in one place, so that I never miss a birthday I always forget.* **[Live]**
- `/feed/events` (formerly Milestones) with **Personal** and **Shared** tabs.
- Shared events include recipient/connection dates, e.g. soft-profile birthdays captured by the viral loop.

**7.2 Gift prompts ahead of a date** — *As a Giver, I want a nudge before an event with gift ideas, so that I shop early instead of in a panic.* **[Partial]**
- Events surface upcoming dates; proactive reminders/notifications are pending backend wiring.

---

## Epic 8 — Social (Messages, Activity, Create)

**8.1 Message friends** — *As a Giver, I want to message friends about gifts, so that we can coordinate without leaving the app.* **[Partial]**
- `/feed/messages` provides the conversation UI (demo/local data).

**8.2 Activity & challenge notifications** — *As a Giver, I want to see activity and who completed my gift challenges, so that I stay in the loop.* **[Partial]**
- `/feed/activity` shows a "Your challenges" section and clears the unseen badge on view.
- Requires the `connections` backend deployed; otherwise the section is empty (acceptable).

**8.3 Post a find** — *As a Creator, I want to post a gift find, so that I can share it with friends and the feed.* **[Partial]**
- `/feed/create` provides the authoring UI; durable persistence depends on backend wiring.

---

## Epic 9 — Shop & checkout (Amazon affiliate)

**9.1 Browse the shop** — *As a Giver, I want a hand-picked shop of products, so that I have a trusted set of buyable gifts.* **[Live]**
- `/feed/shop` renders tiles built from Amazon ASINs with a visible affiliate disclosure.

**9.2 Compliant outbound buy links** — *As a Giver, I want buy links that take me to Amazon, so that I can purchase safely.* **[Live]**
- Links are `rel="sponsored nofollow"` with the Associates tag; built from ASINs only (no scraped prices/images), per the Associates Operating Agreement.

**9.3 International shoppers earn correctly** — *As a Giver abroad (e.g. India), I want links to send me to my local Amazon, so that I can actually buy and the right marketplace is credited.* **[Partial]**
- Amazon OneLink integration is in place to localize links per visitor; it stays dormant until `NEXT_PUBLIC_AMAZON_ONELINK_INSTANCE_ID` is configured and India/other programs are enrolled.

**9.4 Cart & checkout** — *As a Giver, I want a cart and checkout, so that I can assemble and "complete" a gift.* **[Live, simulated]**
- `/feed/cart` + Maxi share a localStorage cart; checkout is a **simulated demo — no real payment/commerce backend**.
- **[Planned]** swap the local cart helpers for a real commerce backend.

**9.5 Real product details** — *As a Giver, I want official titles/images/prices on shop tiles, so that I can compare before clicking.* **[Planned]**
- Pending Amazon PA-API access (granted after qualifying sales) to enrich `amazon-picks.json` compliantly.

---

## Epic 10 — Viral loop (Invites & soft profiles)

**10.1 Share a gift challenge** — *As a Giver, I want to share a swipe "challenge" with a friend, so that I learn their taste in a fun way.* **[Partial]**
- `/feed/swipe` → multi-channel share sheet (copy, email, SMS, WhatsApp, X, Instagram, native); the link carries `senderId` when signed in.

**10.2 Complete a challenge with no signup** — *As a Guest, I want to complete an invite without creating an account, so that there's zero friction.* **[Partial]**
- `/invite/[code]`: welcome → consent microcopy → swipe → birthday → done → redirect to `/feed`, creating a **local soft profile with no signup**.

**10.3 Get notified when a friend responds** — *As a Giver, I want to know when someone finishes my challenge, so that I can act on their taste.* **[Partial]**
- On completion the guest creates a connection for the sender; the sender sees it in `/feed/activity`.
- Fully live only after the `connections` backend is deployed.

---

## Epic 11 — Privacy, trust & data

**11.1 Understand data handling** — *As a Privacy-minded user, I want a clear explanation of what's collected and why, so that I can consent confidently.* **[Live]**
- `/privacy` explains soft-profile consent and data handling; it's linked from the invite flow and share sheet.

**11.2 PII never reaches the AI raw** — *As a Privacy-minded user, I want sensitive identifiers redacted before AI processing, so that my data isn't exposed.* **[Live]**
- Server-side redaction of emails and phone/payment/ID numbers before any text reaches the model.

**11.3 Own and delete my data** — *As a Privacy-minded user, I want to own and delete my data, so that I stay in control.* **[Partial]**
- Data is encrypted at rest with least-privilege access; self-serve export/delete UX is the next step.

---

## Epic 12 — Prospect / landing

**12.1 Understand the value fast** — *As a Prospect, I want the landing page to show what Giftmaxxing does, so that I can decide to try it.* **[Live]**
- `/` presents hero, features, how-it-works, and CTAs with real product screenshots and a branded social card.

**12.2 Try it or join** — *As a Prospect, I want a clear path into the app (or a waitlist), so that I can act on interest immediately.* **[Partial]**
- CTAs route into `/feed`; the waitlist capture is client-side and not yet wired to a list.

---

## Non-functional / cross-cutting expectations

- **Responsive** across desktop (≥1024px), tablet (768px), mobile (375px); sidebar collapses to mobile nav. **[Live]**
- **Resilient** — the app degrades gracefully when the API or Clerk is unconfigured (local fallbacks, best-effort calls guarded by `isApiConfigured()`). **[Live]**
- **Compliant monetization** — Amazon Associates rules (ASIN-only links, no scraped prices, proper `rel`, visible disclosure). **[Live]**
- **No console errors** on any route; sensible empty states. **[Live]**

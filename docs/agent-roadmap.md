# Agent Roadmap — Viral Loop (code done) + UI Changes (pending) + Deploy (blocked)

Status snapshot for follow-on agents. This PR ships the **viral loop** code
(verified locally) plus the **onboarding fix**. The AWS backend deploy and the
next batch of UI changes are **not done** — pick them up from the checklists below.

---

## 1. What this PR contains (DONE + verified)

### Onboarding fix (commit `b5c9bd9`)
- `web/components/app/onboarding-gate.tsx`, `web/components/app/account-sync.tsx`, `web/lib/profile-status.ts`
- The gate now waits for the cloud profile-restore "settle" signal before
  redirecting to `/onboarding`, so signed-in users are no longer forced through
  onboarding repeatedly.

### Viral loop — no-signup swipe challenge → soft profiles + sender notifications

Backend (`infra/`):
- `dynamodb.tf` — new `connections` table (PK `userId`, SK `connectionId`).
- `iam.tf` — grant the API Lambda access to the connections table.
- `lambda.tf` — `CONNECTIONS_TABLE` env var.
- `src/handler.mjs` — `POST /connections`, `GET /connections`,
  `POST /connections/seen`; CORS preflight (`OPTIONS` → 204).

Frontend (`web/`):
- `lib/invite.ts` — invite links carry `senderId` (Clerk userId).
- `lib/api.ts` — `createConnection`, `fetchConnections`, `markConnectionsSeen`,
  `getMyUserId`/`setMyUserId`. All best-effort (guarded by `isApiConfigured()` +
  try/catch), so guest completion never breaks if the backend is not yet deployed.
- `components/app/account-sync.tsx` — stashes the Clerk userId to localStorage.
- `app/invite/[code]/page.tsx` — on completion calls
  `createConnection(senderId, guest)`; adds consent microcopy.
- `app/feed/activity/page.tsx` — "Your challenges" notifications; marks seen on view.
- `components/app/share-sheet.tsx` — Wispr-style multi-channel share sheet.
- `app/feed/swipe/page.tsx` — uses `ShareSheet` + `senderId`-aware invite link.
- `app/privacy/page.tsx` — soft-profile consent + data-handling page.

### Verified locally (all green)
- `node --check infra/src/handler.mjs`
- `web`: `npx tsc --noEmit`, `npx eslint` (0 errors), `npm run build`
  (Next.js 16.2.9 — 19 routes)
- `infra`: `terraform validate`, `terraform fmt -check -recursive`

---

## 2. BLOCKED — AWS backend deploy (deferred until credentials are refreshed)

`terraform plan` failed at provider auth:

```
STS GetCallerIdentity → 403 InvalidClientTokenId
"The security token included in the request is invalid."
```

The AWS session is expired/unset. **This deploy cannot be completed until valid
AWS credentials are provided.** Owner: repo owner. ETA: whenever creds are
refreshed (next working session). The provider (`infra/providers.tf`) uses
default credential resolution — no hardcoded profile.

Steps once re-authenticated:
1. `aws sso login --profile <profile>` (or re-export
   `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` [/ `AWS_SESSION_TOKEN`]).
2. `aws sts get-caller-identity` → must succeed.
3. (Only if deps changed) `npm install` in `infra/src`. **No new deps** were
   added in this PR, so this is usually unnecessary.
4. `terraform -chdir=infra plan` → review. Expected: **+ connections table**,
   IAM policy update, Lambda env + code update. **No API Gateway route changes**
   (the API uses a `$default` proxy route; routing is in the Lambda).
5. `terraform -chdir=infra apply`.
6. Post-deploy smoke test (replace `<API>` with the API base URL output):
   - `curl -i -X OPTIONS <API>/connections` → `204`.
   - `curl -i -X POST <API>/connections -H 'content-type: application/json' \
      -d '{"senderId":"test_user","guest":{"name":"Test","yesCount":3,"totalSwipes":5}}'`
      → `200`.
   - `curl -i "<API>/connections?userId=test_user"` → `200` with the item.
   - `curl -i -X POST <API>/connections/seen -H 'content-type: application/json' \
      -d '{"userId":"test_user"}'` → `200`.

---

## 3. PENDING UI changes (next agent tasks)

### Task A — Remove the Explore page
- Remove the "Explore" nav item from `web/components/app/sidebar.tsx`
  (desktop **and** mobile lists).
- Delete the route `web/app/feed/explore/page.tsx`.
- **Keep** `web/components/app/explore-search.tsx` — its item/brand/visual search
  logic is reused by Search (Task B).
- Grep for `/feed/explore` and `Explore` and remove any dead links/redirects.

### Task B — Enhanced Search (people + brands + items + visual)
- File: `web/app/feed/search/page.tsx` (currently people-only from `lib/social.ts`).
- Add tabbed sections: **People** (existing `USERS`), **Brands**, **Items**,
  **Visual**.
- Reuse the item/brand/visual search UI + logic from
  `web/components/app/explore-search.tsx`.
- Visual search backend already exists (Bedrock Titan multimodal + S3 Vectors);
  wire via the existing search client in `lib/api.ts` if present, else degrade
  gracefully (best-effort, `isApiConfigured()` guard).
- **Do not** touch Drops or Group Gifts.

### Task C — Rename Milestones → Events (Personal / Shared tabs)
- File: `web/app/feed/milestones/page.tsx` (becomes "Events").
- Update label + icon + href in `web/components/app/sidebar.tsx`. Prefer a new
  route `web/app/feed/events/` with a redirect from `/feed/milestones`, or rename
  in place — keep one canonical route.
- Two tabs:
  - **Personal** — the user's own milestones/events.
  - **Shared** — events involving recipients/connections, including soft-profile
    birthdays captured by the viral loop (via `fetchConnections`).
- Data sources: `web/lib/events.ts` (recipients + important dates) and
  soft-profile birthdays from `lib/api.ts#fetchConnections`.

---

## 4. Browser-agent validation checklist (run on Vercel preview / local dev)

Run `npm run dev` in `web/` (or use this PR's Vercel preview).

**Global**
- No console errors/warnings on any route.
- Responsive at desktop (≥1024px), tablet (768px), mobile (375px); the sidebar
  collapses to the mobile nav.
- Clerk sign-in/out works; a signed-in returning user is **not** forced into
  onboarding (verifies the onboarding fix).

**Routes — visit each, check alignment / overflow / empty states**
- `/` — landing: hero, features, CTA, nav links.
- `/onboarding` — completes + persists; returning signed-in user skips it.
- `/feed` — feed renders; cards aligned.
- `/feed/swipe` — swipe deck; "Share the challenge" opens the ShareSheet; each
  channel (copy, email, SMS, WhatsApp, X, Instagram, native) yields a correct
  link; privacy note visible; copied link contains `senderId` when signed in.
- `/invite/<code>` — open in an incognito/guest session: welcome → consent
  microcopy → swipe → birthday → done → redirect to `/feed`; creates a local
  profile **with no signup**.
- `/feed/activity` — when signed in with collected connections, the
  "Your challenges" section appears and the unseen badge clears on view.
  (Requires the backend deployed; otherwise the section is empty — acceptable.)
- `/privacy` — renders; linked from invite + share sheet.
- `/feed/explore`, `/feed/search`, `/feed/milestones` — current state
  (changes in Tasks A–C).
- `/feed/drops`, `/feed/pools` (group gifts) — unchanged, still work.

**Viral-loop end-to-end (after backend deploy in §2)**
1. Signed-in sender → `/feed/swipe` → Share → copy link (link carries `senderId`).
2. Guest (incognito) opens the link → completes the challenge.
3. Sender refreshes `/feed/activity` → sees "<Guest> completed your gift challenge".

**Screenshots to capture**
- `/feed/swipe` with the share sheet open
- `/invite/<code>` welcome (with consent microcopy)
- `/feed/activity` "Your challenges"
- `/privacy`

---

## 5. Frontend deploy (Vercel)
- Vercel auto-deploys on push/merge; this PR branch should get a preview URL for
  the validation above.
- The viral loop is **fully live only after BOTH**: this PR is merged (frontend)
  **and** the AWS apply in §2 is completed (backend).

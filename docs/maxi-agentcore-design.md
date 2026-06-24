# Maxi on AgentCore — Design & Specs (for review)

Status: **DESIGN — not yet implemented.** This is the spec to approve before we
write the agent + infra. Nothing here has been deployed.

Maxi today is a rule-based stub (`web/lib/maxi.ts`: regex intent-parsing + canned
replies + local pin search), wrapped by `web/components/app/maxi-provider.tsx`
(chat UI, voice, simulated cart). The only real AI is visual/taste search (Titan
multimodal + S3 Vectors). This doc wires Maxi to a real LLM agent with memory.

---

## 1. Model

| Item | Value |
|------|-------|
| Display name | Claude Haiku 4.5 |
| Bedrock invoke id | `us.anthropic.claude-haiku-4-5-20251001-v1:0` (cross-region inference profile) |
| Foundation id | `anthropic.claude-haiku-4-5-20251001-v1:0` |
| Region | `us-east-1` (matches the stack) |
| Config | `MAXI_MODEL_ID` env var / Terraform var, default = the `us.` profile above |

Confirmed present in the account via `aws bedrock list-foundation-models` /
`list-inference-profiles`. **Action:** enable model access in Bedrock console if
not already (one-time, per account/region).

---

## 2. Architecture

```
Browser (maxi-provider.tsx)
  │  POST /maxi { userId, sessionId, message, context }
  ▼
API Gateway ($default)  ──►  API Lambda (handler.mjs)  ──► bedrock-agentcore:InvokeAgentRuntime
                                                              │
                                                              ▼
                                              AgentCore Runtime (ARM64 container)
                                                  Strands Agent + Haiku 4.5
                                                  ├─ tools ──► existing Giftmaxxing HTTP API
                                                  └─ memory ─► AgentCore Memory (actor=Clerk userId)
```

Decisions baked in (all overridable in review):
- **Framework:** Strands (AWS-recommended; cleanest Runtime + Bedrock + tools path).
- **Tool exposure:** in-agent Strands tools calling the existing HTTP API. (Defer
  AgentCore **Gateway**/MCP until we want cross-agent tool reuse — it adds OAuth
  and credential-provider setup we don't need yet.)
- **Frontend reach:** proxy through the existing API Gateway + Lambda so the
  browser never holds AWS creds. Inbound auth to Runtime = **IAM** (the proxy
  Lambda's role) — no Cognito/JWT layer needed for v1.
- **Protocol:** HTTP Runtime, non-streaming for v1 (single request/response, like
  the current chat). Add SSE streaming in a later phase.

---

## 3. What Maxi can DO — tool specs

Each tool is a Strands `@tool` that calls the existing API (`NEXT_PUBLIC_API_URL`
base, passed to the agent as `API_BASE`). Returns are trimmed to keep tokens low.

| Tool | Args | Returns | Backs onto |
|------|------|---------|------------|
| `find_gifts` | `budget?, category?, recipient?, occasion?, limit=6` | `[{postId,name,price,brand,image,reason}]` | `GET /recommendations` (facet) / `GET /feed` |
| `taste_match` | `seedKeys[]?, vibes[]?, limit=6` | same shape, `source` | `GET /recommendations` (vector path) |
| `visual_search` | `imageBase64, text?, limit=6` | same shape | `POST /visual-search` |
| `gift_ideas` | `recipient` | `{ideas[], bundles[]}` | `GET /ideas` |
| `list_recipients` | — | `[{recipient,label,postCount}]` | `GET /recipients` |
| `upcoming_events` | `userId, withinDays=90` | `[{type,date,daysUntil,recipient}]` | `GET /events/upcoming` |
| `get_profile` | `userId` | profile item (recipients+events) | `GET /me` |
| `save_recipient_or_event` | `userId, patch` | ok | `GET /me` → merge → `PUT /me` |
| `list_connections` | `userId` | soft profiles (guest taste) | `GET /connections` |
| `add_to_cart` / `view_cart` / `checkout` | pins / — | action intents | **client-side** (simulated cart stays in the browser) |

Notes:
- **Cart/checkout stay client-side & simulated** for v1. The agent emits a
  structured action (e.g. `{action:"add_to_cart", postIds:[...]}`) in its JSON
  reply that `maxi-provider.tsx` executes against `lib/cart.ts`. No commerce
  backend is introduced.
- `userId` is the **Clerk userId** (from `getMyUserId()`), forwarded by the proxy.
  When absent (demo mode / signed-out), profile/event/connection tools are
  disabled and Maxi runs catalog-only.
- All tool HTTP calls inherit the existing API's behavior (best-effort, graceful
  if S3 Vectors/Bedrock unavailable).

---

## 4. What Maxi REMEMBERS — memory schema

**Resource:** AgentCore Memory `giftmaxxing-<env>-maxi-memory`.
**Keying:** `actor_id = Clerk userId` (stable across sessions/devices),
`session_id = per-chat UUID` (≥33 chars, generated client-side, persisted in
`localStorage` so a page refresh keeps the thread).

### Short-term (within a session)
- Every turn is written as an immutable event (user message + Maxi reply).
- Retrieved at the start of each turn to maintain context ("add the first one",
  "something cheaper", "actually for my mom").

### Long-term (cross-session, per user) — strategies
| Strategy | Captures | Example |
|----------|----------|---------|
| `USER_PREFERENCE` | budgets, liked/disliked categories, who they shop for | "usually spends $30–50", "dislikes scented candles" |
| `SEMANTIC` | durable facts inferred from chat | "sister Maya loves matcha", "anniversary May 3" |
| `SUMMARY` | per-session recap | "Helped pick a birthday gift for dad under $40" |

### Per-turn flow
1. `search_memories(actor_id, query=user_message, limit≈5)` → inject as
   "What I remember about you" into the prompt.
2. `get_session_events(session_id)` → recent turns for immediate context.
3. Run Haiku 4.5 with system prompt + memories + tools.
4. `add_event(...)` for the user message and Maxi's reply (short-term).
5. Long-term extraction runs **async** server-side (strategies), no inline cost.

### Boundary vs DynamoDB (important)
- **DynamoDB `users` table = source of truth** for structured profile, recipients,
  and dated events (these power reminders/feed and must be exact).
- **AgentCore Memory = conversational/inferred memory** (preferences, soft facts,
  summaries). When Maxi learns a concrete event ("anniversary May 3"), she should
  **write it through to DynamoDB** via `save_recipient_or_event` so reminders fire —
  Memory is the scratchpad, DynamoDB is the record.

### Privacy / retention
- Memory is per-Clerk-user; signed-out users get **no** long-term memory.
- Add a "Maxi's memory" delete path (delete events/memories by `actor_id`) and a
  line in `/privacy`. Set a retention policy (proposal: 365 days) on the resource.

> SDK method names (`add_event`, `get_session_events`, `search_memories`,
> `store_memory`) are per the AgentCore Memory README — verify exact signatures
> against the pinned `bedrock-agentcore` version at implementation time.

---

## 5. System prompt (draft)

```
You are Maxi, the gift concierge inside Giftmaxxing. You help people find,
shortlist, and (simulated) check out gifts, and you remember their taste and the
people they shop for.

Voice: warm, concise, a little playful. 1–3 sentences per reply. You're spoken
aloud sometimes (TTS), so avoid markdown tables, long lists, and emoji spam
(one tasteful emoji max).

Capabilities — use tools, don't guess:
- Find gifts by budget/vibe/recipient/occasion (find_gifts, taste_match).
- "Find something like this photo" → visual_search.
- Recall who they shop for and important dates (get_profile, upcoming_events,
  list_connections) and proactively suggest when a date is near.
- When the user reveals a durable fact (a recipient, a budget, a date, a like or
  dislike), save it (save_recipient_or_event) AND it will be remembered.
- Add to cart / checkout are SIMULATED — say so honestly; never imply a real
  charge or shipment.

Memory: a "What I remember" block may be provided. Use it naturally; never claim
to remember if the block is empty. Don't fabricate preferences.

Always ground product claims in tool results. If a tool fails or returns nothing,
say so briefly and offer an alternative. Never invent prices, links, or stock.

Output: reply as JSON { "say": string, "pins"?: [postId...], "actions"?: [...] }.
"say" is what the user sees/hears; "pins" are products to render; "actions" are
client ops like {"type":"add_to_cart","postIds":[...]} or {"type":"checkout"}.
```

---

## 6. Infra plan (Phase 2 — after this design is approved)

New code:
- `agent/` (Python): `agent.py` (Strands + `BedrockAgentCoreApp`), `tools.py`,
  `memory.py`, `prompts.py`, `requirements.txt`, `Dockerfile` (ARM64, port 8080,
  non-root uid 1000, `/invocations` + `/ping`).
- Proxy: extend `infra/src/handler.mjs` with `POST /maxi` →
  `InvokeAgentRuntime`. Needs `@aws-sdk/client-bedrock-agentcore` bundled (not in
  the nodejs20 runtime SDK) + IAM `bedrock-agentcore:InvokeAgentRuntime`.
- Frontend: `askMaxi()` in `web/lib/api.ts` (POST `/maxi`), and swap the
  `respond()` call in `maxi-provider.tsx` for it — **keep `respond()` as the
  offline fallback** (graceful degradation, matching existing patterns).

New AWS resources:
- ECR repo `giftmaxxing-<env>-maxi`.
- IAM Runtime execution role (ECR pull, Bedrock invoke on the Haiku profile,
  AgentCore Memory read/write, CloudWatch logs).
- AgentCore **Memory** resource (strategies in §4).
- AgentCore **Runtime** (the container) + `DEFAULT` endpoint.
- Tag everything `Project/Env/ManagedBy` (so it lands in the Resource Group +
  cost dashboards).

### ⚠️ Open decision — deploy mechanism
The Terraform AWS provider has **no native AgentCore Runtime/Memory resources**
yet. Options:
- **(a) Deploy script** (`infra/agentcore/deploy-agent.sh`): `docker buildx`
  (arm64) → ECR push → `aws bedrock-agentcore-control create-memory` +
  `create-agent-runtime`. ECR/IAM stay in Terraform; AgentCore via CLI. *Recommended.*
- **(b) AgentCore CLI** (`agentcore deploy`): auto Docker/ECR/Runtime; least code,
  least declarative.
- **(c) CDK** for the AgentCore bits (L1 `CfnRuntime`) alongside Terraform — adds a
  second IaC tool.

### Region note
Examples in the skill use `us-west-2`. **Verify AgentCore Runtime + Memory are
available in `us-east-1`**; if not, deploy them in `us-west-2` and have the
proxy Lambda call cross-region (DynamoDB/API stay in us-east-1 — fine).

### Rough cost (dev)
Haiku 4.5 tokens (cheap) + Runtime microVM per active session (15-min idle
timeout) + Memory storage + async extraction model calls. Expect low single-digit
$/mo at dev traffic. No alarms; rely on the cost dashboard.

---

## 7. Phased rollout
1. **P1 (this doc):** design + specs approved.
2. **P2:** build `agent/` (Strands + Haiku 4.5 + tools + memory), run locally
   (`python agent.py` + curl `/invocations`) — verify tool-calling + memory.
3. **P3:** ECR + IAM (Terraform) + Memory/Runtime (deploy script) + `/maxi`
   proxy; smoke-test `InvokeAgentRuntime`.
4. **P4:** wire `maxi-provider.tsx` → `/maxi`; keep local fallback; ship behind a
   `NEXT_PUBLIC_MAXI_AGENT=1` flag.
5. **P5:** memory delete path + `/privacy` update; optional SSE streaming; optional
   Gateway/MCP tool exposure; Observability + Evaluations.

## 8. Success criteria
- Local: Maxi answers a multi-turn gift conversation, calls ≥2 tools correctly,
  and recalls a fact stated earlier in the session.
- Deployed: `/maxi` returns Maxi replies for a signed-in user; a preference stated
  in one session is recalled in a new session (long-term memory works); a concrete
  date told to Maxi appears in `GET /events/upcoming` (write-through to DynamoDB).

## 9. What I need from you (review)
1. Deploy mechanism: **(a) script** / (b) AgentCore CLI / (c) CDK.
2. Tools: in-agent now (recommended) vs AgentCore **Gateway/MCP** now.
3. Region: us-east-1 (preferred) — OK to fall back to us-west-2 if AgentCore isn't
   in us-east-1?
4. Memory strategies: `USER_PREFERENCE + SEMANTIC + SUMMARY` as proposed?
5. Persona/system-prompt tweaks (tone, JSON-vs-plaintext output contract).
```

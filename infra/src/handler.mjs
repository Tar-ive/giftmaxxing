// Giftmaxxing API — single Lambda behind an HTTP API ($default proxy route).
// Uses AWS SDK v3, which is bundled into the nodejs20.x runtime (no deps to ship).
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  S3VectorsClient,
  QueryVectorsCommand,
  GetVectorsCommand,
  ListVectorsCommand,
} from "@aws-sdk/client-s3vectors";
import { BedrockRuntimeClient, InvokeModelCommand, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const USERS = process.env.USERS_TABLE;
const POSTS = process.env.POSTS_TABLE;
const INTERACTIONS = process.env.INTERACTIONS_TABLE;
const KNOWLEDGE = process.env.KNOWLEDGE_TABLE;
const CONNECTIONS = process.env.CONNECTIONS_TABLE;
const EVENTS = process.env.EVENTS_TABLE;
const GRAPH = process.env.GRAPH_TABLE;
const CONFIG = process.env.CONFIG_TABLE;

// ── Cost kill-switch feature flag (DynamoDB config table) ────────────────────
// The breaker Lambda sets { paused: true } when spend trips $1,000 or a real-time
// alarm fires. Read here with a short in-memory cache and FAIL-OPEN: any error /
// missing flag means NOT paused, so a config glitch never takes the app down.
// When paused, the non-essential (cost-driving) routes short-circuit while auth,
// feed/posts, and data collection keep serving.
let _flagCache = { at: 0, paused: false };
async function isPaused() {
  if (!CONFIG) return false;
  const now = Date.now();
  if (now - _flagCache.at < 30000) return _flagCache.paused;
  try {
    const out = await ddb.send(new GetCommand({ TableName: CONFIG, Key: { key: "feature-flags" } }));
    _flagCache = { at: now, paused: out.Item?.paused === true };
  } catch (err) {
    console.warn("isPaused read failed (fail-open):", err.message);
    _flagCache = { at: now, paused: false };
  }
  return _flagCache.paused;
}

// S3 Vectors (the vector store powering similarity-based recommendations).
const VECTOR_BUCKET = process.env.VECTOR_BUCKET;
const VECTOR_INDEX = process.env.VECTOR_INDEX;
const s3v = VECTOR_BUCKET ? new S3VectorsClient({}) : null;

// Bedrock Titan Multimodal embeddings power visual search: an uploaded image is
// embedded into the SAME shared space the pin index was built with (see
// infra/ingest/embed.mjs), so image->image kNN works directly.
const EMBED_MODEL = process.env.BEDROCK_EMBED_MODEL_ID || "amazon.titan-embed-image-v1";
const VECTOR_DIM = Number(process.env.VECTOR_DIM || 1024);
const bedrock = new BedrockRuntimeClient({});

// Embed an uploaded image (base64, with or without a data-URL prefix) + optional
// text into a single 1024-d query vector via Titan Multimodal.
async function embedImage(imageB64, text) {
  const inputImage = String(imageB64).replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  const reqBody = { inputImage, embeddingConfig: { outputEmbeddingLength: VECTOR_DIM } };
  if (text) reqBody.inputText = String(text).slice(0, 200);
  const out = await bedrock.send(
    new InvokeModelCommand({
      modelId: EMBED_MODEL,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(reqBody),
    })
  );
  return JSON.parse(Buffer.from(out.body).toString("utf8")).embedding;
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

// Opaque pagination cursor = base64url(LastEvaluatedKey) for infinite scroll.
const encodeCursor = (k) => (k ? Buffer.from(JSON.stringify(k)).toString("base64url") : null);
const decodeCursor = (c) => {
  try {
    return c ? JSON.parse(Buffer.from(c, "base64url").toString()) : undefined;
  } catch {
    return undefined;
  }
};

const parseList = (s) => (s ? String(s).split(",").map((x) => x.trim()).filter(Boolean) : []);

// Content-based score over the enriched facets (mirrors web/lib/recommend.ts).
// Surfaces real giftable products (find/made) over idea-requests, blends in
// social proof, taste (vibes), explicit facet matches, and mild recency.
function scorePost(p, { vibes = [], recipient, occasion, category, budget, eventBoost = 0, now = Date.now() } = {}) {
  let s = 0;
  s += Math.min(1, (p.likes ?? 0) / 500) * 0.35; // social proof
  s += p.status === "find" ? 0.15 : p.status === "made" ? 0.12 : 0; // gift type
  if (vibes.length && Array.isArray(p.vibes)) {
    const hit = p.vibes.filter((v) => vibes.includes(v)).length;
    s += Math.min(1, hit / 2) * 0.25; // taste match
  }
  // Recipient/occasion matches count for more as a logged event approaches
  // (eventBoost ramps 0→1 over ~45 days; see web/lib/events.ts).
  const occMult = 1 + Math.max(0, Math.min(1, eventBoost));
  if (recipient && recipient !== "anyone" && p.recipient === recipient) s += 0.2 * occMult;
  if (occasion && occasion !== "any" && p.occasion === occasion) s += 0.15 * occMult;
  if (category && p.category === category) s += 0.2;
  // Budget fit: reward at/under the event's target, gently penalize over-budget.
  const price = Number(p.price ?? p.product?.price);
  if (budget && Number.isFinite(price) && price > 0) {
    s += price <= budget ? 0.15 : Math.max(-0.1, 0.15 - ((price - budget) / budget) * 0.25);
  }
  const ageDays = (now - (p.createdAt ?? now)) / 86400000;
  s += Math.max(0, 1 - ageDays / 365) * 0.1; // recency
  s += Math.random() * 0.08; // exploration
  return s;
}

// ── Vector recommendations (S3 Vectors) ──────────────────────────────────────
// Replaces the hand-tuned "taste" term with real embedding similarity: build a
// taste vector = centroid of the user's seed pin embeddings, then ask the index
// for nearest neighbors. Falls back (returns null) when no vectors are available.
async function getCentroid(keys) {
  if (!s3v || !keys.length) return null;
  const out = await s3v.send(
    new GetVectorsCommand({
      vectorBucketName: VECTOR_BUCKET,
      indexName: VECTOR_INDEX,
      keys: keys.slice(0, 20),
      returnData: true,
    })
  );
  const vecs = (out.vectors ?? []).map((v) => v.data?.float32).filter(Array.isArray);
  if (!vecs.length) return null;
  const dim = vecs[0].length;
  const c = new Array(dim).fill(0);
  for (const v of vecs) for (let i = 0; i < dim; i++) c[i] += v[i];
  for (let i = 0; i < dim; i++) c[i] /= vecs.length;
  return c;
}

function vecToItem(v) {
  const m = v.metadata ?? {};
  return {
    postId: v.key,
    author: m.sourceUser || "pinterest",
    image: m.imageUrl || "",
    s3Key: m.s3Key || "",
    name: m.title || "",
    link: m.pinUrl || "",
    source: m.source || "pinterest-rss",
    rec: true,
    reason: "Similar to your taste",
    _score: v.distance != null ? 1 - v.distance : null,
    _distance: v.distance ?? null,
  };
}

// Ranked post-shaped items from S3 Vectors, or null to fall back to facets.
async function vectorRecommend(seedKeys, { limit, sourceUser }) {
  const centroid = await getCentroid(seedKeys);
  if (!centroid) return null;
  const seen = new Set(seedKeys);
  const out = await s3v.send(
    new QueryVectorsCommand({
      vectorBucketName: VECTOR_BUCKET,
      indexName: VECTOR_INDEX,
      topK: limit + seedKeys.length,
      queryVector: { float32: centroid },
      returnMetadata: true,
      returnDistance: true,
      filter: sourceUser ? { sourceUser: { $eq: sourceUser } } : undefined,
    })
  );
  return (out.vectors ?? [])
    .filter((v) => !seen.has(v.key))
    .slice(0, limit)
    .map(vecToItem);
}

// Server-side mirror of web/lib/events.ts date math: whole days until an event's
// next occurrence (annual rolls forward a year if it already passed; once is
// absolute). Returns null on a malformed date.
function eventDaysUntil(ev, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ev?.date ?? "").trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next;
  if (ev.recurrence === "once") {
    next = new Date(y, mo - 1, da);
  } else {
    next = new Date(today.getFullYear(), mo - 1, da);
    if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, mo - 1, da);
  }
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function computeUpcoming(events, withinDays = 90, now = new Date()) {
  return (events ?? [])
    .map((ev) => ({ ...ev, daysUntil: eventDaysUntil(ev, now) }))
    .filter((e) => e.daysUntil != null && e.daysUntil >= 0 && (withinDays <= 0 || e.daysUntil <= withinDays))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

// ── Network graph (DynamoDB single-table: nodes + edges) ─────────────────────
// Captures ALL data (hard onboarding data + soft swipe-derived taste) as one
// connected graph so nothing is lost. Partitioned by owner (userId); the
// byEntity GSI enables cross-owner traversal of edges into any node.
const gid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// A node item (Put-safe: fully specified on every write).
function gNode(ownerId, type, id, { scope, label, data } = {}) {
  return {
    pk: ownerId,
    sk: `N#${type}#${id}`,
    kind: "node",
    entityId: `${type}#${id}`,
    type,
    ...(scope ? { scope } : {}),
    ...(label ? { label: String(label).slice(0, 120) } : {}),
    data: data ?? {},
    updatedAt: Date.now(),
  };
}

// A directed edge item. src/dst use "type:id" inside the sort key.
function gEdge(ownerId, rel, srcType, srcId, dstType, dstId, data) {
  return {
    pk: ownerId,
    sk: `E#${rel}#${srcType}:${srcId}#${dstType}:${dstId}`,
    kind: "edge",
    entityId: `${dstType}#${dstId}`,
    rel,
    srcRef: `${srcType}#${srcId}`,
    dstRef: `${dstType}#${dstId}`,
    data: data ?? {},
    updatedAt: Date.now(),
  };
}

// Interest nodes + LIKES edges connecting a source (user/recipient/soft) to each
// normalized interest tag — this is what makes the graph a real "network".
function interestItems(ownerId, srcType, srcId, interests) {
  const out = [];
  for (const raw of interests ?? []) {
    const tag = String(raw).trim().toLowerCase().slice(0, 40);
    if (!tag) continue;
    out.push(gNode(ownerId, "interest", tag, { label: tag }));
    out.push(gEdge(ownerId, "LIKES", srcType, srcId, "interest", tag));
  }
  return out;
}

// Best-effort batch Put of graph items. Never throws (the graph is a mirror).
async function graphWrite(items) {
  if (!GRAPH || !Array.isArray(items) || items.length === 0) return;
  const now = Date.now();
  const all = items.filter(Boolean).map((it) => ({ createdAt: now, ...it }));
  try {
    for (let i = 0; i < all.length; i += 25) {
      const chunk = all.slice(i, i + 25);
      await ddb.send(
        new BatchWriteCommand({
          RequestItems: { [GRAPH]: chunk.map((Item) => ({ PutRequest: { Item } })) },
        })
      );
    }
  } catch (err) {
    console.error("graphWrite error", err);
  }
}

// Merge-update a node's flat attributes (used for the user node so frequent
// identity pings never clobber profile data written by PUT /me, and vice versa).
async function graphMergeNode(ownerId, type, id, attrs = {}) {
  if (!GRAPH || !ownerId) return;
  const now = Date.now();
  const names = { "#type": "type", "#kind": "kind" };
  const values = { ":kind": "node", ":type": type, ":eid": `${type}#${id}`, ":now": now };
  const sets = [
    "#kind = :kind",
    "#type = :type",
    "entityId = :eid",
    "updatedAt = :now",
    "createdAt = if_not_exists(createdAt, :now)",
  ];
  let i = 0;
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    const nk = `#a${i}`;
    const vk = `:a${i}`;
    names[nk] = k;
    values[vk] = v;
    sets.push(`${nk} = ${vk}`);
    i++;
  }
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: GRAPH,
        Key: { pk: ownerId, sk: `N#${type}#${id}` },
        UpdateExpression: "SET " + sets.join(", "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
  } catch (err) {
    console.error("graphMergeNode error", err);
  }
}

// Fan out a saved profile into the events table (scope-tagged) + the network
// graph (user/recipient/event/interest nodes + edges). Best-effort.
async function captureProfile(userId, profile) {
  try {
    const recipients = Array.isArray(profile.recipients) ? profile.recipients : [];
    const events = Array.isArray(profile.events) ? profile.events : [];
    const byId = Object.fromEntries(recipients.map((r) => [r.id, r]));

    await graphMergeNode(userId, "user", userId, {
      scope: "personal",
      label: profile.name || undefined,
      role: profile.role || undefined,
      style: profile.style || undefined,
      interests: Array.isArray(profile.interests) ? profile.interests : undefined,
    });

    const g = [];
    g.push(...interestItems(userId, "user", userId, profile.interests));
    for (const r of recipients) {
      if (!r?.id) continue;
      g.push(
        gNode(userId, "recipient", r.id, {
          scope: "shared",
          label: r.name,
          data: { name: r.name, relation: r.relation, interests: r.interests ?? [] },
        })
      );
      g.push(gEdge(userId, "GIFTS_TO", "user", userId, "recipient", r.id, { relation: r.relation }));
      g.push(...interestItems(userId, "recipient", r.id, r.interests));
    }
    for (const ev of events) {
      if (!ev?.id) continue;
      const scope = ev.recipientId ? "shared" : "personal";
      g.push(
        gNode(userId, "event", ev.id, {
          scope,
          label: ev.type,
          data: { type: ev.type, date: ev.date, recurrence: ev.recurrence, budget: ev.budget, recipientId: ev.recipientId },
        })
      );
      if (ev.recipientId)
        g.push(gEdge(userId, "HAS_EVENT", "recipient", ev.recipientId, "event", ev.id, { type: ev.type, date: ev.date }));
      else g.push(gEdge(userId, "HAS_EVENT", "user", userId, "event", ev.id, { type: ev.type, date: ev.date }));
    }
    await graphWrite(g);

    if (EVENTS && events.length) {
      const now = Date.now();
      const evItems = events
        .filter((e) => e?.id)
        .map((ev) => ({
          userId,
          eventId: ev.id,
          scope: ev.recipientId ? "shared" : "personal",
          kind: "occasion",
          type: ev.type,
          date: ev.date,
          recurrence: ev.recurrence,
          reminderLeadDays: ev.reminderLeadDays,
          budget: ev.budget,
          recipientId: ev.recipientId,
          recipientName: byId[ev.recipientId]?.name,
          updatedAt: now,
          createdAt: now,
        }));
      for (let i = 0; i < evItems.length; i += 25) {
        const chunk = evItems.slice(i, i + 25);
        if (chunk.length)
          await ddb.send(
            new BatchWriteCommand({ RequestItems: { [EVENTS]: chunk.map((Item) => ({ PutRequest: { Item } })) } })
          );
      }
    }
  } catch (err) {
    console.error("captureProfile error", err);
  }
}

// Mirror a soft profile (challenge connection) into the events table (shared) +
// the network graph (soft node, COLLECTED edge, interest edges). Best-effort.
async function captureConnection(item) {
  try {
    const ownerId = item.userId;
    const g = [
      gNode(ownerId, "soft", item.connectionId, {
        scope: "shared",
        label: item.guestName,
        data: {
          guestName: item.guestName,
          birthday: item.birthday,
          vibes: item.vibes,
          seeds: item.seeds,
          interests: item.interests,
          yesCount: item.yesCount,
          totalSwipes: item.totalSwipes,
        },
      }),
      gEdge(ownerId, "COLLECTED", "user", ownerId, "soft", item.connectionId, { kind: "challenge" }),
      ...interestItems(ownerId, "soft", item.connectionId, [...(item.interests || []), ...(item.vibes || [])]),
    ];
    await graphWrite(g);
    if (EVENTS) {
      await ddb.send(
        new PutCommand({
          TableName: EVENTS,
          Item: {
            userId: ownerId,
            eventId: item.connectionId,
            scope: "shared",
            kind: "soft-profile",
            type: "birthday",
            date: item.birthday,
            recipientName: item.guestName,
            soft: true,
            taste: { vibes: item.vibes, seeds: item.seeds, interests: item.interests },
            createdAt: item.createdAt,
            updatedAt: Date.now(),
          },
        })
      );
    }
  } catch (err) {
    console.error("captureConnection error", err);
  }
}

// ── Maxi: the Haiku 4.5 gift concierge (Bedrock Converse + tool use) ─────────
// Real LLM agent hosted IN this Lambda (no container): the browser POSTs the
// chat transcript to /maxi, we run a bounded tool-use loop where each tool reads
// the SAME data the rest of the API serves, then return { say, pins, actions }.
// Long-term memory lives as MEM# items in the graph table (pk=userId) and is
// invisible to GET /graph (which only returns kind node|edge).
// ── Maxi model router ───────────────────────────────────────────────────
// Two Bedrock tiers, chosen per request to keep cost low:
//   • BASE (default): Amazon's own model (Nova) — cheapest; handles browsing,
//     gift discovery, taste chat, and Q&A.
//   • SHOPPING: a stronger model (Claude Haiku) — used when an AGENTIC SHOPPING
//     experience is triggered (the user wants to add to cart / buy / checkout, or
//     the agent itself reaches for a cart/checkout tool mid-loop), where reliable
//     multi-step tool orchestration matters more than raw token price.
const MAXI_BASE_MODEL_ID = process.env.MAXI_BASE_MODEL_ID || "us.amazon.nova-lite-v1:0";
const MAXI_SHOPPING_MODEL_ID =
  process.env.MAXI_SHOPPING_MODEL_ID || process.env.MAXI_MODEL_ID || "us.anthropic.claude-haiku-4-5-20251001-v1:0";

// Tools that, once the agent reaches for them, mean we're in a shopping flow.
const MAXI_SHOPPING_TOOLS = new Set(["add_to_cart", "checkout"]);

// Transactional intent in the user's message. Mirrors the offline responder's
// regexes (web/lib/maxi.ts) so the router and the fallback agree on "shopping".
const MAXI_SHOPPING_INTENT_RE = new RegExp(
  [
    "check\\s?out",
    "place (an |the |my )?order",
    "order now",
    "buy\\b",
    "purchase",
    "complete (my )?(purchase|order)",
    "pay( now)?",
    "add .*(cart|basket)",
    "add (it|that|this|these|them|the first|the second|the third|one|two|three|all)\\b",
    "(my|the) (cart|basket)",
    "add to cart",
  ].join("|"),
  "i"
);

// Pick the tier for a request: an explicit client signal wins, otherwise sniff
// transactional intent from the latest user message.
function maxiIsShopping(userText, body) {
  if (body && (body.mode === "shopping" || body.agentic === true || body.shopping === true)) return true;
  return MAXI_SHOPPING_INTENT_RE.test(String(userText || ""));
}

// ── Maxi budgets (token-per-interaction + monthly Bedrock $ cap) ─────────────
// Per-INTERACTION: maxTokens caps output per model call; MAXI_INTERACTION_TOKEN_
// BUDGET hard-caps TOTAL tokens (in+out) summed across the tool-use loop — when
// exceeded we stop looping. Per-MONTH: an estimated-USD Bedrock cap tracked in
// the config table (key maxi-budget#YYYY-MM, atomic ADD, per-month key so there's
// no reset logic); when hit, /maxi 503s and the client falls back to the offline
// responder. Prices are env-driven — VERIFY against Bedrock's Haiku 4.5 pricing.
const MAXI_MAX_TOKENS = Number(process.env.MAXI_MAX_TOKENS || 768);
const MAXI_INTERACTION_TOKEN_BUDGET = Number(process.env.MAXI_INTERACTION_TOKEN_BUDGET || 30000);
const MAXI_MAX_STEPS = Number(process.env.MAXI_MAX_STEPS || 5);
const MAXI_MONTHLY_BUDGET_USD = Number(process.env.MAXI_MONTHLY_BUDGET_USD || 25);
// Per-tier Bedrock prices (USD per 1M tokens) so the monthly $ budget stays
// accurate even when one interaction spans both models. BASE defaults to Amazon
// Nova Lite; SHOPPING falls back to the legacy MAXI_PRICE_* (Haiku) numbers.
// VERIFY all four against current Bedrock pricing.
const MAXI_BASE_PRICE_IN_PER_1M = Number(process.env.MAXI_BASE_PRICE_IN_PER_1M || 0.06);
const MAXI_BASE_PRICE_OUT_PER_1M = Number(process.env.MAXI_BASE_PRICE_OUT_PER_1M || 0.24);
const MAXI_SHOPPING_PRICE_IN_PER_1M = Number(
  process.env.MAXI_SHOPPING_PRICE_IN_PER_1M || process.env.MAXI_PRICE_IN_PER_1M || 1.0
);
const MAXI_SHOPPING_PRICE_OUT_PER_1M = Number(
  process.env.MAXI_SHOPPING_PRICE_OUT_PER_1M || process.env.MAXI_PRICE_OUT_PER_1M || 5.0
);

const maxiMonthKey = () => `maxi-budget#${new Date().toISOString().slice(0, 7)}`;

// Cost of a single model call, priced by the model that actually served it.
function maxiStepCostUsd(modelId, inTok, outTok) {
  const shopping = modelId === MAXI_SHOPPING_MODEL_ID;
  const pin = shopping ? MAXI_SHOPPING_PRICE_IN_PER_1M : MAXI_BASE_PRICE_IN_PER_1M;
  const pout = shopping ? MAXI_SHOPPING_PRICE_OUT_PER_1M : MAXI_BASE_PRICE_OUT_PER_1M;
  return ((Number(inTok) || 0) / 1e6) * pin + ((Number(outTok) || 0) / 1e6) * pout;
}

// Month-to-date Maxi Bedrock spend (USD). Fail-open to 0 so a read error never
// blocks Maxi (the per-interaction token cap still bounds any single call).
async function maxiSpentThisMonth() {
  if (!CONFIG) return 0;
  try {
    const out = await ddb.send(new GetCommand({ TableName: CONFIG, Key: { key: maxiMonthKey() } }));
    return Number(out.Item?.spentUsd) || 0;
  } catch (e) {
    console.warn("maxiSpentThisMonth read failed (fail-open):", e.message);
    return 0;
  }
}

// Atomically add this interaction's usage to the month's counter (best-effort).
async function recordMaxiUsage(inTok, outTok, costUsd) {
  if (!CONFIG) return;
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: CONFIG,
        Key: { key: maxiMonthKey() },
        UpdateExpression: "SET updatedAt = :now ADD spentUsd :c, tokensIn :i, tokensOut :o",
        ExpressionAttributeValues: {
          ":now": Date.now(),
          ":c": Number(costUsd) || 0,
          ":i": Number(inTok) || 0,
          ":o": Number(outTok) || 0,
        },
      })
    );
  } catch (e) {
    console.warn("recordMaxiUsage failed:", e.message);
  }
}

const MAXI_SYSTEM = `You are Maxi, the gift concierge inside Giftmaxxing. You help people find, shortlist, and (simulated) check out gifts, and you remember their taste and the people they shop for.

Voice: warm, concise, a little playful — 1 to 3 sentences. You may be read aloud, so avoid markdown tables and long lists; at most one tasteful emoji.

IMPORTANT — identity rules:
- The user's first name is provided in the system prompt below (if known). ALWAYS use that name when addressing the user.
- get_profile returns the user's OWN profile. The "yourName" field is the user's own name. The "recipients" list contains OTHER people the user shops for — never confuse a recipient's name with the user's name.
- list_connections returns friends/contacts ("soft profiles") — these are OTHER people, NOT the user. Their "friendName" field is the friend's name.
- relationship_graph returns "otherPeople" — these are OTHER people in the user's gifting network, NOT the user themselves.
- If the user asks "what is my name?" or similar, respond with the name from the system prompt or from get_profile's "yourName" field. NEVER return a connection's or recipient's name as the user's name.

Use tools, don't guess:
- Find gifts by budget / vibe / recipient / category with find_gifts.
- Look up Reddit-mined ideas for a recipient with gift_ideas, or list types with list_recipients.
- Recall who they shop for and key dates with get_profile, upcoming_events, list_connections, relationship_graph — and proactively flag a date that's near.
- When the user states a durable fact (a budget, a like/dislike, who they shop for), call remember_fact. When they give a concrete dated occasion, call save_event so reminders fire.
- add_to_cart and checkout are SIMULATED — say so honestly; never imply a real charge or shipment.

After find_gifts or gift_ideas, briefly say what you found; the products render automatically, so don't recite every price in prose. Ground all product claims in tool results — never invent prices, brands, or links. If a tool returns nothing, say so and offer an alternative.`;

async function recallMemories(userId, limit = 8) {
  if (!GRAPH || !userId) return [];
  try {
    const out = await ddb.send(
      new QueryCommand({
        TableName: GRAPH,
        KeyConditionExpression: "pk = :u AND begins_with(sk, :p)",
        ExpressionAttributeValues: { ":u": userId, ":p": "MEM#" },
        ScanIndexForward: false,
        Limit: limit,
      })
    );
    return (out.Items ?? []).map((m) => m.text).filter(Boolean);
  } catch (e) {
    console.warn("recallMemories failed:", e.message);
    return [];
  }
}

async function saveMemory(userId, kind, text) {
  if (!GRAPH || !userId || !text) return;
  const k = ["preference", "semantic", "summary"].includes(kind) ? kind : "semantic";
  await ddb.send(
    new PutCommand({
      TableName: GRAPH,
      Item: {
        pk: userId,
        sk: `MEM#${k}#${gid()}`,
        kind: "memory",
        memKind: k,
        text: String(text).slice(0, 280),
        createdAt: Date.now(),
      },
    })
  );
}

function maxiProduct(p) {
  return {
    postId: p.postId,
    title: String(p.title || p.name || "").slice(0, 90),
    price: typeof p.price === "number" ? p.price : null,
    brand: p.brand || null,
    image: p.image || p.imageUrl || null,
    category: p.category || null,
  };
}

async function toolFindGifts({ budget, category, recipient, vibes, limit }) {
  const n = Math.min(Number(limit) || 6, 10);
  const opts = {
    vibes: Array.isArray(vibes) ? vibes : parseList(vibes),
    recipient: recipient || undefined,
    category: category || undefined,
    budget: Number(budget) || undefined,
  };
  const out = await ddb.send(new ScanCommand({ TableName: POSTS, Limit: 150 }));
  let pool = out.Items ?? [];
  if (opts.budget) pool = pool.filter((p) => (typeof p.price === "number" ? p.price : 1e9) <= opts.budget);
  const items = pool
    .map((p) => ({ p, s: scorePost(p, opts) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(({ p }) => maxiProduct(p));
  return { items, count: items.length };
}

async function toolGiftIdeas({ recipient }) {
  if (!recipient) return { error: "recipient required" };
  const out = await ddb.send(
    new GetCommand({ TableName: KNOWLEDGE, Key: { recipient: String(recipient).toLowerCase() } })
  );
  if (!out.Item) return { ideas: [], bundles: [], note: "no mined data for that recipient" };
  const ideas = (out.Item.ideas ?? [])
    .slice(0, 8)
    .map((i) => ({ item: i.item || i.label || i.name, count: i.count }));
  const bundles = (out.Item.bundles ?? []).slice(0, 4).map((b) => ({ items: (b.items || []).slice(0, 4) }));
  return { ideas, bundles };
}

async function toolListRecipients() {
  const out = await ddb.send(new ScanCommand({ TableName: KNOWLEDGE }));
  const items = (out.Items ?? [])
    .filter((r) => r.recipient !== "anyone" && r.recipient !== "self")
    .map((r) => ({ recipient: r.recipient, label: r.label || r.recipient, postCount: r.postCount ?? 0 }))
    .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0))
    .slice(0, 20);
  return { items };
}

async function toolGetProfile(userId) {
  if (!userId) return { error: "not signed in" };
  const out = await ddb.send(new GetCommand({ TableName: USERS, Key: { userId } }));
  const it = out.Item;
  if (!it) return { exists: false };
  return {
    exists: true,
    yourName: it.identity?.name || it.name || it.profile?.name || null,
    note: "yourName is the user's OWN name. recipients below are OTHER people they shop for.",
    interests: (it.interests || it.profile?.interests || []).slice(0, 12),
    recipients: (it.recipients || []).slice(0, 12).map((r) => ({ id: r.id, name: r.name, relation: r.relation })),
    events: (it.events || []).slice(0, 12).map((e) => ({ type: e.type || e.title, date: e.date, recipientId: e.recipientId })),
  };
}

async function toolUpcomingEvents(userId, withinDays) {
  if (!userId) return { error: "not signed in" };
  const out = await ddb.send(new GetCommand({ TableName: USERS, Key: { userId } }));
  const events = Array.isArray(out.Item?.events) ? out.Item.events : [];
  const recipients = Array.isArray(out.Item?.recipients) ? out.Item.recipients : [];
  const byId = Object.fromEntries(recipients.map((r) => [r.id, r]));
  const items = computeUpcoming(events, Number(withinDays) || 90).map((u) => ({
    type: u.type,
    date: u.date,
    daysUntil: u.daysUntil,
    recipient: byId[u.recipientId]?.name ?? u.recipientName ?? null,
  }));
  return { items };
}

async function toolListConnections(userId) {
  if (!userId) return { error: "not signed in" };
  const out = await ddb.send(
    new QueryCommand({
      TableName: CONNECTIONS,
      KeyConditionExpression: "userId = :u",
      ExpressionAttributeValues: { ":u": userId },
    })
  );
  const items = (out.Items ?? [])
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 15)
    .map((c) => ({
      friendName: c.guestName,
      birthday: c.birthday || null,
      interests: (c.interests || []).slice(0, 6),
      vibes: (c.vibes || []).slice(0, 6),
      connectionId: c.connectionId,
    }));
  return { items, note: "These are the user's FRIENDS/CONNECTIONS (other people), not the user. friendName is the friend's name." };
}

async function toolRelationshipGraph(userId) {
  if (!userId || !GRAPH) return { error: "no graph" };
  const out = await ddb.send(
    new QueryCommand({
      TableName: GRAPH,
      KeyConditionExpression: "pk = :u",
      ExpressionAttributeValues: { ":u": userId },
    })
  );
  const all = (out.Items ?? []).filter((i) => i.kind === "node" || i.kind === "edge");
  const nodes = all.filter((i) => i.kind === "node");
  const edges = all.filter((i) => i.kind === "edge");
  const byType = {};
  for (const n of nodes) byType[n.type] = (byType[n.type] || 0) + 1;
  const otherPeople = nodes
    .filter((n) => n.type === "recipient" || n.type === "soft")
    .map((n) => n.label)
    .filter(Boolean)
    .slice(0, 12);
  return {
    counts: { nodes: nodes.length, edges: edges.length, byType },
    otherPeople,
    note: "otherPeople are people in the user's gifting NETWORK — friends, family, recipients. They are NOT the user themselves.",
  };
}

async function toolSaveEvent(userId, { title, date, recipientName }) {
  if (!userId) return { error: "not signed in — can't save" };
  if (!title || !date) return { error: "need a title and a date (YYYY-MM-DD)" };
  const out = await ddb.send(new GetCommand({ TableName: USERS, Key: { userId } }));
  const item = out.Item || { userId, createdAt: Date.now() };
  const events = Array.isArray(item.events) ? item.events : [];
  const ev = {
    id: `evt_${gid()}`,
    type: String(title).slice(0, 80),
    date: String(date).slice(0, 10),
    recipientName: recipientName ? String(recipientName).slice(0, 60) : undefined,
    source: "maxi",
    createdAt: Date.now(),
  };
  events.push(ev);
  item.events = events;
  item.updatedAt = Date.now();
  await ddb.send(new PutCommand({ TableName: USERS, Item: item }));
  return { ok: true, saved: { type: ev.type, date: ev.date } };
}

async function toolRememberFact(userId, { fact, kind }) {
  if (!userId) return { error: "not signed in — no long-term memory" };
  if (!fact) return { error: "nothing to remember" };
  await saveMemory(userId, kind, fact);
  return { ok: true };
}

// Tool specs advertised to the model (JSON Schema per Converse toolConfig).
const MAXI_TOOLS = [
  {
    name: "find_gifts",
    description: "Search the gift catalog by budget, category, recipient type, and/or vibes. Returns products that render to the user.",
    schema: {
      type: "object",
      properties: {
        budget: { type: "number", description: "max price in USD" },
        category: { type: "string", description: "e.g. home, kitchen, jewelry, tech, wellness, plants, art" },
        recipient: { type: "string", description: "recipient type, e.g. mom, dad, friend, partner" },
        vibes: { type: "array", items: { type: "string" }, description: "taste keywords, e.g. cozy, minimal" },
        limit: { type: "number", description: "how many to return (max 10)" },
      },
    },
  },
  {
    name: "gift_ideas",
    description: "Reddit-mined gift ideas and bundles for a specific recipient type.",
    schema: { type: "object", properties: { recipient: { type: "string" } }, required: ["recipient"] },
  },
  {
    name: "list_recipients",
    description: "List the recipient types we have mined gift ideas for.",
    schema: { type: "object", properties: {} },
  },
  {
    name: "get_profile",
    description: "The signed-in user's OWN profile. 'yourName' = the user's own name. 'recipients' = OTHER people the user shops for (not the user). Never confuse a recipient name with the user's name.",
    schema: { type: "object", properties: {} },
  },
  {
    name: "upcoming_events",
    description: "The user's upcoming saved occasions (soonest first) within a window of days.",
    schema: { type: "object", properties: { withinDays: { type: "number" } } },
  },
  {
    name: "list_connections",
    description: "Friends the user collected from swipe challenges. 'friendName' = the friend's name (NOT the user). These are OTHER people in the user's network.",
    schema: { type: "object", properties: {} },
  },
  {
    name: "relationship_graph",
    description: "A compact summary of the user's gifting network graph. 'otherPeople' = friends/family/recipients in the network (NOT the user themselves).",
    schema: { type: "object", properties: {} },
  },
  {
    name: "save_event",
    description: "Save a concrete dated occasion to the user's profile so reminders fire. Date must be YYYY-MM-DD.",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        recipientName: { type: "string" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "remember_fact",
    description: "Remember a durable preference or fact about the user for future sessions (e.g. budget, a like/dislike).",
    schema: {
      type: "object",
      properties: {
        fact: { type: "string" },
        kind: { type: "string", enum: ["preference", "semantic"] },
      },
      required: ["fact"],
    },
  },
  {
    name: "add_to_cart",
    description: "Add products (by postId) to the user's SIMULATED cart in the browser.",
    schema: {
      type: "object",
      properties: { postIds: { type: "array", items: { type: "string" } } },
      required: ["postIds"],
    },
  },
  {
    name: "checkout",
    description: "Place the user's SIMULATED order (no real charge or shipment).",
    schema: { type: "object", properties: {} },
  },
];

async function runMaxiTool(name, input, ctx) {
  const i = input || {};
  switch (name) {
    case "find_gifts": {
      const r = await toolFindGifts(i);
      ctx.pins.push(...(r.items || []));
      return r;
    }
    case "gift_ideas":
      return toolGiftIdeas(i);
    case "list_recipients":
      return toolListRecipients();
    case "get_profile":
      return toolGetProfile(ctx.userId);
    case "upcoming_events":
      return toolUpcomingEvents(ctx.userId, i.withinDays);
    case "list_connections":
      return toolListConnections(ctx.userId);
    case "relationship_graph":
      return toolRelationshipGraph(ctx.userId);
    case "save_event":
      return toolSaveEvent(ctx.userId, i);
    case "remember_fact":
      return toolRememberFact(ctx.userId, i);
    case "add_to_cart": {
      const ids = Array.isArray(i.postIds) ? i.postIds.map(String) : [];
      ctx.actions.push({ type: "add_to_cart", postIds: ids });
      return { ok: true, added: ids.length };
    }
    case "checkout":
      ctx.actions.push({ type: "checkout" });
      return { ok: true };
    default:
      return { error: `unknown tool ${name}` };
  }
}

// Build a clean alternating Converse transcript (must start + end on a user turn).
// Redact sensitive identifiers from anything we send to the AI provider (Bedrock).
// First names are intentionally kept (Maxi needs them to personalize), but emails,
// phone numbers, and card/ID-like numbers are stripped so they never leave for the
// model. Recurses into tool-result objects/arrays. Backs the privacy statement.
function scrubPII(v) {
  if (typeof v === "string") {
    return v
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
      .replace(/\b(?:\d[ -]?){13,19}\b/g, "[number]")
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[id]")
      .replace(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]");
  }
  if (Array.isArray(v)) return v.map(scrubPII);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = scrubPII(val);
    return o;
  }
  return v;
}

function buildMaxiMessages(incoming, userText) {
  const turns = [];
  for (const m of (Array.isArray(incoming) ? incoming : []).slice(-12)) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const text = typeof m.text === "string" ? m.text : typeof m.content === "string" ? m.content : "";
    const t = String(text).trim();
    if (t) turns.push({ role, content: [{ text: scrubPII(t.slice(0, 2000)) }] });
  }
  if (userText) turns.push({ role: "user", content: [{ text: scrubPII(userText.slice(0, 2000)) }] });
  const norm = [];
  for (const m of turns) {
    if (!norm.length && m.role !== "user") continue;
    const last = norm[norm.length - 1];
    if (last && last.role === m.role) last.content.push(...m.content);
    else norm.push({ role: m.role, content: [...m.content] });
  }
  while (norm.length && norm[norm.length - 1].role !== "user") norm.pop();
  return norm;
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? "GET";
  const path = event.requestContext?.http?.path ?? "/";
  const qs = event.queryStringParameters ?? {};

  // CORS preflight: API Gateway's catch-all ($default) route forwards OPTIONS to
  // this Lambda instead of auto-answering it, so reply 204 with the preflight
  // headers. access-control-allow-origin is added by the API's CORS config, so
  // we omit it here to avoid emitting a duplicate header.
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
        "access-control-allow-headers": "content-type,authorization",
        "access-control-max-age": "3600",
      },
      body: "",
    };
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: "invalid JSON body" });
  }

  try {
    // GET /feed?limit=&author=&cursor=&vibes=&recipient=&occasion=&category=
    // Cursor-paginated infinite feed; each page is ranked by scorePost().
    if (method === "GET" && path === "/feed") {
      const limit = Math.min(Number(qs.limit) || 20, 50);
      const start = decodeCursor(qs.cursor);
      if (qs.author) {
        const out = await ddb.send(
          new QueryCommand({
            TableName: POSTS,
            IndexName: "byAuthor",
            KeyConditionExpression: "author = :a",
            ExpressionAttributeValues: { ":a": qs.author },
            ScanIndexForward: false,
            Limit: limit,
            ExclusiveStartKey: start,
          })
        );
        return json(200, { items: out.Items ?? [], cursor: encodeCursor(out.LastEvaluatedKey) });
      }
      const opts = {
        vibes: parseList(qs.vibes),
        recipient: qs.recipient,
        occasion: qs.occasion,
        category: qs.category,
        budget: Number(qs.budget) || undefined,
        eventBoost: Number(qs.eventBoost) || 0,
      };

      // Preferred path: read ONE recency-ordered page from the byFeed GSI
      // (PK feedPk="all", SK createdAt) instead of scanning the whole table —
      // this is what lets the feed scale past a few hundred posts. Facets are
      // hard-filtered; the returned page is then ranked by scorePost().
      try {
        const eav = { ":f": "all" };
        const filters = [];
        if (qs.recipient && qs.recipient !== "anyone") { filters.push("recipient = :r"); eav[":r"] = qs.recipient; }
        if (qs.occasion && qs.occasion !== "any") { filters.push("occasion = :o"); eav[":o"] = qs.occasion; }
        if (qs.category) { filters.push("category = :c"); eav[":c"] = qs.category; }
        const out = await ddb.send(
          new QueryCommand({
            TableName: POSTS,
            IndexName: "byFeed",
            KeyConditionExpression: "feedPk = :f",
            ExpressionAttributeValues: eav,
            FilterExpression: filters.length ? filters.join(" AND ") : undefined,
            ScanIndexForward: false, // newest first
            Limit: filters.length ? 150 : limit, // over-read when filtering
            ExclusiveStartKey: start,
          })
        );
        const ranked = (out.Items ?? [])
          .map((p) => ({ ...p, _score: scorePost(p, opts) }))
          .sort((a, b) => b._score - a._score);
        return json(200, { items: ranked, cursor: encodeCursor(out.LastEvaluatedKey) });
      } catch (err) {
        // byFeed GSI not deployed yet (or transient error) -> legacy fallback.
        console.warn("byFeed query failed, falling back to full scan:", err.message);
      }

      // Legacy fallback: scan the whole table, rank globally, paginate by offset.
      // Only used until the byFeed GSI exists; fine for a few hundred items.
      const allItems = [];
      let scanKey = undefined;
      do {
        const out = await ddb.send(
          new ScanCommand({ TableName: POSTS, ExclusiveStartKey: scanKey })
        );
        allItems.push(...(out.Items ?? []));
        scanKey = out.LastEvaluatedKey;
      } while (scanKey);
      const ranked = allItems
        .map((p) => ({ ...p, _score: scorePost(p, opts) }))
        .sort((a, b) => b._score - a._score);
      const offset = start?._offset ?? 0;
      const page = ranked.slice(offset, offset + limit);
      const nextOffset = offset + limit;
      const cursor = nextOffset < ranked.length ? encodeCursor({ _offset: nextOffset }) : null;
      return json(200, { items: page, cursor });
    }

    // GET /posts/{id}
    if (method === "GET" && path.startsWith("/posts/")) {
      const postId = decodeURIComponent(path.split("/")[2] ?? "");
      const out = await ddb.send(new GetCommand({ TableName: POSTS, Key: { postId } }));
      return out.Item ? json(200, out.Item) : json(404, { error: "not found" });
    }

    // GET /recipients — list of recipients for the picker (label + counts).
    // Sourced from the Reddit-mined knowledge base (KNOWLEDGE table).
    if (method === "GET" && path === "/recipients") {
      const out = await ddb.send(new ScanCommand({ TableName: KNOWLEDGE }));
      const items = (out.Items ?? [])
        .filter((r) => r.recipient !== "anyone" && r.recipient !== "self")
        .map((r) => ({
          recipient: r.recipient,
          label: r.label ?? r.recipient,
          postCount: r.postCount ?? 0,
          ideaCount: Array.isArray(r.ideas) ? r.ideas.length : 0,
        }))
        .sort((a, b) => b.postCount - a.postCount);
      return json(200, { items });
    }

    // GET /ideas?recipient=mom — ranked gift ideas + bundles for one recipient.
    if (method === "GET" && path === "/ideas") {
      const recipient = qs.recipient || "anyone";
      const out = await ddb.send(new GetCommand({ TableName: KNOWLEDGE, Key: { recipient } }));
      return out.Item ? json(200, out.Item) : json(404, { error: "unknown recipient" });
    }

    // GET /pins?limit= — list embedded Pinterest pins (key + metadata) straight
    // from S3 Vectors. The browser uses these keys as seed vectors for the
    // recommendation kNN (a pin's key == its postId in the posts table).
    if (method === "GET" && path === "/pins") {
      if (!s3v || (await isPaused())) return json(200, { items: [] });
      const limit = Math.min(Number(qs.limit) || 60, 200);
      const out = await s3v.send(
        new ListVectorsCommand({
          vectorBucketName: VECTOR_BUCKET,
          indexName: VECTOR_INDEX,
          maxResults: limit,
          returnMetadata: true,
        })
      );
      const items = (out.vectors ?? []).map(vecToItem);
      return json(200, { items });
    }

    // POST /visual-search  { imageBase64, text?, limit?, sourceUser? }
    // True "find gifts that look like this": embed the uploaded image with Titan
    // Multimodal, then kNN against the pin index. Returns post-shaped items.
    if (method === "POST" && path === "/visual-search") {
      if (await isPaused()) return json(503, { error: "temporarily disabled (cost guard)" });
      if (!s3v) return json(503, { error: "vector store not configured" });
      const imageBase64 = body.imageBase64 || body.image;
      if (!imageBase64) return json(400, { error: "imageBase64 required" });
      const limit = Math.min(Number(body.limit) || 12, 50);
      let queryVector;
      try {
        queryVector = await embedImage(imageBase64, body.text);
      } catch (e) {
        console.warn("titan image embed failed:", e.message);
        return json(502, { error: "embedding failed" });
      }
      const out = await s3v.send(
        new QueryVectorsCommand({
          vectorBucketName: VECTOR_BUCKET,
          indexName: VECTOR_INDEX,
          topK: limit,
          queryVector: { float32: queryVector },
          returnMetadata: true,
          returnDistance: true,
          filter: body.sourceUser ? { sourceUser: { $eq: body.sourceUser } } : undefined,
        })
      );
      const items = (out.vectors ?? []).map(vecToItem);
      return json(200, { items, source: "visual" });
    }

    // POST /interactions  { userId, targetId, type }
    if (method === "POST" && path === "/interactions") {
      const { userId, targetId, type } = body;
      if (!userId || !targetId || !type) {
        return json(400, { error: "userId, targetId, type required" });
      }
      // One row per (user, target, type) → idempotent like/save.
      await ddb.send(
        new PutCommand({
          TableName: INTERACTIONS,
          Item: {
            userId,
            targetId: `${type}#${targetId}`,
            type,
            target: targetId,
            createdAt: Date.now(),
          },
        })
      );
      return json(200, { ok: true });
    }

    // GET /recommendations?userId=&limit=&cursor=&vibes=&recipient=&occasion=&category=
    // Personalized ranked picks. Taste can come from server-side interactions
    // (userId) and/or explicit facet hints passed by the client.
    if (method === "GET" && path === "/recommendations") {
      const userId = qs.userId;
      let likedTargets = new Set();
      if (userId) {
        const inter = await ddb.send(
          new QueryCommand({
            TableName: INTERACTIONS,
            KeyConditionExpression: "userId = :u",
            ExpressionAttributeValues: { ":u": userId },
          })
        );
        likedTargets = new Set((inter.Items ?? []).map((i) => i.target));
      }

      const limit = Math.min(Number(qs.limit) || 12, 50);

      // Vector path: taste = centroid of the user's seed pins -> kNN in S3 Vectors.
      // Seeds come from ?seedKeys=pin-a,pin-b or from the user's interactions.
      const seedKeys = parseList(qs.seedKeys);
      const seeds = seedKeys.length ? seedKeys : [...likedTargets];
      if (s3v && seeds.length && !(await isPaused())) {
        try {
          const vitems = await vectorRecommend(seeds, { limit, sourceUser: qs.sourceUser });
          if (vitems && vitems.length) {
            return json(200, { items: vitems, cursor: null, source: "vector" });
          }
        } catch (e) {
          console.warn("vector recommend failed, falling back to facets:", e.message);
        }
      }

      const opts = {
        vibes: parseList(qs.vibes),
        recipient: qs.recipient,
        occasion: qs.occasion,
        category: qs.category,
        budget: Number(qs.budget) || undefined,
        eventBoost: Number(qs.eventBoost) || 0,
      };
      const scan = {
        TableName: POSTS,
        Limit: 120,
        ExclusiveStartKey: decodeCursor(qs.cursor),
      };
      const out = await ddb.send(new ScanCommand(scan));
      const items = (out.Items ?? [])
        .filter((p) => !likedTargets.has(p.postId) && p.author !== userId)
        .map((p) => ({ ...p, _score: scorePost(p, opts) }))
        .sort((a, b) => b._score - a._score)
        .slice(0, limit);

      return json(200, { items, cursor: encodeCursor(out.LastEvaluatedKey), source: "facet" });
    }

    // POST /seed  { users:[], posts:[] }  — dev convenience to load sample data
    if (method === "POST" && path === "/seed") {
      const chunks = (arr) =>
        Array.from({ length: Math.ceil(arr.length / 25) }, (_, i) =>
          arr.slice(i * 25, i * 25 + 25)
        );
      // Posts must carry feedPk="all" + a numeric createdAt so they show up in
      // the byFeed recency GSI the /feed endpoint pages through.
      const prep = (name, Item) =>
        name === POSTS
          ? { ...Item, feedPk: "all", createdAt: Number(Item.createdAt) || Date.now() }
          : Item;
      for (const table of [
        [USERS, body.users ?? []],
        [POSTS, body.posts ?? []],
      ]) {
        const [name, items] = table;
        for (const c of chunks(items)) {
          if (c.length === 0) continue;
          await ddb.send(
            new BatchWriteCommand({
              RequestItems: { [name]: c.map((Item) => ({ PutRequest: { Item: prep(name, Item) } })) },
            })
          );
        }
      }
      return json(200, { ok: true, users: (body.users ?? []).length, posts: (body.posts ?? []).length });
    }

    // GET /me?userId=  — fetch the signed-in user's stored profile. Recipients +
    // events ride along on the same item, so the whole profile hydrates at once.
    if (method === "GET" && path === "/me") {
      const userId = qs.userId;
      if (!userId) return json(400, { error: "userId required" });
      const out = await ddb.send(new GetCommand({ TableName: USERS, Key: { userId } }));
      return json(200, { item: out.Item ?? null });
    }

    // PUT /me  { userId, profile }  — upsert the profile keyed by the Clerk
    // userId. Stored as one item (incl. recipients + events) for easy hydration.
    if (method === "PUT" && path === "/me") {
      const { userId, profile } = body;
      if (!userId || !profile || typeof profile !== "object") {
        return json(400, { error: "userId and profile required" });
      }
      const item = { ...profile, userId, updatedAt: Date.now() };
      await ddb.send(new PutCommand({ TableName: USERS, Item: item }));
      // Fan out into the events table + network graph so nothing is missed.
      await captureProfile(userId, profile);
      return json(200, { ok: true, item });
    }

    // GET /events/upcoming?userId=&withinDays=  — events due soon, soonest-first,
    // each joined with its recipient. Powers reminders + feed event context.
    if (method === "GET" && path === "/events/upcoming") {
      const userId = qs.userId;
      if (!userId) return json(400, { error: "userId required" });
      const out = await ddb.send(new GetCommand({ TableName: USERS, Key: { userId } }));
      const events = Array.isArray(out.Item?.events) ? out.Item.events : [];
      const recipients = Array.isArray(out.Item?.recipients) ? out.Item.recipients : [];
      const byId = Object.fromEntries(recipients.map((r) => [r.id, r]));
      const withinDays = Number(qs.withinDays) || 90;
      const items = computeUpcoming(events, withinDays).map((u) => ({
        ...u,
        recipient: byId[u.recipientId] ?? null,
      }));
      return json(200, { items });
    }

    // ── Soft profiles (viral swipe challenge) ────────────────────────────────
    // POST /connections  { senderId, guest:{ name, handle?, birthday?, vibes?,
    //   seeds?, interests?, yesCount?, totalSwipes? } }
    // Created when an invited guest finishes the swipe challenge. The sender
    // (senderId, embedded in the invite link) "owns" the resulting soft profile;
    // consent is implied by the guest completing a link the sender shared.
    if (method === "POST" && path === "/connections") {
      const senderId = body.senderId;
      const guest = body.guest ?? {};
      if (!senderId || typeof guest !== "object" || !String(guest.name || "").trim()) {
        return json(400, { error: "senderId and guest.name required" });
      }
      const rid =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      const birthday =
        typeof guest.birthday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(guest.birthday)
          ? guest.birthday
          : undefined;
      const item = {
        userId: senderId,
        connectionId: `conn_${rid}`,
        soft: true,
        kind: "challenge",
        guestName: String(guest.name).trim().slice(0, 80),
        guestHandle: guest.handle ? String(guest.handle).slice(0, 40) : undefined,
        birthday,
        vibes: Array.isArray(guest.vibes) ? guest.vibes.slice(0, 12).map(String) : [],
        seeds: Array.isArray(guest.seeds) ? guest.seeds.slice(0, 20).map(String) : [],
        interests: Array.isArray(guest.interests) ? guest.interests.slice(0, 12).map(String) : [],
        yesCount: Number(guest.yesCount) || 0,
        totalSwipes: Number(guest.totalSwipes) || 0,
        seen: false,
        createdAt: Date.now(),
      };
      await ddb.send(new PutCommand({ TableName: CONNECTIONS, Item: item }));
      // Mirror the soft profile into the events table + network graph.
      await captureConnection(item);
      return json(200, { ok: true, connectionId: item.connectionId });
    }

    // GET /connections?userId=&unseenOnly=  — soft profiles the sender collected,
    // newest first. `unseen` is the notification badge count.
    if (method === "GET" && path === "/connections") {
      const userId = qs.userId;
      if (!userId) return json(400, { error: "userId required" });
      const out = await ddb.send(
        new QueryCommand({
          TableName: CONNECTIONS,
          KeyConditionExpression: "userId = :u",
          ExpressionAttributeValues: { ":u": userId },
        })
      );
      let items = (out.Items ?? []).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      const unseen = items.filter((i) => !i.seen).length;
      if (qs.unseenOnly === "1" || qs.unseenOnly === "true") {
        items = items.filter((i) => !i.seen);
      }
      return json(200, { items, unseen });
    }

    // POST /connections/seen  { userId, connectionIds? }  — clear notification
    // state. Omit connectionIds to mark every unseen connection as seen.
    if (method === "POST" && path === "/connections/seen") {
      const { userId, connectionIds } = body;
      if (!userId) return json(400, { error: "userId required" });
      let ids = Array.isArray(connectionIds) ? connectionIds : null;
      if (!ids) {
        const out = await ddb.send(
          new QueryCommand({
            TableName: CONNECTIONS,
            KeyConditionExpression: "userId = :u",
            FilterExpression: "#seen = :f",
            ExpressionAttributeNames: { "#seen": "seen" },
            ExpressionAttributeValues: { ":u": userId, ":f": false },
          })
        );
        ids = (out.Items ?? []).map((i) => i.connectionId);
      }
      await Promise.all(
        ids.map((connectionId) =>
          ddb.send(
            new UpdateCommand({
              TableName: CONNECTIONS,
              Key: { userId, connectionId },
              UpdateExpression: "SET #seen = :t",
              ExpressionAttributeNames: { "#seen": "seen" },
              ExpressionAttributeValues: { ":t": true },
            })
          )
        )
      );
      return json(200, { ok: true, updated: ids.length });
    }

    // ── Unified events (personal milestones + shared occasions/soft profiles) ──
    // GET /events?userId=&scope=  — a user's events, optionally filtered by scope.
    if (method === "GET" && path === "/events") {
      const userId = qs.userId;
      if (!userId) return json(400, { error: "userId required" });
      if (!EVENTS) return json(200, { items: [] });
      const scope = qs.scope;
      const out = await ddb.send(
        scope
          ? new QueryCommand({
              TableName: EVENTS,
              IndexName: "byScope",
              KeyConditionExpression: "userId = :u AND #s = :s",
              ExpressionAttributeNames: { "#s": "scope" },
              ExpressionAttributeValues: { ":u": userId, ":s": scope },
            })
          : new QueryCommand({
              TableName: EVENTS,
              KeyConditionExpression: "userId = :u",
              ExpressionAttributeValues: { ":u": userId },
            })
      );
      const items = (out.Items ?? []).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      return json(200, { items });
    }

    // POST /events  { userId, event }  — create/upsert one event (personal|shared).
    if (method === "POST" && path === "/events") {
      const userId = body.userId;
      const ev = body.event ?? {};
      if (!userId || typeof ev !== "object") return json(400, { error: "userId and event required" });
      if (!EVENTS) return json(503, { error: "events table not configured" });
      const eventId = String(ev.eventId || ev.id || `evt_${gid()}`);
      const scope = ev.scope === "shared" ? "shared" : "personal";
      const item = { ...ev, userId, eventId, scope, createdAt: Number(ev.createdAt) || Date.now(), updatedAt: Date.now() };
      delete item.id;
      await ddb.send(new PutCommand({ TableName: EVENTS, Item: item }));
      await graphWrite([
        gNode(userId, "event", eventId, { scope, label: item.type || item.title || "event", data: item }),
        gEdge(userId, "HAS_EVENT", "user", userId, "event", eventId, { scope }),
      ]);
      return json(200, { ok: true, eventId, item });
    }

    // PUT /events  { userId, eventId, patch }  — partial update (e.g. complete).
    if (method === "PUT" && path === "/events") {
      const { userId, eventId, patch } = body;
      if (!userId || !eventId || typeof patch !== "object") {
        return json(400, { error: "userId, eventId, patch required" });
      }
      if (!EVENTS) return json(503, { error: "events table not configured" });
      const names = {};
      const values = { ":now": Date.now() };
      const sets = ["updatedAt = :now"];
      let i = 0;
      for (const [k, v] of Object.entries(patch)) {
        if (k === "userId" || k === "eventId" || v === undefined) continue;
        const nk = `#p${i}`;
        const vk = `:p${i}`;
        names[nk] = k;
        values[vk] = v;
        sets.push(`${nk} = ${vk}`);
        i++;
      }
      const out = await ddb.send(
        new UpdateCommand({
          TableName: EVENTS,
          Key: { userId, eventId },
          UpdateExpression: "SET " + sets.join(", "),
          ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        })
      );
      return json(200, { ok: true, item: out.Attributes ?? null });
    }

    // POST /events/delete  { userId, eventId }  (POST avoids DELETE CORS issues).
    if (method === "POST" && path === "/events/delete") {
      const { userId, eventId } = body;
      if (!userId || !eventId) return json(400, { error: "userId, eventId required" });
      if (!EVENTS) return json(503, { error: "events table not configured" });
      await ddb.send(new DeleteCommand({ TableName: EVENTS, Key: { userId, eventId } }));
      return json(200, { ok: true });
    }

    // POST /events/migrate  { userId, items:[...] }  — bulk import (e.g. local
    // milestones -> events, scope "personal"). Idempotent on eventId.
    if (method === "POST" && path === "/events/migrate") {
      const userId = body.userId;
      const list = Array.isArray(body.items) ? body.items : [];
      if (!userId) return json(400, { error: "userId required" });
      if (!EVENTS) return json(503, { error: "events table not configured" });
      const now = Date.now();
      const items = list.slice(0, 200).map((ev) => {
        const eventId = String(ev.eventId || ev.id || `evt_${gid()}`);
        const scope = ev.scope === "shared" ? "shared" : "personal";
        const it = { ...ev, userId, eventId, scope, createdAt: Number(ev.createdAt) || now, updatedAt: now };
        delete it.id;
        return it;
      });
      const g = [];
      for (const it of items) {
        g.push(gNode(userId, "event", it.eventId, { scope: it.scope, label: it.type || it.title || "event", data: it }));
        g.push(gEdge(userId, "HAS_EVENT", "user", userId, "event", it.eventId, { scope: it.scope }));
      }
      for (let i = 0; i < items.length; i += 25) {
        const chunk = items.slice(i, i + 25);
        if (chunk.length)
          await ddb.send(
            new BatchWriteCommand({ RequestItems: { [EVENTS]: chunk.map((Item) => ({ PutRequest: { Item } })) } })
          );
      }
      await graphWrite(g);
      return json(200, { ok: true, migrated: items.length });
    }

    // GET /graph?userId=  — the user's whole subgraph (nodes + edges) so we can
    // verify nothing was missed / render a network view.
    if (method === "GET" && path === "/graph") {
      const userId = qs.userId;
      if (!userId) return json(400, { error: "userId required" });
      if (!GRAPH) return json(200, { nodes: [], edges: [], counts: { nodes: 0, edges: 0 } });
      const out = await ddb.send(
        new QueryCommand({
          TableName: GRAPH,
          KeyConditionExpression: "pk = :u",
          ExpressionAttributeValues: { ":u": userId },
        })
      );
      const all = out.Items ?? [];
      const nodes = all
        .filter((i) => i.kind === "node")
        .map((n) => ({ id: n.entityId, type: n.type, scope: n.scope, label: n.label, data: n.data ?? {}, createdAt: n.createdAt }));
      const edges = all
        .filter((i) => i.kind === "edge")
        .map((e) => ({ rel: e.rel, from: e.srcRef, to: e.dstRef, data: e.data ?? {}, createdAt: e.createdAt }));
      return json(200, { nodes, edges, counts: { nodes: nodes.length, edges: edges.length } });
    }

    // POST /me/identity  { userId, email?, name?, imageUrl? }  — ensure a users
    // row (+ graph user node) exists from the FIRST sign-in, WITHOUT clobbering a
    // profile written later by PUT /me.
    if (method === "POST" && path === "/me/identity") {
      const { userId, email, name, imageUrl } = body;
      if (!userId) return json(400, { error: "userId required" });
      const now = Date.now();
      await ddb.send(
        new UpdateCommand({
          TableName: USERS,
          Key: { userId },
          UpdateExpression: "SET #id = :id, lastSeenAt = :now, createdAt = if_not_exists(createdAt, :now)",
          ExpressionAttributeNames: { "#id": "identity" },
          ExpressionAttributeValues: {
            ":id": { email: email ?? null, name: name ?? null, imageUrl: imageUrl ?? null },
            ":now": now,
          },
        })
      );
      await graphMergeNode(userId, "user", userId, {
        scope: "personal",
        label: name || undefined,
        email: email || undefined,
        imageUrl: imageUrl || undefined,
      });
      return json(200, { ok: true });
    }

    // POST /maxi  { userId?, name?, message, messages? } — Maxi, the Haiku 4.5
    // gift concierge. Runs a bounded Bedrock Converse tool-use loop and returns
    // { say, pins, actions }. Falls back client-side if this 5xx's.
    if (method === "POST" && path === "/maxi") {
      if (await isPaused()) return json(503, { error: "Maxi is napping (cost guard)" });
      // Per-MONTH Bedrock budget: hard stop once month-to-date Maxi spend is used up.
      if (MAXI_MONTHLY_BUDGET_USD > 0 && (await maxiSpentThisMonth()) >= MAXI_MONTHLY_BUDGET_USD) {
        return json(503, { error: "maxi_budget_exhausted" });
      }
      const userId = typeof body.userId === "string" && body.userId ? body.userId : null;
      const userText = typeof body.message === "string" ? body.message.trim() : "";
      const messages = buildMaxiMessages(body.messages, userText);
      if (!messages.length) return json(400, { error: "message required" });

      const memories = await recallMemories(userId, 8);
      const memBlock = memories.length
        ? `\n\nWhat you remember about this user (these are facts ABOUT the user, not about other people):\n- ${memories.map(scrubPII).join("\n- ")}`
        : "";
      const nameLine = typeof body.name === "string" && body.name ? `\n\nThe user's first name is ${body.name}. Always address them by this name. Do NOT confuse this with names from connections, recipients, or the relationship graph — those are other people.` : "";
      const signedOut = userId
        ? ""
        : "\n\nThe user is signed out: get_profile, upcoming_events, list_connections, relationship_graph, save_event, and remember_fact are unavailable — help with catalog search only and gently suggest signing in to unlock memory.";
      const sys = MAXI_SYSTEM + nameLine + signedOut + memBlock;

      const toolConfig = {
        tools: MAXI_TOOLS.map((t) => ({
          toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.schema } },
        })),
      };
      const tctx = { userId, pins: [], actions: [] };
      // Model routing: cheap Amazon Nova by default; Claude Haiku once an agentic
      // shopping experience is triggered (intent now, or a cart/checkout tool below).
      let isShopping = maxiIsShopping(userText, body);
      let modelId = isShopping ? MAXI_SHOPPING_MODEL_ID : MAXI_BASE_MODEL_ID;
      let say = "";
      let usedIn = 0;
      let usedOut = 0;
      let usedCost = 0;
      try {
        for (let step = 0; step < MAXI_MAX_STEPS; step++) {
          const res = await bedrock.send(
            new ConverseCommand({
              modelId,
              system: [{ text: sys }],
              messages,
              toolConfig,
              inferenceConfig: { maxTokens: MAXI_MAX_TOKENS, temperature: 0.4 },
            })
          );
          // Per-interaction token budget: sum usage across the tool-use loop.
          const stepIn = res.usage?.inputTokens || 0;
          const stepOut = res.usage?.outputTokens || 0;
          usedIn += stepIn;
          usedOut += stepOut;
          usedCost += maxiStepCostUsd(modelId, stepIn, stepOut);
          const overTokenBudget = usedIn + usedOut >= MAXI_INTERACTION_TOKEN_BUDGET;
          const msg = res.output?.message;
          if (msg) messages.push(msg);
          const blocks = msg?.content ?? [];
          const textOut = blocks.filter((b) => b.text).map((b) => b.text).join(" ").trim();
          if (textOut) say = textOut;
          const toolUses = blocks.filter((b) => b.toolUse).map((b) => b.toolUse);
          if (res.stopReason === "tool_use" && toolUses.length && !overTokenBudget) {
            // Agentic-shopping trigger: if the agent reaches for a cart/checkout
            // tool while still on the cheap base model, escalate the rest of the
            // loop (incl. the order-confirmation turn) to the shopping model.
            if (!isShopping && toolUses.some((tu) => MAXI_SHOPPING_TOOLS.has(tu.name))) {
              isShopping = true;
              modelId = MAXI_SHOPPING_MODEL_ID;
            }
            const results = [];
            for (const tu of toolUses) {
              let out;
              try {
                out = await runMaxiTool(tu.name, tu.input, tctx);
              } catch (e) {
                out = { error: e.message };
              }
              results.push({
                toolResult: {
                  toolUseId: tu.toolUseId,
                  content: [{ json: scrubPII(out) }],
                  status: out && out.error ? "error" : "success",
                },
              });
            }
            messages.push({ role: "user", content: results });
            continue;
          }
          break;
        }
      } catch (e) {
        console.warn("maxi converse failed:", e.name, e.message);
        return json(502, { error: "agent_unavailable", detail: e.name });
      }

      // Bill this interaction's Bedrock usage to the monthly budget counter.
      await recordMaxiUsage(usedIn, usedOut, usedCost);
      const costUsd = usedCost;
      console.log(
        "maxi usage",
        JSON.stringify({ userId, tier: isShopping ? "shopping" : "base", model: modelId, usedIn, usedOut, costUsd })
      );

      const seen = new Set();
      const pins = tctx.pins
        .filter((p) => p && p.postId && !seen.has(p.postId) && seen.add(p.postId))
        .slice(0, 10);
      return json(200, {
        say: say || "Hmm, I didn't quite catch that — tell me a budget or who it's for and I'll find something.",
        pins,
        actions: tctx.actions,
        source: "agent",
        usage: { inputTokens: usedIn, outputTokens: usedOut, costUsd: Math.round(costUsd * 1e5) / 1e5 },
      });
    }

    return json(404, { error: `no route for ${method} ${path}` });
  } catch (err) {
    console.error("handler error", err);
    return json(500, { error: "internal error" });
  }
};

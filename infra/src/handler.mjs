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
} from "@aws-sdk/lib-dynamodb";
import {
  S3VectorsClient,
  QueryVectorsCommand,
  GetVectorsCommand,
  ListVectorsCommand,
} from "@aws-sdk/client-s3vectors";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const USERS = process.env.USERS_TABLE;
const POSTS = process.env.POSTS_TABLE;
const INTERACTIONS = process.env.INTERACTIONS_TABLE;
const KNOWLEDGE = process.env.KNOWLEDGE_TABLE;

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

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? "GET";
  const path = event.requestContext?.http?.path ?? "/";
  const qs = event.queryStringParameters ?? {};
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
      // Scan the full table (no Limit) so every item participates in ranking.
      // DynamoDB Scan returns items in partition-key order, which clusters
      // sources together; without a full scan the ranker only sees one source
      // per page. The table is small (~300 items) so this is fine.
      const allItems = [];
      let scanKey = undefined;
      // Paginate through the full table (1 MB pages) collecting all items.
      do {
        const out = await ddb.send(
          new ScanCommand({ TableName: POSTS, ExclusiveStartKey: scanKey })
        );
        allItems.push(...(out.Items ?? []));
        scanKey = out.LastEvaluatedKey;
      } while (scanKey);

      const opts = {
        vibes: parseList(qs.vibes),
        recipient: qs.recipient,
        occasion: qs.occasion,
        category: qs.category,
        budget: Number(qs.budget) || undefined,
        eventBoost: Number(qs.eventBoost) || 0,
      };
      const ranked = allItems
        .map((p) => ({ ...p, _score: scorePost(p, opts) }))
        .sort((a, b) => b._score - a._score);

      // Client-side cursor = index into the ranked list.
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
      if (!s3v) return json(200, { items: [] });
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
      if (s3v && seeds.length) {
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
      for (const table of [
        [USERS, body.users ?? []],
        [POSTS, body.posts ?? []],
      ]) {
        const [name, items] = table;
        for (const c of chunks(items)) {
          if (c.length === 0) continue;
          await ddb.send(
            new BatchWriteCommand({
              RequestItems: { [name]: c.map((Item) => ({ PutRequest: { Item } })) },
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

    return json(404, { error: `no route for ${method} ${path}` });
  } catch (err) {
    console.error("handler error", err);
    return json(500, { error: "internal error" });
  }
};

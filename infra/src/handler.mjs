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

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const USERS = process.env.USERS_TABLE;
const POSTS = process.env.POSTS_TABLE;
const INTERACTIONS = process.env.INTERACTIONS_TABLE;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

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
    // GET /feed?limit=&author=
    if (method === "GET" && path === "/feed") {
      const limit = Math.min(Number(qs.limit) || 20, 50);
      if (qs.author) {
        const out = await ddb.send(
          new QueryCommand({
            TableName: POSTS,
            IndexName: "byAuthor",
            KeyConditionExpression: "author = :a",
            ExpressionAttributeValues: { ":a": qs.author },
            ScanIndexForward: false,
            Limit: limit,
          })
        );
        return json(200, { items: out.Items ?? [] });
      }
      const out = await ddb.send(new ScanCommand({ TableName: POSTS, Limit: limit }));
      const items = (out.Items ?? []).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      return json(200, { items });
    }

    // GET /posts/{id}
    if (method === "GET" && path.startsWith("/posts/")) {
      const postId = decodeURIComponent(path.split("/")[2] ?? "");
      const out = await ddb.send(new GetCommand({ TableName: POSTS, Key: { postId } }));
      return out.Item ? json(200, out.Item) : json(404, { error: "not found" });
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

    // GET /recommendations?userId=
    if (method === "GET" && path === "/recommendations") {
      const userId = qs.userId;
      if (!userId) return json(400, { error: "userId required" });

      // 1) pull the user's interactions → cheap taste signal
      const inter = await ddb.send(
        new QueryCommand({
          TableName: INTERACTIONS,
          KeyConditionExpression: "userId = :u",
          ExpressionAttributeValues: { ":u": userId },
        })
      );
      const likedTargets = new Set((inter.Items ?? []).map((i) => i.target));

      // 2) score candidate posts (mirrors web/lib/recommend.ts, simplified)
      const posts = await ddb.send(new ScanCommand({ TableName: POSTS, Limit: 50 }));
      const scored = (posts.Items ?? [])
        .filter((p) => !likedTargets.has(p.postId) && p.author !== userId)
        .map((p) => ({
          ...p,
          _score: (p.likes ?? 0) / 250 + Math.random() * 0.1,
        }))
        .sort((a, b) => b._score - a._score)
        .slice(0, Number(qs.limit) || 8);

      return json(200, { items: scored });
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

    return json(404, { error: `no route for ${method} ${path}` });
  } catch (err) {
    console.error("handler error", err);
    return json(500, { error: "internal error" });
  }
};

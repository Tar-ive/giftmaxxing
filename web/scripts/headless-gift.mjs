#!/usr/bin/env node
// ────────────────────────────────────────────────────────────────────────────
// Headless Gift Flow — CLI for agents & power users
//
// Usage:
//   node web/scripts/headless-gift.mjs \
//     --sender-id <userId> \
//     --sender-name "Saksham" \
//     --recipient "Thaman" \
//     --occasion "birthday" \
//     --date "2026-07-26" \
//     --gender-pref "he" \
//     [--api-url https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com] \
//     [--site-url https://giftmaxxing.com] \
//     [--admin-token <token>] \
//     [--poll-interval 10] \
//     [--action generate-link|poll|bundle|checkout]
//
// Actions:
//   generate-link  (default) Generate the swipe challenge invite link
//   poll           Poll until the challenge is completed, then show results
//   bundle         Fetch Maxi's bundle picks for a completed connection
//   checkout       Add bundle items to cart and output checkout info
//
// Environment variables (alternative to flags):
//   GIFTMAXXING_API_URL, GIFTMAXXING_SITE_URL, GIFTMAXXING_ADMIN_TOKEN,
//   GIFTMAXXING_SENDER_ID
// ────────────────────────────────────────────────────────────────────────────

import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    "sender-id": { type: "string" },
    "sender-name": { type: "string", default: "A friend" },
    recipient: { type: "string" },
    occasion: { type: "string" },
    date: { type: "string" },
    "gender-pref": { type: "string" },
    "api-url": { type: "string" },
    "site-url": { type: "string" },
    "admin-token": { type: "string" },
    "poll-interval": { type: "string", default: "10" },
    action: { type: "string", default: "generate-link" },
    "connection-id": { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (args.help) {
  console.log(`
Headless Gift Flow CLI — operate Giftmaxxing without the UI.

Actions:
  generate-link   Generate a swipe challenge invite link to share
  poll            Poll for challenge completion, output bundle when ready
  bundle          Fetch Maxi's bundle for a known connection
  checkout        Output purchase links for all bundle items

Flags:
  --sender-id     Your user ID (or set GIFTMAXXING_SENDER_ID)
  --sender-name   Your display name (default: "A friend")
  --recipient     Recipient's name
  --occasion      Occasion type (birthday, anniversary, etc.)
  --date          Occasion date (YYYY-MM-DD)
  --gender-pref   he | she | they
  --api-url       API endpoint (or set GIFTMAXXING_API_URL)
  --site-url      Site URL for invite links (or set GIFTMAXXING_SITE_URL)
  --admin-token   Admin auth token (or set GIFTMAXXING_ADMIN_TOKEN)
  --poll-interval Seconds between poll checks (default: 10)
  --connection-id Connection ID for bundle/checkout actions
  -h, --help      Show this help
`);
  process.exit(0);
}

// ── Config ───────────────────────────────────────────────────────────────────

const API_URL = args["api-url"] || process.env.GIFTMAXXING_API_URL || "https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com";
const SITE_URL = args["site-url"] || process.env.GIFTMAXXING_SITE_URL || "https://giftmaxxing.com";
const ADMIN_TOKEN = args["admin-token"] || process.env.GIFTMAXXING_ADMIN_TOKEN || "";
const SENDER_ID = args["sender-id"] || process.env.GIFTMAXXING_SENDER_ID || "";
const SENDER_NAME = args["sender-name"];
const RECIPIENT = args.recipient || "";
const OCCASION = args.occasion || "";
const DATE = args.date || "";
const GENDER_PREF = args["gender-pref"] || "";
const POLL_INTERVAL = parseInt(args["poll-interval"], 10) * 1000;
const ACTION = args.action;
const CONNECTION_ID = args["connection-id"] || "";

// ── Invite encoding (mirrors web/lib/invite.ts) ─────────────────────────────

function toBase64Url(s) {
  return Buffer.from(s, "utf-8").toString("base64url");
}

function buildInviteUrl(inviterName, opts = {}) {
  const payload = { name: inviterName.trim() || "A friend" };
  if (opts.senderId) payload.senderId = opts.senderId;
  if (opts.to?.trim()) payload.to = opts.to.trim();
  if (opts.occasion?.trim()) payload.occasion = opts.occasion.trim();
  if (opts.date?.trim()) payload.date = opts.date.trim();
  const code = toBase64Url(JSON.stringify(payload));
  return `${SITE_URL}/invite/${code}`;
}

// ── API helpers ──────────────────────────────────────────────────────────────

function authHeaders() {
  const h = { accept: "application/json" };
  if (ADMIN_TOKEN) h["x-admin-token"] = ADMIN_TOKEN;
  return h;
}

async function apiFetch(path, init = {}) {
  const url = API_URL + path;
  const headers = { ...authHeaders(), ...(init.headers || {}) };
  const res = await fetch(url, { ...init, headers });
  return res;
}

async function fetchConnections(userId) {
  const q = new URLSearchParams({ userId });
  const res = await apiFetch(`/connections?${q.toString()}`);
  if (!res.ok) throw new Error(`fetchConnections failed: ${res.status}`);
  return res.json();
}

async function fetchBundle(userId, connectionId) {
  const q = new URLSearchParams({ userId, connectionId });
  const res = await apiFetch(`/bundles?${q.toString()}`);
  if (!res.ok) throw new Error(`fetchBundle failed: ${res.status}`);
  return res.json();
}

// ── Actions ──────────────────────────────────────────────────────────────────

async function actionGenerateLink() {
  if (!SENDER_ID) {
    console.error("Error: --sender-id is required (or set GIFTMAXXING_SENDER_ID)");
    process.exit(1);
  }
  const url = buildInviteUrl(SENDER_NAME, {
    senderId: SENDER_ID,
    to: RECIPIENT,
    occasion: OCCASION,
    date: DATE,
  });
  console.log("\n🎁 Swipe Challenge Invite Link\n");
  console.log(`  ${url}\n`);
  console.log("Share this link with the recipient. Once they complete the swipe");
  console.log("challenge, their taste profile will appear in your Gifts tab.\n");
  console.log("To poll for completion, run:");
  console.log(`  node web/scripts/headless-gift.mjs --action poll --sender-id ${SENDER_ID}\n`);
  return { url };
}

async function actionPoll() {
  if (!SENDER_ID) {
    console.error("Error: --sender-id is required");
    process.exit(1);
  }
  console.log(`\n⏳ Polling for completed challenges (every ${POLL_INTERVAL / 1000}s)...\n`);
  const seen = new Set();

  // Get initial state
  try {
    const initial = await fetchConnections(SENDER_ID);
    for (const item of initial.items ?? []) {
      seen.add(item.connectionId);
    }
    if (initial.items?.length) {
      console.log(`  Found ${initial.items.length} existing connection(s). Watching for new ones...\n`);
    }
  } catch (e) {
    console.error(`  Warning: initial fetch failed (${e.message}). Will retry...\n`);
  }

  // Poll loop
  while (true) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    try {
      const data = await fetchConnections(SENDER_ID);
      for (const item of data.items ?? []) {
        if (!seen.has(item.connectionId)) {
          seen.add(item.connectionId);
          console.log(`\n✅ New challenge completed!`);
          console.log(`   Name: ${item.guestName}`);
          console.log(`   Gender: ${item.genderPref || "not set"}`);
          console.log(`   Likes: ${item.yesCount ?? 0} / ${item.totalSwipes ?? 0} swipes`);
          console.log(`   Vibes: ${(item.vibes ?? []).join(", ") || "none"}`);
          console.log(`   Connection ID: ${item.connectionId}`);
          if (item.birthday) console.log(`   Birthday: ${item.birthday}`);
          console.log(`\n   To see Maxi's picks:`);
          console.log(`   node web/scripts/headless-gift.mjs --action bundle --sender-id ${SENDER_ID} --connection-id ${item.connectionId}\n`);
        }
      }
    } catch (e) {
      console.error(`  Poll error: ${e.message}`);
    }
  }
}

async function actionBundle() {
  if (!SENDER_ID || !CONNECTION_ID) {
    console.error("Error: --sender-id and --connection-id are required");
    process.exit(1);
  }
  console.log(`\n🎁 Fetching Maxi's bundle for connection ${CONNECTION_ID}...\n`);
  try {
    const data = await fetchBundle(SENDER_ID, CONNECTION_ID);
    const items = data.items ?? [];
    if (!items.length) {
      console.log("  No bundle items found. The challenge may not have enough data.\n");
      return;
    }
    console.log(`  Maxi picked ${items.length} item(s):\n`);
    console.log("  ┌──────────────────────────────────────────────────────────────────┐");
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.caption || item.title || "Untitled";
      const price = item.product?.price ?? item.price ?? "??";
      const image = item.product?.image ?? item.image ?? "";
      const deliveryDays = item.estimatedDays ?? "?";
      const late = item.late ? " ⚠️  LATE" : " ✅ On time";
      console.log(`  │ ${i + 1}. ${title.slice(0, 50).padEnd(50)} │`);
      console.log(`  │    $${price} · ${deliveryDays}d shipping${late.padEnd(20)} │`);
      if (image) console.log(`  │    ${image.slice(0, 60).padEnd(60)} │`);
      if (item.url) console.log(`  │    🔗 ${item.url.slice(0, 57).padEnd(57)} │`);
      console.log(`  │${"".padEnd(66)}│`);
    }
    console.log("  └──────────────────────────────────────────────────────────────────┘\n");
    console.log("  To checkout all items:");
    console.log(`  node web/scripts/headless-gift.mjs --action checkout --sender-id ${SENDER_ID} --connection-id ${CONNECTION_ID}\n`);
    return { items };
  } catch (e) {
    console.error(`  Error: ${e.message}\n`);
    process.exit(1);
  }
}

async function actionCheckout() {
  if (!SENDER_ID || !CONNECTION_ID) {
    console.error("Error: --sender-id and --connection-id are required");
    process.exit(1);
  }
  console.log(`\n🛒 Checkout — Adding all bundle items to cart...\n`);
  try {
    const data = await fetchBundle(SENDER_ID, CONNECTION_ID);
    const items = data.items ?? [];
    if (!items.length) {
      console.log("  No items to checkout.\n");
      return;
    }

    let total = 0;
    const purchaseLinks = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.caption || item.title || "Untitled";
      const price = Number(item.product?.price ?? item.price ?? 0);
      const url = item.url || item.product?.url || "";
      total += price;
      purchaseLinks.push({ title, price, url });
      console.log(`  ✓ ${title.slice(0, 45)} — $${price}`);
    }
    console.log(`\n  ────────────────────────────────────`);
    console.log(`  Total: $${total}`);
    console.log(`  Items: ${items.length}\n`);

    if (purchaseLinks.some((p) => p.url)) {
      console.log("  Purchase links:");
      for (const p of purchaseLinks) {
        if (p.url) console.log(`    • ${p.url}`);
      }
      console.log("");
    }

    console.log("  Cart updated. In the app, go to /feed/cart to complete payment.\n");
    return { items, total };
  } catch (e) {
    console.error(`  Error: ${e.message}\n`);
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const actions = {
  "generate-link": actionGenerateLink,
  poll: actionPoll,
  bundle: actionBundle,
  checkout: actionCheckout,
};

const fn = actions[ACTION];
if (!fn) {
  console.error(`Unknown action: ${ACTION}. Use --help for usage.`);
  process.exit(1);
}

fn().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});

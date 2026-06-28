# Headless Gift Flow

Operate the Giftmaxxing swipe-challenge → bundle → checkout flow entirely from the command line / agent session, without opening the app UI.

## When to use

Use when the user wants to:
- Send a swipe challenge link to someone without using the app
- Check if a recipient has completed their challenge
- View Maxi's gift bundle picks from the CLI
- One-tap checkout from a terminal/agent session
- Automate the gift-giving flow end-to-end

## Prerequisites

- Node.js 18+ available
- Environment variables (or pass as CLI flags):
  - `GIFTMAXXING_SENDER_ID` — your Clerk user ID
  - `GIFTMAXXING_API_URL` — API endpoint (default: `https://tvyu8gqmki.execute-api.us-east-1.amazonaws.com`)
  - `GIFTMAXXING_SITE_URL` — Site URL for invite links (default: `https://giftmaxxing.com`)
  - `GIFTMAXXING_ADMIN_TOKEN` — (optional) admin token for authenticated requests

## Flow

### 1. Generate an invite link

```bash
node web/scripts/headless-gift.mjs \
  --action generate-link \
  --sender-id "$GIFTMAXXING_SENDER_ID" \
  --sender-name "Saksham" \
  --recipient "Thaman" \
  --occasion "birthday" \
  --date "2026-07-26" \
  --gender-pref "he"
```

This outputs a shareable URL. Send it to the recipient via any channel (text, email, Slack, etc.).

### 2. Poll for completion

```bash
node web/scripts/headless-gift.mjs \
  --action poll \
  --sender-id "$GIFTMAXXING_SENDER_ID" \
  --poll-interval 15
```

Watches for new completed challenges. When one arrives, it prints the connection ID and taste summary.

### 3. View Maxi's bundle picks

```bash
node web/scripts/headless-gift.mjs \
  --action bundle \
  --sender-id "$GIFTMAXXING_SENDER_ID" \
  --connection-id "conn_abc123"
```

Displays the AI-curated gift bundle with prices, shipping estimates, and product images/links.

### 4. Checkout

```bash
node web/scripts/headless-gift.mjs \
  --action checkout \
  --sender-id "$GIFTMAXXING_SENDER_ID" \
  --connection-id "conn_abc123"
```

Adds all bundle items to cart and outputs purchase links for one-click buying.

## Full end-to-end example (agent workflow)

```bash
# Step 1: Generate and send the link
LINK=$(node web/scripts/headless-gift.mjs --action generate-link \
  --sender-id "user_xxx" --sender-name "Saksham" \
  --recipient "Thaman" --occasion birthday --date 2026-07-26 \
  --gender-pref he 2>/dev/null | grep "https://")

echo "Send this to Thaman: $LINK"

# Step 2: Wait for completion (ctrl+c when done)
node web/scripts/headless-gift.mjs --action poll --sender-id "user_xxx"

# Step 3: View picks (use connection-id from poll output)
node web/scripts/headless-gift.mjs --action bundle \
  --sender-id "user_xxx" --connection-id "conn_abc123"

# Step 4: Checkout
node web/scripts/headless-gift.mjs --action checkout \
  --sender-id "user_xxx" --connection-id "conn_abc123"
```

## Authentication notes

The auth model for headless access is an open question. Current options:
1. **Admin token** — pass `--admin-token` or set `GIFTMAXXING_ADMIN_TOKEN` (full access)
2. **Clerk session JWT** — not yet supported in CLI (would need a login flow)
3. **Anonymous sender** — works for link generation (no auth needed to create invites)

For now, the admin token approach works for agents running in trusted environments.

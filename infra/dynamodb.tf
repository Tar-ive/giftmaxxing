# ── Users ────────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "users" {
  name         = "${local.prefix}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ── Posts ────────────────────────────────────────────────────────────────────
# PK: postId. GSI byAuthor lists a user's finds for the profile grid; GSI byFeed
# (PK feedPk="all", SK createdAt) is the recency-ordered index the /feed endpoint
# pages through so it scales past a few hundred posts without a full-table scan.
resource "aws_dynamodb_table" "posts" {
  name         = "${local.prefix}-posts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "postId"

  attribute {
    name = "postId"
    type = "S"
  }
  attribute {
    name = "author"
    type = "S"
  }
  attribute {
    name = "createdAt"
    type = "N"
  }
  # Constant partition key ("all") for the global feed index. Single hot
  # partition is fine at this scale; shard into "all#<n>" + scatter-gather if the
  # feed ever exceeds GSI partition throughput (~3k RCU/s).
  attribute {
    name = "feedPk"
    type = "S"
  }

  global_secondary_index {
    name            = "byAuthor"
    hash_key        = "author"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "byFeed"
    hash_key        = "feedPk"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ── Knowledge ────────────────────────────────────────────────────────────────
# Gift-knowledge base mined from Reddit discussions. PK: recipient (mom, couple,
# coworker, ...). Each item holds ranked gift ideas + co-occurrence bundles.
resource "aws_dynamodb_table" "knowledge" {
  name         = "${local.prefix}-knowledge"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "recipient"

  attribute {
    name = "recipient"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ── Events ────────────────────────────────────────────────────────────────────
# Unified event store (formerly "milestones"). PK: userId, SK: eventId. Holds
# everything we capture from onboarding onward, tagged by `scope`:
#   • personal — self milestones / the user's own occasions
#   • shared   — recipients' occasions + soft-profile birthdays from challenges
# GSI byScope lists a user's personal vs shared events directly.
resource "aws_dynamodb_table" "events" {
  name         = "${local.prefix}-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "eventId"

  attribute {
    name = "userId"
    type = "S"
  }
  attribute {
    name = "eventId"
    type = "S"
  }
  attribute {
    name = "scope"
    type = "S"
  }

  global_secondary_index {
    name            = "byScope"
    hash_key        = "userId"
    range_key       = "scope"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ── Graph (network graph: nodes + edges) ──────────────────────────────────────
# Single-table adjacency model capturing ALL data (hard onboarding data + soft
# swipe-derived taste) as one connected graph so nothing is lost. Partitioned by
# owner (userId) so a user's whole subgraph loads in one Query; the byEntity GSI
# enables cross-owner traversal of edges into any node.
#   pk       = userId (owner of the subgraph)
#   sk       = "N#<type>#<id>" (node)  |  "E#<rel>#<src>#<dst>" (edge)
#   entityId = "<type>#<id>"  (a node's self-ref, or an edge's destination ref)
resource "aws_dynamodb_table" "graph" {
  name         = "${local.prefix}-graph"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "sk"
    type = "S"
  }
  attribute {
    name = "entityId"
    type = "S"
  }

  global_secondary_index {
    name            = "byEntity"
    hash_key        = "entityId"
    range_key       = "sk"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ── Interactions ─────────────────────────────────────────────────────────────
# PK: userId, SK: targetId (e.g. "post#p1"). One row per (user, target) so
# likes/saves are naturally idempotent. `type` holds like|save|comment.
resource "aws_dynamodb_table" "interactions" {
  name         = "${local.prefix}-interactions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "targetId"

  attribute {
    name = "userId"
    type = "S"
  }
  attribute {
    name = "targetId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ── Connections (soft profiles) ───────────────────────────────────────────────
# Soft profiles collected when an invited guest finishes the swipe challenge.
# PK: userId (the SENDER's Clerk userId), SK: connectionId. Unseen rows double as
# the sender's "X completed your challenge" notifications. Consent is implied by
# the guest completing a link the sender shared (see the web app's /privacy).
resource "aws_dynamodb_table" "connections" {
  name         = "${local.prefix}-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "connectionId"

  attribute {
    name = "userId"
    type = "S"
  }
  attribute {
    name = "connectionId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

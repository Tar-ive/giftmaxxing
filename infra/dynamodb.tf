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
# PK: postId. GSI byAuthor lets us list a user's finds for the profile grid.
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

  global_secondary_index {
    name            = "byAuthor"
    hash_key        = "author"
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

# ── Milestones ────────────────────────────────────────────────────────────────
# Self-gifting milestones. PK: userId, SK: milestoneId. Users set personal goals
# with a reward budget; on completion the user treats themselves or Maxi
# auto-orders a gift within budget.
resource "aws_dynamodb_table" "milestones" {
  name         = "${local.prefix}-milestones"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "milestoneId"

  attribute {
    name = "userId"
    type = "S"
  }
  attribute {
    name = "milestoneId"
    type = "S"
  }
  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "byStatus"
    hash_key        = "userId"
    range_key       = "status"
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

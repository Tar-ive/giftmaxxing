# ── Phase 2: $1,000 auto-pause kill switch + real-time tripwires ──────────────
# At $1,000 (budget) — or in MINUTES if a real-time CloudWatch alarm trips — the
# breaker Lambda flips a DynamoDB feature flag to { paused: true }. The API
# Lambda reads that flag (fail-open, cached) and 503s the cost-driving routes
# (visual search, vector recs, /pins, Maxi later) while auth, feed/posts, and
# data collection keep serving. Nothing auto-resumes: a human runs the resume
# command (see `killswitch_resume_command` output) to turn features back on.

# ── Feature-flag store ────────────────────────────────────────────────────────
# One item: { key: "feature-flags", paused: bool, reason, pausedAt, resumedAt }.
resource "aws_dynamodb_table" "config" {
  name         = "${local.prefix}-config"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "key"

  attribute {
    name = "key"
    type = "S"
  }
}

# ── Kill-switch trigger topic (the $1,000 budget + CloudWatch alarms publish) ──
resource "aws_sns_topic" "cost_killswitch" {
  name = "${local.prefix}-cost-killswitch"
}

data "aws_iam_policy_document" "cost_killswitch_publish" {
  statement {
    sid       = "AllowBudgetsPublish"
    effect    = "Allow"
    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.cost_killswitch.arn]
    principals {
      type        = "Service"
      identifiers = ["budgets.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:budgets::${data.aws_caller_identity.current.account_id}:budget/*"]
    }
  }

  statement {
    sid       = "AllowCloudWatchAlarmsPublish"
    effect    = "Allow"
    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.cost_killswitch.arn]
    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "cost_killswitch" {
  arn    = aws_sns_topic.cost_killswitch.arn
  policy = data.aws_iam_policy_document.cost_killswitch_publish.json
}

# ── Breaker Lambda (reuses the API source bundle; handler = breaker.handler) ───
resource "aws_cloudwatch_log_group" "breaker" {
  name              = "/aws/lambda/${local.prefix}-breaker"
  retention_in_days = 14
}

# Dedicated least-privilege role (NOT the shared API role — the API Lambda must
# not be able to write the flag; only the breaker can).
resource "aws_iam_role" "breaker" {
  name               = "${local.prefix}-breaker"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "breaker_logs" {
  role       = aws_iam_role.breaker.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "breaker_access" {
  statement {
    sid       = "ConfigFlagRW"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.config.arn]
  }
  statement {
    sid       = "PublishAlerts"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.cost_alerts.arn]
  }
}

resource "aws_iam_role_policy" "breaker_access" {
  name   = "${local.prefix}-breaker-access"
  role   = aws_iam_role.breaker.id
  policy = data.aws_iam_policy_document.breaker_access.json
}

resource "aws_lambda_function" "breaker" {
  function_name    = "${local.prefix}-breaker"
  role             = aws_iam_role.breaker.arn
  runtime          = "nodejs20.x"
  handler          = "breaker.handler"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      CONFIG_TABLE          = aws_dynamodb_table.config.name
      COST_ALERTS_TOPIC_ARN = aws_sns_topic.cost_alerts.arn
      RESUME_HINT           = "aws lambda invoke --function-name ${local.prefix}-breaker --payload '{\"action\":\"resume\"}' --cli-binary-format raw-in-base64-out /dev/stdout"
    }
  }

  depends_on = [aws_cloudwatch_log_group.breaker]
}

# Wire the kill-switch topic -> breaker Lambda.
resource "aws_sns_topic_subscription" "killswitch_to_breaker" {
  topic_arn = aws_sns_topic.cost_killswitch.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.breaker.arn
}

resource "aws_lambda_permission" "killswitch_invoke_breaker" {
  statement_id  = "AllowSNSInvokeBreaker"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.breaker.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.cost_killswitch.arn
}

# API Lambda config access: GET the kill-switch flag + GET/UPDATE Maxi's monthly
# Bedrock budget counter (key maxi-budget#YYYY-MM). The handler never writes the
# "paused" flag in code (only the breaker does); both items share the config table.
data "aws_iam_policy_document" "api_config_read" {
  statement {
    sid       = "ConfigReadWrite"
    actions   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.config.arn]
  }
}

resource "aws_iam_role_policy" "api_config_read" {
  name   = "${local.prefix}-api-config-read"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.api_config_read.json
}

# ── Real-time tripwires: trip the breaker in MINUTES (billing budgets lag) ─────
# Each alarm publishes to the kill-switch topic -> breaker engages.
resource "aws_cloudwatch_metric_alarm" "bedrock_invocations" {
  alarm_name          = "${local.prefix}-bedrock-invocations-spike"
  alarm_description   = "Bedrock (Titan) invocations spiked in 5 min — possible runaway AI cost. Trips the cost kill switch. NOTE: add a matching alarm on the Maxi/Haiku ModelId when that ships."
  namespace           = "AWS/Bedrock"
  metric_name         = "Invocations"
  dimensions          = { ModelId = local.bedrock_embed_model_id }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.alarm_bedrock_invocations_5min
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.cost_killswitch.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_request_spike" {
  alarm_name          = "${local.prefix}-api-request-spike"
  alarm_description   = "API Gateway request volume spiked in 5 min — trips the cost kill switch."
  namespace           = "AWS/ApiGatewayV2"
  metric_name         = "Count"
  dimensions          = { ApiId = aws_apigatewayv2_api.http.id }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.alarm_api_requests_5min
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.cost_killswitch.arn]
}

resource "aws_cloudwatch_metric_alarm" "lambda_concurrency" {
  alarm_name          = "${local.prefix}-api-concurrency-high"
  alarm_description   = "API Lambda concurrency near its reserved cap — trips the cost kill switch."
  namespace           = "AWS/Lambda"
  metric_name         = "ConcurrentExecutions"
  dimensions          = { FunctionName = aws_lambda_function.api.function_name }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.alarm_api_concurrency
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.cost_killswitch.arn]
}

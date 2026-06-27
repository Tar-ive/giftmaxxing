# ── Cost alerts + $1,000 kill-switch trigger (PHASE 1: alerts only) ───────────
# A single monthly AWS Budget publishes to an SNS topic at actual month-to-date
# spend >= $10 / $50 / $100 / $1,000. An email (var.alert_email) and/or SMS
# (var.alert_sms_number) subscribe to that topic. This phase is PURE
# NOTIFICATIONS — no app behavior changes.
#
# The $1,000 notification is also the future hook for the auto-pause "circuit
# breaker" (phase 2): a Lambda will subscribe to this same topic, detect the
# $1,000 trip, and flip feature flags to essential-only. For now it just alarms.
#
# IMPORTANT CAVEATS:
#   • AWS billing data refreshes only a few times/day, so budgets are a BACKSTOP,
#     not a real-time stop. Real-time tripwires (CloudWatch usage alarms) are a
#     phase-2 add-on.
#   • AWS Budgets is global but its data + SNS target must live in us-east-1 —
#     which matches this stack's region (var.region default us-east-1).
#   • Scope is ACCOUNT-WIDE (no cost_filter) so it works today. To scope to just
#     this project, add a cost_filter on the `Project` tag AFTER the cost-
#     allocation tag is Active (see cost.tf; ~24h lag).
#   • Budgets pricing: first 2 budgets are free; extra/action-enabled budgets
#     cost ~$0.02/day.

resource "aws_sns_topic" "cost_alerts" {
  name = "${local.prefix}-cost-alerts"
}

# Allow AWS Budgets to publish to the topic. Scoped to this account's budgets;
# uses budget/* (not the concrete budget ARN) to avoid a topic<->budget cycle.
data "aws_iam_policy_document" "cost_alerts_publish" {
  statement {
    sid     = "AllowBudgetsPublish"
    effect  = "Allow"
    actions = ["SNS:Publish"]
    principals {
      type        = "Service"
      identifiers = ["budgets.amazonaws.com"]
    }
    resources = [aws_sns_topic.cost_alerts.arn]
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
}

resource "aws_sns_topic_policy" "cost_alerts" {
  arn    = aws_sns_topic.cost_alerts.arn
  policy = data.aws_iam_policy_document.cost_alerts_publish.json
}

# Email subscription (optional). AWS sends a confirmation email after apply —
# you must click it before any alerts are delivered.
resource "aws_sns_topic_subscription" "cost_alerts_email" {
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# SMS subscription (optional).
resource "aws_sns_topic_subscription" "cost_alerts_sms" {
  count     = var.alert_sms_number == "" ? 0 : 1
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "sms"
  endpoint  = var.alert_sms_number
}

locals {
  # $10/$50/$100 -> email/SMS only. $1,000 is handled by an explicit notification
  # below because it ALSO triggers the auto-pause kill switch.
  cost_alert_thresholds = [10, 50, 100]
}

resource "aws_budgets_budget" "monthly" {
  name         = "${local.prefix}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # One ACTUAL-spend notification per absolute threshold -> the cost-alerts topic
  # (SNS) AND directly to the cost-alert email recipients. The direct emails are
  # codified here via var.cost_alert_emails so `terraform apply` never again wipes
  # addresses added by hand in the AWS console.
  dynamic "notification" {
    for_each = local.cost_alert_thresholds
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "ABSOLUTE_VALUE"
      notification_type          = "ACTUAL"
      subscriber_sns_topic_arns  = [aws_sns_topic.cost_alerts.arn]
      subscriber_email_addresses = var.cost_alert_emails
    }
  }

  # Forecasted-spend heads-up: email the cost-alert recipients when AWS PROJECTS
  # month-end spend over $500. Forecasts fire earlier than ACTUAL, buying lead
  # time. Codifies a notification previously added by hand in the console.
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 500
    threshold_type             = "ABSOLUTE_VALUE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.cost_alert_emails
  }

  # The budget LIMIT (var.monthly_budget_limit_usd) -> trigger the auto-pause kill
  # switch. AWS Budgets allows only ONE SNS subscriber per notification, so this
  # points at the cost_killswitch topic (killswitch.tf -> breaker Lambda, which
  # then re-publishes to cost_alerts for email/SMS) and also emails you directly
  # when alert_email is set.
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.monthly_budget_limit_usd
    threshold_type             = "ABSOLUTE_VALUE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_killswitch.arn]
    subscriber_email_addresses = var.alert_email == "" ? [] : [var.alert_email]
  }
}

# ── Cost monitoring (price) ───────────────────────────────────────────────────
# Two parts, both free to run (no CloudWatch alarms by design):
#
#   1) COST ALLOCATION TAGS — activate Project/Env so Cost Explorer & the Billing
#      console can break spend down by project/env (Cost Explorer → Group by →
#      Tag: Project). Opt-in because:
#        • only the management/payer account can activate them (apply errors on a
#          member account), and
#        • the tag key must already be visible in Billing (appears up to ~24h
#          AFTER the first tagged resource is billed).
#      Once those are true, set enable_cost_allocation_tags = true and apply.
#      Activation itself is free.
#
#   2) COST DASHBOARD — AWS/Billing EstimatedCharges, kept on its OWN dashboard so
#      both this and the usage dashboard stay under the CloudWatch free tier
#      (3 dashboards, up to 50 metrics each). AWS/Billing data exists ONLY in
#      us-east-1 and ONLY after a one-time opt-in: Billing & Cost Management →
#      Billing preferences → enable "Receive CloudWatch billing alerts".

resource "aws_ce_cost_allocation_tag" "project" {
  count   = var.enable_cost_allocation_tags ? 1 : 0
  tag_key = "Project"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "env" {
  count   = var.enable_cost_allocation_tags ? 1 : 0
  tag_key = "Env"
  status  = "Active"
}

resource "aws_cloudwatch_dashboard" "cost" {
  dashboard_name = "${local.prefix}-cost"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 2
        properties = {
          markdown = <<-EOT
            # Giftmaxxing (${var.env}) — estimated charges (USD, month-to-date)
            Source `AWS/Billing` (us-east-1). One-time setup: **Billing & Cost Management → Billing preferences → enable "Receive CloudWatch billing alerts"**. Data refreshes every ~6h. For spend **by project**, use Cost Explorer → Group by → Tag: `Project` (activate the tag first — see cost.tf).
          EOT
        }
      },

      # ── Total month-to-date (number) ──────────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 2
        width  = 6
        height = 6
        properties = {
          title                = "Total est. charges (USD)"
          view                 = "singleValue"
          region               = "us-east-1" # AWS/Billing only exists in us-east-1
          period               = 21600
          sparkline            = true
          setPeriodToTimeRange = true
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", { stat = "Maximum", label = "Total" }],
          ]
        }
      },

      # ── Total over time ───────────────────────────────────────────────────
      {
        type   = "metric"
        x      = 6
        y      = 2
        width  = 9
        height = 6
        properties = {
          title   = "Estimated charges — total (USD)"
          view    = "timeSeries"
          stacked = false
          region  = "us-east-1"
          period  = 21600
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", { stat = "Maximum", label = "Total" }],
          ]
        }
      },

      # ── By service ────────────────────────────────────────────────────────
      {
        type   = "metric"
        x      = 15
        y      = 2
        width  = 9
        height = 6
        properties = {
          title   = "Estimated charges — by service (USD)"
          view    = "timeSeries"
          stacked = false
          region  = "us-east-1"
          period  = 21600
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AWSLambda", "Currency", "USD", { stat = "Maximum", label = "Lambda" }],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonDynamoDB", "Currency", "USD", { stat = "Maximum", label = "DynamoDB" }],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonS3", "Currency", "USD", { stat = "Maximum", label = "S3" }],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonApiGateway", "Currency", "USD", { stat = "Maximum", label = "API Gateway" }],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonCloudWatch", "Currency", "USD", { stat = "Maximum", label = "CloudWatch" }],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonBedrock", "Currency", "USD", { stat = "Maximum", label = "Bedrock" }],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AWSDataTransfer", "Currency", "USD", { stat = "Maximum", label = "Data transfer" }],
          ]
        }
      },
    ]
  })
}

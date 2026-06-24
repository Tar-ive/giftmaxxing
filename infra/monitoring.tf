# ── CloudWatch usage dashboard ────────────────────────────────────────────────
# A single pane of glass over every runtime AWS resource Giftmaxxing uses:
# API Gateway (HTTP API), the API + reminders Lambdas, all six DynamoDB tables,
# the media S3 bucket, the reminders SNS topic, and Bedrock (Titan Multimodal,
# used by visual search). S3 Vectors queries flow through the Lambda, so their
# health/latency is observable via the Lambda + Bedrock panels. Cost lives on a
# separate free dashboard (cost.tf) so each stays under the 50-metric free tier.
# Apply with `terraform apply`; the console URL is emitted as `dashboard_url`.

locals {
  bedrock_embed_model_id = "amazon.titan-embed-image-v1"
  dashboard_name         = "${local.prefix}-overview"
}

resource "aws_cloudwatch_dashboard" "overview" {
  dashboard_name = local.dashboard_name

  dashboard_body = jsonencode({
    widgets = [
      # ── header ────────────────────────────────────────────────────────────
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 3
        properties = {
          markdown = <<-EOT
            # Giftmaxxing (${var.env}) — AWS resource monitor
            **Region** `${var.region}` · **API** `${aws_apigatewayv2_api.http.id}` · **Lambda** `${aws_lambda_function.api.function_name}` · **Bedrock** `${local.bedrock_embed_model_id}`
            **DynamoDB** users·posts·interactions·knowledge·events·connections   |   **S3** `${aws_s3_bucket.media.bucket}`   |   **S3 Vectors** `${local.prefix}-vectors` · **SNS** `${aws_sns_topic.reminders.name}`
            **Cost** → `${local.prefix}-cost` dashboard   |   **All resources** → Resource Group `${local.prefix}-resources`
          EOT
        }
      },

      # ── API Gateway: traffic & errors ─────────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 3
        width  = 8
        height = 6
        properties = {
          title   = "API Gateway — requests & errors"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 300
          metrics = [
            ["AWS/ApiGatewayV2", "Count", "ApiId", aws_apigatewayv2_api.http.id, { stat = "Sum", label = "Requests" }],
            ["AWS/ApiGatewayV2", "4xx", "ApiId", aws_apigatewayv2_api.http.id, { stat = "Sum", label = "4xx", color = "#ff7f0e" }],
            ["AWS/ApiGatewayV2", "5xx", "ApiId", aws_apigatewayv2_api.http.id, { stat = "Sum", label = "5xx", color = "#d62728" }],
          ]
        }
      },

      # ── API Gateway: latency ──────────────────────────────────────────────
      {
        type   = "metric"
        x      = 8
        y      = 3
        width  = 8
        height = 6
        properties = {
          title   = "API Gateway — latency (ms)"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 300
          metrics = [
            ["AWS/ApiGatewayV2", "Latency", "ApiId", aws_apigatewayv2_api.http.id, { stat = "Average", label = "Latency avg" }],
            ["AWS/ApiGatewayV2", "Latency", "ApiId", aws_apigatewayv2_api.http.id, { stat = "p99", label = "Latency p99" }],
            ["AWS/ApiGatewayV2", "IntegrationLatency", "ApiId", aws_apigatewayv2_api.http.id, { stat = "Average", label = "Integration avg" }],
          ]
        }
      },

      # ── Lambda: invocations & errors ──────────────────────────────────────
      {
        type   = "metric"
        x      = 16
        y      = 3
        width  = 8
        height = 6
        properties = {
          title   = "Lambda — invocations & errors"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 300
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.api.function_name, { stat = "Sum", label = "Invocations" }],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.api.function_name, { stat = "Sum", label = "Errors", color = "#d62728" }],
            ["AWS/Lambda", "Throttles", "FunctionName", aws_lambda_function.api.function_name, { stat = "Sum", label = "Throttles", color = "#ff7f0e" }],
          ]
        }
      },

      # ── Lambda: duration & concurrency ────────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 9
        width  = 8
        height = 6
        properties = {
          title   = "Lambda — duration (ms) & concurrency"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 300
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.api.function_name, { stat = "Average", label = "Duration avg" }],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.api.function_name, { stat = "p99", label = "Duration p99" }],
            ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", aws_lambda_function.api.function_name, { stat = "Maximum", label = "Concurrency", yAxis = "right" }],
          ]
        }
      },

      # ── Bedrock: Titan Multimodal (visual search) ─────────────────────────
      {
        type   = "metric"
        x      = 8
        y      = 9
        width  = 8
        height = 6
        properties = {
          title   = "Bedrock — Titan Multimodal (visual search)"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 300
          metrics = [
            ["AWS/Bedrock", "Invocations", "ModelId", local.bedrock_embed_model_id, { stat = "Sum", label = "Invocations" }],
            ["AWS/Bedrock", "InvocationClientErrors", "ModelId", local.bedrock_embed_model_id, { stat = "Sum", label = "Client errors", color = "#ff7f0e" }],
            ["AWS/Bedrock", "InvocationServerErrors", "ModelId", local.bedrock_embed_model_id, { stat = "Sum", label = "Server errors", color = "#d62728" }],
            ["AWS/Bedrock", "InvocationThrottles", "ModelId", local.bedrock_embed_model_id, { stat = "Sum", label = "Throttles" }],
            ["AWS/Bedrock", "InvocationLatency", "ModelId", local.bedrock_embed_model_id, { stat = "Average", label = "Latency avg (ms)", yAxis = "right" }],
          ]
        }
      },

      # ── S3: media bucket (daily storage metrics) ──────────────────────────
      {
        type   = "metric"
        x      = 16
        y      = 9
        width  = 8
        height = 6
        properties = {
          title   = "S3 — media bucket (daily)"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 86400
          metrics = [
            ["AWS/S3", "BucketSizeBytes", "BucketName", aws_s3_bucket.media.bucket, "StorageType", "StandardStorage", { stat = "Average", label = "Size (bytes)" }],
            ["AWS/S3", "NumberOfObjects", "BucketName", aws_s3_bucket.media.bucket, "StorageType", "AllStorageTypes", { stat = "Average", label = "Objects", yAxis = "right" }],
          ]
        }
      },

      # ── DynamoDB: consumed read units ─────────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 15
        width  = 8
        height = 6
        properties = {
          title   = "DynamoDB — consumed read units"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 300
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.users.name, { stat = "Sum", label = "users" }],
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.posts.name, { stat = "Sum", label = "posts" }],
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.interactions.name, { stat = "Sum", label = "interactions" }],
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.knowledge.name, { stat = "Sum", label = "knowledge" }],
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.events.name, { stat = "Sum", label = "events" }],
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.connections.name, { stat = "Sum", label = "connections" }],
          ]
        }
      },

      # ── DynamoDB: consumed write units ────────────────────────────────────
      {
        type   = "metric"
        x      = 8
        y      = 15
        width  = 8
        height = 6
        properties = {
          title   = "DynamoDB — consumed write units"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 300
          metrics = [
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.users.name, { stat = "Sum", label = "users" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.posts.name, { stat = "Sum", label = "posts" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.interactions.name, { stat = "Sum", label = "interactions" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.knowledge.name, { stat = "Sum", label = "knowledge" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.events.name, { stat = "Sum", label = "events" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.connections.name, { stat = "Sum", label = "connections" }],
          ]
        }
      },

      # ── DynamoDB: throttle events ─────────────────────────────────────────
      {
        type   = "metric"
        x      = 16
        y      = 15
        width  = 8
        height = 6
        properties = {
          title   = "DynamoDB — throttle events"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 300
          metrics = [
            ["AWS/DynamoDB", "ReadThrottleEvents", "TableName", aws_dynamodb_table.users.name, { stat = "Sum", label = "users read" }],
            ["AWS/DynamoDB", "WriteThrottleEvents", "TableName", aws_dynamodb_table.users.name, { stat = "Sum", label = "users write" }],
            ["AWS/DynamoDB", "ReadThrottleEvents", "TableName", aws_dynamodb_table.posts.name, { stat = "Sum", label = "posts read" }],
            ["AWS/DynamoDB", "WriteThrottleEvents", "TableName", aws_dynamodb_table.posts.name, { stat = "Sum", label = "posts write" }],
            ["AWS/DynamoDB", "ReadThrottleEvents", "TableName", aws_dynamodb_table.interactions.name, { stat = "Sum", label = "interactions read" }],
            ["AWS/DynamoDB", "WriteThrottleEvents", "TableName", aws_dynamodb_table.interactions.name, { stat = "Sum", label = "interactions write" }],
            ["AWS/DynamoDB", "ReadThrottleEvents", "TableName", aws_dynamodb_table.knowledge.name, { stat = "Sum", label = "knowledge read" }],
            ["AWS/DynamoDB", "WriteThrottleEvents", "TableName", aws_dynamodb_table.knowledge.name, { stat = "Sum", label = "knowledge write" }],
            ["AWS/DynamoDB", "ReadThrottleEvents", "TableName", aws_dynamodb_table.events.name, { stat = "Sum", label = "events read" }],
            ["AWS/DynamoDB", "WriteThrottleEvents", "TableName", aws_dynamodb_table.events.name, { stat = "Sum", label = "events write" }],
            ["AWS/DynamoDB", "ReadThrottleEvents", "TableName", aws_dynamodb_table.connections.name, { stat = "Sum", label = "connections read" }],
            ["AWS/DynamoDB", "WriteThrottleEvents", "TableName", aws_dynamodb_table.connections.name, { stat = "Sum", label = "connections write" }],
          ]
        }
      },

      # ── Lambda: recent errors (Logs Insights) ─────────────────────────────
      {
        type   = "log"
        x      = 0
        y      = 21
        width  = 24
        height = 6
        properties = {
          title  = "Lambda — recent errors & warnings"
          region = var.region
          view   = "table"
          query  = "SOURCE '${aws_cloudwatch_log_group.api.name}' | fields @timestamp, @message | filter @message like /(?i)(error|exception|timeout|throttl|fail)/ | sort @timestamp desc | limit 50"
        }
      },

      # ── Reminders Lambda (daily cron) ─────────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 27
        width  = 12
        height = 6
        properties = {
          title   = "Reminders Lambda — daily cron"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 86400
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.reminders.function_name, { stat = "Sum", label = "Invocations" }],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.reminders.function_name, { stat = "Sum", label = "Errors", color = "#d62728" }],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.reminders.function_name, { stat = "Average", label = "Duration avg (ms)", yAxis = "right" }],
          ]
        }
      },

      # ── SNS — reminders topic ─────────────────────────────────────────────
      {
        type   = "metric"
        x      = 12
        y      = 27
        width  = 12
        height = 6
        properties = {
          title   = "SNS — reminders topic"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 86400
          metrics = [
            ["AWS/SNS", "NumberOfMessagesPublished", "TopicName", aws_sns_topic.reminders.name, { stat = "Sum", label = "Published" }],
            ["AWS/SNS", "NumberOfNotificationsDelivered", "TopicName", aws_sns_topic.reminders.name, { stat = "Sum", label = "Delivered" }],
            ["AWS/SNS", "NumberOfNotificationsFailed", "TopicName", aws_sns_topic.reminders.name, { stat = "Sum", label = "Failed", color = "#d62728" }],
          ]
        }
      },
    ]
  })
}

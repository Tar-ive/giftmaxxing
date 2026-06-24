output "api_endpoint" {
  description = "Base URL for the HTTP API (set as NEXT_PUBLIC_API_URL in the web app)"
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "tables" {
  description = "DynamoDB table names"
  value = {
    users        = aws_dynamodb_table.users.name
    posts        = aws_dynamodb_table.posts.name
    interactions = aws_dynamodb_table.interactions.name
    knowledge    = aws_dynamodb_table.knowledge.name
    milestones   = aws_dynamodb_table.milestones.name
    connections  = aws_dynamodb_table.connections.name
  }
}

output "media_bucket" {
  description = "S3 bucket for scraped pin images (set as MEDIA_BUCKET for the scraper)"
  value       = aws_s3_bucket.media.bucket
}

output "reminders_topic_arn" {
  description = "SNS topic for event reminders. Subscribe an endpoint: aws sns subscribe --topic-arn <this> --protocol email --notification-endpoint you@example.com"
  value       = aws_sns_topic.reminders.arn
}

output "dashboard_url" {
  description = "CloudWatch USAGE dashboard (API, Lambdas, DynamoDB, S3, SNS, Bedrock)"
  value       = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=${aws_cloudwatch_dashboard.overview.dashboard_name}"
}

output "cost_dashboard_url" {
  description = "CloudWatch COST dashboard (AWS/Billing estimated charges, month-to-date)"
  value       = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=${aws_cloudwatch_dashboard.cost.dashboard_name}"
}

output "resource_group_url" {
  description = "AWS Resource Group: every Giftmaxxing resource in one tag-based view"
  value       = "https://${var.region}.console.aws.amazon.com/resource-groups/group/${aws_resourcegroups_group.giftmaxxing.name}?region=${var.region}"
}

output "cost_explorer_url" {
  description = "Cost Explorer. After activating the Project cost-allocation tag, use Group by -> Tag: Project for per-project spend."
  value       = "https://us-east-1.console.aws.amazon.com/cost-management/home#/cost-explorer"
}

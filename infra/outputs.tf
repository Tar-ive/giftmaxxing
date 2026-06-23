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
  description = "CloudWatch dashboard monitoring all Giftmaxxing AWS resources"
  value       = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=${aws_cloudwatch_dashboard.overview.dashboard_name}"
}

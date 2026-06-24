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
    events       = aws_dynamodb_table.events.name
    connections  = aws_dynamodb_table.connections.name
    graph        = aws_dynamodb_table.graph.name
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

output "cost_alerts_topic_arn" {
  description = "SNS topic for cost/budget alerts ($10/$50/$100/$1000). Set var.alert_email to auto-subscribe (confirm the email AWS sends). Add more: aws sns subscribe --topic-arn <this> --protocol email --notification-endpoint you@example.com"
  value       = aws_sns_topic.cost_alerts.arn
}

output "cost_killswitch_topic_arn" {
  description = "SNS topic that triggers the auto-pause breaker (the $1,000 budget + real-time CloudWatch alarms publish here)."
  value       = aws_sns_topic.cost_killswitch.arn
}

output "breaker_function_name" {
  description = "The cost kill-switch (breaker) Lambda."
  value       = aws_lambda_function.breaker.function_name
}

output "killswitch_resume_command" {
  description = "APPROVE + turn paused features back on after the kill switch engages."
  value       = "aws lambda invoke --function-name ${aws_lambda_function.breaker.function_name} --payload '{\"action\":\"resume\"}' --cli-binary-format raw-in-base64-out /dev/stdout"
}

output "killswitch_engage_test_command" {
  description = "Manually ENGAGE the kill switch to test it (pauses non-essential features)."
  value       = "aws lambda invoke --function-name ${aws_lambda_function.breaker.function_name} --payload '{\"action\":\"engage\",\"reason\":\"manual test\"}' --cli-binary-format raw-in-base64-out /dev/stdout"
}

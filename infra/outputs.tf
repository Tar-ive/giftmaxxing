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
  }
}

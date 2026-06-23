# Zip the handler source. DynamoDB clients come from the nodejs20.x runtime SDK;
# @aws-sdk/client-s3vectors is NOT in the runtime, so it's npm-installed into
# src/node_modules and bundled here (run `npm install` in src/ before apply).
data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/build/api.zip"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.prefix}-api"
  retention_in_days = 14
}

resource "aws_lambda_function" "api" {
  function_name    = "${local.prefix}-api"
  role             = aws_iam_role.api_lambda.arn
  runtime          = "nodejs20.x"
  handler          = "handler.handler"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      USERS_TABLE        = aws_dynamodb_table.users.name
      POSTS_TABLE        = aws_dynamodb_table.posts.name
      INTERACTIONS_TABLE = aws_dynamodb_table.interactions.name
      KNOWLEDGE_TABLE    = aws_dynamodb_table.knowledge.name
      VECTOR_BUCKET      = "${local.prefix}-vectors"
      VECTOR_INDEX       = "pins"
      # Visual search: Titan Multimodal embedding model + vector dimensionality.
      BEDROCK_EMBED_MODEL_ID = "amazon.titan-embed-image-v1"
      VECTOR_DIM             = "1024"
    }
  }

  depends_on = [aws_cloudwatch_log_group.api]
}

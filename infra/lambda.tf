# Zip the handler source. AWS SDK v3 ships with nodejs20.x, so there are no
# node_modules to bundle — the src/ dir is the whole deployment package.
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
    }
  }

  depends_on = [aws_cloudwatch_log_group.api]
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api_lambda" {
  name               = "${local.prefix}-api-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# CloudWatch Logs (basic execution).
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.api_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Least-privilege DynamoDB access scoped to our three tables + the GSI.
data "aws_iam_policy_document" "ddb_access" {
  statement {
    sid = "TableAccess"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:BatchGetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchWriteItem",
    ]
    resources = [
      aws_dynamodb_table.users.arn,
      aws_dynamodb_table.posts.arn,
      "${aws_dynamodb_table.posts.arn}/index/*",
      aws_dynamodb_table.interactions.arn,
    ]
  }
}

resource "aws_iam_role_policy" "ddb_access" {
  name   = "${local.prefix}-ddb-access"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.ddb_access.json
}

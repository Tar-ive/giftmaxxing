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
      aws_dynamodb_table.knowledge.arn,
      aws_dynamodb_table.connections.arn,
    ]
  }
}

resource "aws_iam_role_policy" "ddb_access" {
  name   = "${local.prefix}-ddb-access"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.ddb_access.json
}

# S3 Vectors read access for the recommendation kNN query path. QueryVectors with
# returnMetadata / a metadata filter also requires GetVectors (per the API).
data "aws_caller_identity" "current" {}

locals {
  vectors_bucket_arn = "arn:aws:s3vectors:${var.region}:${data.aws_caller_identity.current.account_id}:bucket/${local.prefix}-vectors"
}

data "aws_iam_policy_document" "s3vectors_access" {
  statement {
    sid = "VectorRead"
    actions = [
      "s3vectors:QueryVectors",
      "s3vectors:GetVectors",
      "s3vectors:ListVectors",
    ]
    resources = [
      local.vectors_bucket_arn,
      "${local.vectors_bucket_arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "s3vectors_access" {
  name   = "${local.prefix}-s3vectors-access"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.s3vectors_access.json
}

# Bedrock: invoke the Titan Multimodal embedding model to turn an uploaded image
# into a query vector for visual search (POST /visual-search). Foundation-model
# ARNs have an empty account-id segment.
data "aws_iam_policy_document" "bedrock_access" {
  statement {
    sid       = "InvokeTitanEmbed"
    actions   = ["bedrock:InvokeModel"]
    resources = ["arn:aws:bedrock:${var.region}::foundation-model/amazon.titan-embed-image-v1"]
  }
}

resource "aws_iam_role_policy" "bedrock_access" {
  name   = "${local.prefix}-bedrock-access"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.bedrock_access.json
}

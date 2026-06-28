# ── Container registry for the App Runner API image ───────────────────────────
# Holds the Docker image built from infra/src (server.mjs -> handler.mjs). App
# Runner pulls :latest from here. Build + push BEFORE the first `terraform apply`
# of the App Runner service, or service creation fails ("image not found"):
#
#   terraform apply -target=aws_ecr_repository.api      # create the repo first
#   REGION=us-east-1 ACCT=$(aws sts get-caller-identity --query Account --output text)
#   REPO=$ACCT.dkr.ecr.$REGION.amazonaws.com/giftmaxxing-dev-api
#   aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCT.dkr.ecr.$REGION.amazonaws.com
#   docker build --platform linux/amd64 -t $REPO:latest infra/src
#   docker push $REPO:latest
#   terraform apply                                     # then the service
resource "aws_ecr_repository" "api" {
  name                 = "${local.prefix}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Cap stored images so the registry doesn't accrue cost over many deploys.
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

output "ecr_api_repository_url" {
  description = "ECR repo for the App Runner API image (push :latest here)."
  value       = aws_ecr_repository.api.repository_url
}

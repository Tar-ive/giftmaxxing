variable "region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "env" {
  description = "Environment name (used in resource name prefixes)"
  type        = string
  default     = "dev"
}

variable "project" {
  description = "Project name prefix for resources"
  type        = string
  default     = "giftmaxxing"
}

variable "cors_allow_origins" {
  description = "Allowed CORS origins for the HTTP API"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

locals {
  prefix = "${var.project}-${var.env}"
}

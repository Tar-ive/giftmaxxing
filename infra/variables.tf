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
  description = "Allowed CORS origins for the HTTP API. This is an unauthenticated public read API, so '*' lets the Vercel prod + preview domains call it from the browser. Restrict to specific origins (e.g. your Vercel domain + http://localhost:3000) to lock down browser callers."
  type        = list(string)
  default     = ["*"]
}

variable "enable_cost_allocation_tags" {
  description = "Activate Project/Env as Cost Allocation Tags for Cost Explorer (see cost.tf). Requires the management/payer account AND the tag key to already be visible in Billing (~24h after first use); leave false otherwise to avoid apply errors."
  type        = bool
  default     = false
}

locals {
  prefix = "${var.project}-${var.env}"
}

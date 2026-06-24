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

variable "alert_email" {
  description = "Email for cost/budget alerts (subscribes to the cost-alerts SNS topic; see budgets.tf). Leave empty to skip. Set it in terraform.tfvars (gitignored) or via -var. After apply you MUST click the confirmation link AWS emails you, or no alerts arrive."
  type        = string
  default     = ""
}

variable "alert_sms_number" {
  description = "Optional phone number in E.164 format (e.g. +15551234567) for SMS cost alerts. Leave empty to skip. SNS SMS may require moving the account out of the SMS sandbox / verifying the number first."
  type        = string
  default     = ""
}

# ── Phase 2: kill switch + real-time tripwires (see killswitch.tf) ────────────
variable "api_reserved_concurrency" {
  description = "Reserved concurrency ceiling for the API Lambda — a baseline guard so a runaway/traffic spike can't balloon Lambda + DynamoDB cost. -1 = unreserved (no cap). The $1,000 kill switch pauses expensive AI routes on top of this. NOTE: a reservation needs the account's Lambda 'Concurrent executions' quota above 10 (AWS always keeps 10 unreserved); raise it via Service Quotas to use a positive value."
  type        = number
  default     = -1
}

variable "maxi_model_id" {
  description = "Bedrock model / inference-profile id Maxi (the gift concierge) invokes via the Converse API. Default = the Claude Haiku 4.5 us cross-region inference profile."
  type        = string
  default     = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
}

# ── Maxi budgets (POST /maxi): per-interaction token caps + monthly Bedrock $ cap
variable "maxi_max_tokens" {
  description = "Maxi per-call OUTPUT token cap (Bedrock Converse maxTokens)."
  type        = number
  default     = 768
}

variable "maxi_interaction_token_budget" {
  description = "Hard cap on TOTAL tokens (input+output) summed across Maxi's tool-use loop for ONE /maxi request. When exceeded, the loop stops."
  type        = number
  default     = 30000
}

variable "maxi_max_steps" {
  description = "Max Bedrock Converse round-trips (tool-use steps) per Maxi interaction."
  type        = number
  default     = 5
}

variable "maxi_monthly_budget_usd" {
  description = "Hard MONTHLY Bedrock budget for Maxi (estimated USD). When month-to-date Maxi spend reaches this, /maxi returns 503 and the client falls back to the offline responder. 0 = unlimited."
  type        = number
  default     = 25
}

variable "maxi_price_in_per_1m" {
  description = "Bedrock price (USD) per 1M INPUT tokens for the Maxi model, used to estimate spend vs maxi_monthly_budget_usd. VERIFY against current Bedrock pricing for Claude Haiku 4.5."
  type        = number
  default     = 1.0
}

variable "maxi_price_out_per_1m" {
  description = "Bedrock price (USD) per 1M OUTPUT tokens for the Maxi model. VERIFY against current Bedrock pricing for Claude Haiku 4.5."
  type        = number
  default     = 5.0
}

variable "alarm_bedrock_invocations_5min" {
  description = "Real-time tripwire: trip the kill switch if Bedrock (Titan) invocations exceed this in a 5-min window. Tune to your normal visual-search volume."
  type        = number
  default     = 500
}

variable "alarm_api_requests_5min" {
  description = "Real-time tripwire: trip the kill switch if API Gateway requests exceed this in a 5-min window (~166 req/s at 50000)."
  type        = number
  default     = 50000
}

variable "alarm_api_concurrency" {
  description = "Real-time tripwire: trip the kill switch if API Lambda concurrency exceeds this. Keep it below api_reserved_concurrency."
  type        = number
  default     = 40
}

locals {
  prefix = "${var.project}-${var.env}"
}

# Copy to terraform.tfvars (gitignored) and fill in, then `terraform apply`.
#   cp example.tfvars terraform.tfvars

# ── Cost / budget alerts (see budgets.tf) ────────────────────────────────────
# Email that receives the $10/$50/$100/$1000 alerts. You MUST click the SNS
# confirmation email AWS sends after the first apply, or no alerts arrive.
alert_email = "you@example.com"

# Optional SMS (E.164). SNS SMS may require leaving the SMS sandbox first.
# alert_sms_number = "+15551234567"

# ── Other tunables (defaults shown) ──────────────────────────────────────────
# region                      = "us-east-1"
# env                         = "dev"
# project                     = "giftmaxxing"
# enable_cost_allocation_tags = false

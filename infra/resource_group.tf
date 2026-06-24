# ── Resource Group ("Resource Manager") ──────────────────────────────────────
# A single, tag-based view of EVERY Giftmaxxing resource. Because the AWS
# provider stamps default_tags (Project/Env/ManagedBy, see providers.tf) on every
# taggable resource, this group AUTO-includes anything we add later (new tables,
# Lambdas, SNS topics, ...) with zero edits here.
#
# Console: Resource Groups & Tag Editor → "Saved resource groups" → this group.
# From there you can jump straight into CloudWatch metrics / the bulk Tag Editor.
# Cost: AWS Resource Groups and Tag Editor are FREE.
resource "aws_resourcegroups_group" "giftmaxxing" {
  name        = "${local.prefix}-resources"
  description = "All ${var.project} ${var.env} resources selected by Project and Env tags"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        { Key = "Project", Values = [var.project] },
        { Key = "Env", Values = [var.env] },
      ]
    })
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "giftmaxxing"
      ManagedBy = "terraform"
      Env       = var.env
    }
  }
}

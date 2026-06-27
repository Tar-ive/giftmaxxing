# ─────────────────────────────────────────────────────────────────────────────
# Edge cache (CloudFront) in front of the API Gateway HTTP API.
#
# WHY: the dev account's Lambda "Concurrent executions" quota is tiny (10), so the
# public, repeatable feed reads (GET /feed, /pins, /recommendations, /ideas) were
# saturating the pool and 503-throttling everything — including real-time routes.
# Caching those GETs at the edge means repeated/identical requests are served by
# CloudFront and NEVER invoke the Lambda, freeing the whole concurrency pool for
# the real-time routes (/maxi, /interactions, /me, /pools, ...), which bypass the
# cache via the default behavior.
#
# After `terraform apply`, point the frontend at the CloudFront URL:
#   NEXT_PUBLIC_API_URL = <output cloudfront_api_url>   (Vercel + web/.env.local)
# then redeploy (NEXT_PUBLIC_* is inlined at build time).
# ─────────────────────────────────────────────────────────────────────────────

locals {
  # Public, cacheable GET routes. Everything else falls through to the default
  # (no-cache) behavior and reaches the Lambda directly.
  cached_api_routes = ["/feed", "/pins", "/recommendations", "/ideas"]

  # Bare host of the API Gateway endpoint (CloudFront origin wants host, no scheme).
  api_origin_host = replace(aws_apigatewayv2_api.http.api_endpoint, "https://", "")
}

# Managed policies for the default (real-time) behavior: never cache, forward
# everything (auth, body, query, CORS headers) except the Host header.
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# Cache KEY for the feed routes: vary on the full query string only (userId,
# cursor, limit, seedKeys, vibes, recipient, ...). Auth headers are intentionally
# excluded so all viewers share the cache for an identical query. cors is "*" so
# the cached Access-Control-Allow-Origin works for every origin.
resource "aws_cloudfront_cache_policy" "api_feed" {
  name        = "${local.prefix}-api-feed-cache"
  comment     = "Short-TTL cache for public feed GETs; keyed on query string"
  default_ttl = 60
  min_ttl     = 0
  max_ttl     = 300

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    query_strings_config {
      query_string_behavior = "all"
    }
    headers_config {
      header_behavior = "none"
    }
    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# What CloudFront forwards to the origin for the feed routes: all query strings
# (so the Lambda still sees userId/cursor/etc) plus the CORS preflight headers (so
# API Gateway's built-in CORS can answer any OPTIONS that lands here). None of
# these headers are part of the cache key above.
resource "aws_cloudfront_origin_request_policy" "api_feed" {
  name    = "${local.prefix}-api-feed-origin"
  comment = "Forward query strings + CORS headers for cached feed GETs"

  query_strings_config {
    query_string_behavior = "all"
  }
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
      ]
    }
  }
  cookies_config {
    cookie_behavior = "none"
  }
}

resource "aws_cloudfront_distribution" "api" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${local.prefix} API edge cache"
  price_class     = "PriceClass_100" # NA + EU only — cheapest, fine for dev

  origin {
    domain_name = local.api_origin_host
    origin_id   = "apigw"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default: real-time routes (/maxi, /interactions, /me, /pools, /visual-search,
  # /connections, /graph, /events, /seed, all POST/PUT). Never cached — straight
  # to the Lambda with full auth + body forwarded.
  default_cache_behavior {
    target_origin_id       = "apigw"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  # Cached: the public feed GETs that were causing the throttle storm.
  dynamic "ordered_cache_behavior" {
    for_each = local.cached_api_routes
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "apigw"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      compress               = true

      cache_policy_id          = aws_cloudfront_cache_policy.api_feed.id
      origin_request_policy_id = aws_cloudfront_origin_request_policy.api_feed.id
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

output "cloudfront_api_url" {
  description = "Set NEXT_PUBLIC_API_URL to this so feed reads are edge-cached."
  value       = "https://${aws_cloudfront_distribution.api.domain_name}"
}

# ──────────────────────────────────────────
# Existing API stack
# ──────────────────────────────────────────
data "terraform_remote_state" "api" {
  backend = "local"

  config = {
    path = var.api_state_path
  }
}

data "aws_instance" "api" {
  filter {
    name   = "tag:aws:autoscaling:groupName"
    values = [data.terraform_remote_state.api.outputs.asg_name]
  }

  filter {
    name   = "instance-state-name"
    values = ["running"]
  }
}

data "aws_security_group" "api" {
  name   = "${var.api_project_name}-${var.environment}-sg"
  vpc_id = data.terraform_remote_state.api.outputs.vpc_id
}

# ──────────────────────────────────────────
# API access
# ──────────────────────────────────────────

# CloudFront needs a stable DNS name for the instance. If the Auto Scaling group
# replaces the instance, run terraform apply again to move this address to it.
resource "aws_eip" "api" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-${var.environment}-api"
  }
}

resource "aws_eip_association" "api" {
  allocation_id = aws_eip.api.id
  instance_id   = data.aws_instance.api.id
}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_vpc_security_group_ingress_rule" "api_from_cloudfront" {
  security_group_id = data.aws_security_group.api.id
  description       = "API access from CloudFront only"
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
  ip_protocol       = "tcp"
  from_port         = var.api_port
  to_port           = var.api_port
}

# ──────────────────────────────────────────
# Static files
# ──────────────────────────────────────────
resource "aws_s3_bucket" "frontend" {
  bucket_prefix = "${var.project_name}-${var.environment}-"
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.main.arn }
      }
    }]
  })
}

# ──────────────────────────────────────────
# CloudFront
# ──────────────────────────────────────────
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-${var.environment}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# The API serves /job-postings, while the frontend calls /api/job-postings
resource "aws_cloudfront_function" "strip_api_prefix" {
  name    = "${var.project_name}-${var.environment}-strip-api-prefix"
  runtime = "cloudfront-js-2.0"
  publish = true

  code = <<-EOF
    function handler(event) {
      event.request.uri = event.request.uri.replace(/^\/api/, '');
      return event.request;
    }
  EOF
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  comment             = "${var.project_name}-${var.environment}"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    origin_id                = "frontend"
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    origin_id   = "api"
    domain_name = aws_eip.api.public_dns

    custom_origin_config {
      http_port              = var.api_port
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  # POST /import-job-postings can't be reached through CloudFront. Only GET, status updates (PATCH) and
  # the CORS preflight are allowed.
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "api"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.strip_api_prefix.arn
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

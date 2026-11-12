# ──────────────────────────────────────────
# Authentication (Amazon Cognito)
# ──────────────────────────────────────────
# The SPA signs users in through Cognito's hosted login (authorization code + PKCE)
# and sends the access token to the API, which validates it as a JWT.

resource "aws_cognito_user_pool" "main" {
  name                     = "${var.project_name}-${var.environment}"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = var.cognito_mfa_configuration

  # Users are invited by an administrator; nobody can self-register.
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  software_token_mfa_configuration {
    enabled = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Can use every backoffice endpoint"
}

locals {
  site_url       = "https://${aws_cloudfront_distribution.main.domain_name}/"
  auth_redirects = concat([local.site_url], var.cognito_extra_redirect_urls)
}

# Public client for the SPA: no secret, authorization code grant only.
resource "aws_cognito_user_pool_client" "spa" {
  name         = "spa"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"]
  callback_urls                        = local.auth_redirects
  logout_urls                          = local.auth_redirects

  # No explicit_auth_flows: ALLOW_REFRESH_TOKEN_AUTH can't be combined with refresh token
  # rotation. The SPA signs in and refreshes through the OAuth endpoints (hosted login).
  enable_token_revocation       = true
  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 7

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  refresh_token_rotation {
    feature                    = "ENABLED"
    retry_grace_period_seconds = 0
  }
}

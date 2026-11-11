output "url" {
  description = "URL of the deployed site"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "bucket_name" {
  description = "S3 bucket to upload the built site to"
  value       = aws_s3_bucket.frontend.bucket
}

output "distribution_id" {
  description = "CloudFront distribution to invalidate after uploading"
  value       = aws_cloudfront_distribution.main.id
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_issuer_uri" {
  description = "JWT issuer; set as the API's spring.security.oauth2.resourceserver.jwt.issuer-uri"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "cognito_spa_client_id" {
  description = "App client ID for the SPA; the API must also accept only tokens issued to it"
  value       = aws_cognito_user_pool_client.spa.id
}

output "cognito_login_domain" {
  description = "Hosted login domain used by the SPA"
  value       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

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

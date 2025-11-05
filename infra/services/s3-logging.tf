resource "aws_s3_bucket" "log_bucket" {
  bucket = "${var.env}-${var.region}-ClientDomain-logs-bucket"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "log_bucket" {
  bucket = aws_s3_bucket.log_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_acl" "log_bucket_acl" {
  bucket = aws_s3_bucket.log_bucket.id
  acl    = "log-delivery-write"
}

resource "aws_s3_bucket_logging" "company-logos-bucket-log" {
  bucket        = module.company-logos-bucket.s3_bucket_id
  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "company-logos-bucket-log/"
}

resource "aws_s3_bucket_logging" "frontend-bucket-log" {
  bucket        = module.frontend-bucket.s3_bucket_id
  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "frontend-bucket-log/"
}

resource "aws_s3_bucket_logging" "statement-bucket-log" {
  bucket        = module.statement-bucket.s3_bucket_id
  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "statement-bucket-log/"
}

resource "aws_s3_bucket_logging" "ClientDomain-company-census-bucket-log" {
  bucket        = module.ClientDomain-company-census.s3_bucket_id
  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "ClientDomain-company-census/"
}
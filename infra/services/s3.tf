module "statement-bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "3.15.1"

  bucket = "ClientDomain-statements-${var.env}"
  acl    = "private"

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  # Bucket policies
  attach_policy = false

  versioning = {
    enabled    = true
    mfa_delete = false
  }
  tags = local.tags
}

data "aws_iam_policy_document" "s3_statement_policy" {
  policy_id       = "PolicyForStatementBucket"
  statement {
    sid           = "StatementBucket"
    actions       = ["s3:*"]
    resources     = [
      module.statement-bucket.s3_bucket_arn,
      "${module.statement-bucket.s3_bucket_arn}/*"
    ]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.account}:role/backend-role"]
    }
  }
  depends_on = [
    module.statement-bucket
  ]
}

resource "aws_s3_bucket_policy" "statement-bucket-policy" {
  bucket = module.statement-bucket.s3_bucket_id
  policy = data.aws_iam_policy_document.s3_statement_policy.json
  depends_on = [
    module.statement-bucket
  ]
}

resource "aws_s3_bucket_lifecycle_configuration" "statement-bucket-lifecycle" {
  bucket = module.statement-bucket.s3_bucket_id
  
  rule {
    id = "DeleteExpiredFiles"
    expiration {
      days = 1
    }
    status = "Enabled"
  }
}

module "ClientDomain-company-census" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "3.15.1"

  bucket = "ClientDomain-company-census-${var.env}"

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  # Bucket policies
  attach_policy = false

  versioning = {
    enabled    = true
    mfa_delete = false
  }
  tags = local.tags
}

data "aws_iam_policy_document" "s3_ClientDomain-company-census_policy" {
  policy_id       = "PolicyForCensusBucket"
  statement {
    sid           = "CensusBucket"
    actions       = ["s3:*"]
    resources     = [
      module.ClientDomain-company-census.s3_bucket_arn,
      "${module.ClientDomain-company-census.s3_bucket_arn}/*"
    ]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.account}:role/backend-role"]
    }
  }
  depends_on = [
    module.ClientDomain-company-census
  ]
}

resource "aws_s3_bucket_policy" "ClientDomain-company-census-policy" {
  bucket = module.ClientDomain-company-census.s3_bucket_id
  policy = data.aws_iam_policy_document.s3_ClientDomain-company-census_policy.json
  depends_on = [
    module.ClientDomain-company-census
  ]
}
# Bucket for store lambda artifacts
module "lambda" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "3.15.1"

  bucket = "lambda-artifacts-${var.region}-${random_id.lambda.hex}"
  acl    = "private"

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  # Bucket policies
  attach_policy = true
  policy        = data.aws_iam_policy_document.bucket_policy.json

  versioning = {
    enabled    = true
    mfa_delete = false
  }

  depends_on = [
    random_id.lambda
  ]

  tags = local.tags
}

resource "random_id" "lambda" {
  byte_length = 8
}

data "aws_iam_policy_document" "bucket_policy" {
  statement {
    sid = "AllowFromAnotherAccount"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]

    resources = [
      module.lambda.s3_bucket_arn,
      "${module.lambda.s3_bucket_arn}/*",
    ]

    principals {
      type        = "AWS"
      identifiers = formatlist("arn:aws:iam::%s:root", var.accounts)
    }
  }
}


resource "aws_kms_key" "s3_key" {
  description             = "This key is used to encrypt bucket objects"
  deletion_window_in_days = 10
  tags                    = local.tags
  enable_key_rotation     = true
}

#resource "aws_s3_bucket_server_side_encryption_configuration" "encryption" {
#  bucket = module.lambda.s3_bucket_id
#
#  rule {
#    apply_server_side_encryption_by_default {
#      kms_master_key_id = aws_kms_key.s3_key.arn
#      sse_algorithm     = "aws:kms"
#    }
#  }
#}
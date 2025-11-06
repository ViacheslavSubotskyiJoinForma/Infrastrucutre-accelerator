data "aws_iam_policy_document" "assume_logging_policy" {
  statement {
    actions = [
      "sts:AssumeRole",
    ]

    principals {
      type        = "Service"
      identifiers = ["transfer.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "logging_policy" {

  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:DescribeLogStreams",
      "logs:CreateLogGroup",
      "logs:PutLogEvents"
    ]

    resources = [
      "*",
    ]
  }
}

data "aws_iam_policy_document" "assume-policy" {
  statement {
    actions = [
      "sts:AssumeRole",
    ]

    principals {
      type        = "Service"
      identifiers = ["transfer.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "policy" {
  for_each = toset(var.user)
  statement {
    sid = "HomeDirObjectAccess"

    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
      "s3:GetObjectVersion",
      "s3:GetObjectACL",
      "s3:PutObjectACL",
    ]

    resources = [
      "${aws_s3_bucket.sftp_bucket[each.key].arn}/*",
    ]
  }
  statement {
    sid = "AllowListingOfUserFolder"

    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]

    resources = [
      "${aws_s3_bucket.sftp_bucket[each.key].arn}",
    ]
  }
  statement {
    sid = "AllowKNSEncodeDecode"

    actions = [
      "kms:Decrypt",
      "kms:Encrypt",
      "kms:GenerateDataKey*",
    ]

    resources = [
      "${var.kms_arn}",
    ]
  }
}

data "aws_route53_zone" "selected" {
  name         = var.env == "prod" ? var.dns_name : "${local.dns_name}."
  private_zone = false
}

data "aws_acm_certificate" "issued" {
  domain   = var.env == "prod" ? "*.${var.dns_name}" : "*.${local.dns_name}"
  statuses = ["ISSUED"]
}


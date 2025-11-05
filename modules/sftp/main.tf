resource "aws_iam_role" "logging_role" {
  name               = "transfer-logging-role-${var.sftp_prefix_name}"
  assume_role_policy = data.aws_iam_policy_document.assume_logging_policy.json
}

resource "aws_iam_role_policy" "logging_role_policy" {
  name   = "transfer-logging-role-policy-${var.sftp_prefix_name}"
  role   = aws_iam_role.logging_role.id
  policy = data.aws_iam_policy_document.logging_policy.json
}

resource "aws_s3_bucket" "sftp_bucket" {
  for_each = toset(var.user)
  bucket   = "sftp-${each.key}-${local.bucket_name}"
  tags     = var.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "encryption-sftp" {
  for_each = toset(var.user)
  bucket   = aws_s3_bucket.sftp_bucket[each.key].id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "sftp_public_access" {
  for_each = toset(var.user)
  bucket   = aws_s3_bucket.sftp_bucket[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_acl" "sftp_bucket_acl" {
  for_each = toset(var.user)
  bucket   = aws_s3_bucket.sftp_bucket[each.key].id
  acl      = "private"
}

resource "aws_s3_object" "rdf" {
  for_each = toset(var.user)
  bucket   = aws_s3_bucket.sftp_bucket[each.key].id
  acl      = "private"
  key      = "upload/rdf/"
  source   = "/dev/null"
}

resource "aws_eip" "public_ip_sftp" {
  count = length(var.aws_subnet_ids)
  #vpc         = true
  tags = var.tags
}

resource "aws_transfer_server" "sftp" {
  endpoint_type          = "VPC"
  security_policy_name   = "TransferSecurityPolicy-2020-06"
  protocols              = ["SFTP"]
  certificate            = data.aws_acm_certificate.issued.arn
  identity_provider_type = "SERVICE_MANAGED"
  logging_role           = aws_iam_role.logging_role.arn
  endpoint_details {
    address_allocation_ids = [for eip in aws_eip.public_ip_sftp : eip.id]
    security_group_ids     = [var.security_group_ids]
    subnet_ids             = var.aws_subnet_ids
    vpc_id                 = var.vpc_id
  }

  tags = var.tags
}

resource "aws_secretsmanager_secret" "sftp_secret" {
  for_each    = toset(var.user)
  name        = "${each.key}_user"
  description = "SFTP Secrets for ${each.key}"
}

resource "aws_secretsmanager_secret_version" "secret_version" {
  for_each      = toset(var.user)
  secret_id     = aws_secretsmanager_secret.sftp_secret[each.key].id
  secret_string = <<EOF
{
  "username": "${each.key}_user",
  "user_ssh_key_private": "${tls_private_key.sftp_key[each.key].private_key_pem}"
}
EOF
}

resource "aws_route53_record" "sftp" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = "${var.sftp_prefix_name}.${var.dns_name}"
  type    = "CNAME"
  ttl     = "300"
  records = [aws_transfer_server.sftp.endpoint]

  depends_on = [
    aws_transfer_server.sftp
  ]
}

resource "aws_iam_role" "sftp_role" {
  for_each           = toset(var.user)
  name               = "transfer-${each.key}-user-iam-role"
  assume_role_policy = data.aws_iam_policy_document.assume-policy.json
}


resource "aws_iam_role_policy" "sftp_policy" {
  for_each = toset(var.user)
  name     = "transfer-${each.key}-user-iam-policy"
  role     = aws_iam_role.sftp_role[each.key].id
  policy   = data.aws_iam_policy_document.policy[each.key].json
}

resource "aws_transfer_user" "user" {
  for_each            = toset(var.user)
  user_name           = each.key
  server_id           = aws_transfer_server.sftp.id
  role                = aws_iam_role.sftp_role[each.key].arn
  home_directory_type = "PATH"
  home_directory      = "/${aws_s3_bucket.sftp_bucket[each.key].id}/upload"
}

resource "aws_transfer_ssh_key" "sftp_ssh_key" {
  for_each  = toset(var.user)
  server_id = aws_transfer_server.sftp.id
  user_name = each.key
  body      = tls_private_key.sftp_key[each.key].public_key_openssh

  depends_on = [
    aws_transfer_user.user,
    tls_private_key.sftp_key
  ]
}

resource "tls_private_key" "sftp_key" {
  for_each  = toset(var.user)
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_s3_bucket_versioning" "versioning_sftp" {
  for_each = toset(var.user)
  bucket   = aws_s3_bucket.sftp_bucket[each.key].id
  versioning_configuration {
    status = "Enabled"
  }
}
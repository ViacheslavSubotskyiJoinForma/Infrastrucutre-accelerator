data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/vpc/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "eks" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/eks/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "monitoring" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/monitoring/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "pre_token" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/pre-token-generation-lambda/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "post_confirmation" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/post-confirmation-lambda/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "pre_signup" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/pre-signup-lambda/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "custom_message_forgot_password" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/custom-message-forgot-password-lambda/tf.state"
    region = var.region
  }
}

data "aws_route53_zone" "public" {
  name = var.env == "prod" ? var.dns : local.dns_name
}

data "aws_acm_certificate" "ClientDomain" {
  domain   = var.env == "prod" ? "*.${var.dns}" : "*.${local.dns_name}"
  statuses = ["ISSUED"]
}

data "aws_secretsmanager_secret" "rds" {
  name = "db"
}

data "aws_secretsmanager_secret_version" "rds" {
  secret_id     = data.aws_secretsmanager_secret.rds.id
  version_stage = "AWSCURRENT"
}

data "aws_eks_cluster" "cluster" {
  name = data.terraform_remote_state.eks.outputs.cluster_id
}

data "aws_eks_cluster_auth" "cluster" {
  name = data.terraform_remote_state.eks.outputs.cluster_id
}

data "aws_eks_cluster_auth" "oidc_provider_arn" {
  name = data.terraform_remote_state.eks.outputs.oidc_arn
}

data "aws_security_group" "default" {
  vpc_id = data.terraform_remote_state.vpc.outputs.vpc_id
  name   = "default"
}

data "aws_cloudfront_cache_policy" "existing_cache_policy" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "existing_cors_policy" {
  name        = "Managed-CORS-S3Origin"
}

data "aws_secretsmanager_secret" "rds_user" {
  name = "rds_root_account"
}

data "aws_secretsmanager_secret_version" "rds_user" {
  secret_id     = data.aws_secretsmanager_secret.rds_user.id
  version_stage = "AWSCURRENT"
}

data "aws_secretsmanager_secret" "source1_ssh_piblic_key" {
  count = var.env == "prod" ? 1 : 0
  name  = "${var.env}-ssh-public-key-source1"
}

data "aws_secretsmanager_secret_version" "source1_ssh_piblic_key" {
  count         = var.env == "prod" ? 1 : 0
  secret_id     = data.aws_secretsmanager_secret.source1_ssh_piblic_key[0].id
  version_stage = "AWSCURRENT"
}
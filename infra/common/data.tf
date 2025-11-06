data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_secretsmanager_secret" "gitlab_runner" {
  name = "gitlab-runner"
}

data "aws_secretsmanager_secret_version" "gitlab_runner" {
  secret_id = data.aws_secretsmanager_secret.gitlab_runner.id
}

data "aws_route53_zone" "public" {
  name = var.dns
}

data "aws_ami" "eks_default" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amazon-eks-node-${local.cluster_version}-v*"]
  }
}

data "aws_iam_roles" "admin" {
  name_regex  = "AWSReservedSSO_AdministratorAccess_.*"
  path_prefix = "/aws-reserved/sso.amazonaws.com/"
}

data "terraform_remote_state" "vpc_dev" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "dev/vpc/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "vpc_uat" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "uat/vpc/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "vpc_prod" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "prod/vpc/tf.state"
    region = var.region
  }
}

data "aws_secretsmanager_secret" "okta_api_key" {
  name = "okta"
}

data "aws_secretsmanager_secret_version" "okta_api_key" {
  secret_id = data.aws_secretsmanager_secret.okta_api_key.id
}

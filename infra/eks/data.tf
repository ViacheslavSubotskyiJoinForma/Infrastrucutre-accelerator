data "aws_eks_cluster" "cluster" {
  name = module.eks.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_partition" "current" {}

data "aws_route53_zone" "public" {
  name         = var.env == "prod" ? var.dns : data.terraform_remote_state.services.outputs.dns_name
  private_zone = false
}

# Remote states
data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/vpc/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "services" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/services/tf.state"
    region = var.region
  }
}

data "aws_iam_roles" "admin" {
  name_regex  = "AWSReservedSSO_AdministratorAccess*"
  path_prefix = "/aws-reserved/sso.amazonaws.com/"
}

data "aws_iam_roles" "dev" {
  name_regex  = "AWSReservedSSO_ViewOnlyAccess*"
  path_prefix = "/aws-reserved/sso.amazonaws.com/"
}

data "terraform_remote_state" "es" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/opensearch/tf.state"
    region = var.region
  }
}
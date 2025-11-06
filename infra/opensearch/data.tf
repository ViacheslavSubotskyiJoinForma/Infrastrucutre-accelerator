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

data "terraform_remote_state" "eks" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/eks/tf.state"
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

data "aws_security_group" "default" {
  vpc_id = data.terraform_remote_state.vpc.outputs.vpc_id
  name   = "default"
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
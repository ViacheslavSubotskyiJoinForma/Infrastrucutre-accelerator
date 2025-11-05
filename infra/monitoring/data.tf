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

data "terraform_remote_state" "services" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/services/tf.state"
    region = var.region
  }
}

data "terraform_remote_state" "rds" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/rds/tf.state"
    region = var.region
  }
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

data "aws_secretsmanager_secret" "rds" {
  name = "db"
}

data "aws_secretsmanager_secret_version" "rds" {
  secret_id     = data.aws_secretsmanager_secret.rds.id
  version_stage = "AWSCURRENT"
}

data "aws_secretsmanager_secret" "rds_user" {
  name = "rds_root_account"
}

data "aws_secretsmanager_secret_version" "rds_user" {
  secret_id     = data.aws_secretsmanager_secret.rds_user.id
  version_stage = "AWSCURRENT"
}
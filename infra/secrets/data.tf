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

data "aws_eks_cluster" "cluster" {
  name = data.terraform_remote_state.eks.outputs.cluster_id
}

data "aws_eks_cluster_auth" "cluster" {
  name = data.terraform_remote_state.eks.outputs.cluster_id
}

data "aws_eks_cluster_auth" "oidc_provider_arn" {
  name = data.terraform_remote_state.eks.outputs.oidc_arn
}

data "aws_partition" "current" {}

# Can't get secret from account by arn with wildcard
# data "aws_secretsmanager_secret" "common" {
#   arn = "arn:aws:secretsmanager:${var.region}:303178480909:secret:secret-${lookup(var.secret_by_id, var.env)}-*"
# }

# data "aws_secretsmanager_secret_version" "common" {
#   secret_id     = data.aws_secretsmanager_secret.common.id
#   version_stage = "AWSCURRENT"
# }

data "aws_secretsmanager_secret" "rds" {
  name = "db"
}

data "aws_secretsmanager_secret_version" "rds" {
  secret_id     = data.aws_secretsmanager_secret.rds.id
  version_stage = "AWSCURRENT"
}

data "aws_secretsmanager_secret" "rds_backend" {
  name = "backend_db_user"
}

data "aws_secretsmanager_secret_version" "rds_backend" {
  secret_id     = data.aws_secretsmanager_secret.rds_backend.id
  version_stage = "AWSCURRENT"
}

#data "aws_secretsmanager_secret" "userpool" {
#  name = "cognito-email_${var.env}"
#}
#
#data "aws_secretsmanager_secret_version" "userpool" {
#  secret_id     = data.aws_secretsmanager_secret.userpool.id
#  version_stage = "AWSCURRENT"
#}

data "aws_secretsmanager_secret" "finch_integration" {
  name = "finch_integration_${var.env}"
}

data "aws_secretsmanager_secret_version" "finch_integration" {
  secret_id     = data.aws_secretsmanager_secret.finch_integration.id
  version_stage = "AWSCURRENT"
}

data "aws_secretsmanager_secret" "source1_integration" {
  name = "source1_integration_${var.env}"
}

data "aws_secretsmanager_secret_version" "source1_integration" {
  secret_id     = data.aws_secretsmanager_secret.source1_integration.id
  version_stage = "AWSCURRENT"
}

data "aws_secretsmanager_secret" "firebase_integration" {
  name = "firebase_integration_${var.env}"
}

data "aws_secretsmanager_secret_version" "firebase_integration" {
  secret_id     = data.aws_secretsmanager_secret.firebase_integration.id
  version_stage = "AWSCURRENT"
}

data "aws_secretsmanager_secret" "plaid_integration" {
  name = "plaid_integration_${var.env}"
}

data "aws_secretsmanager_secret_version" "plaid_integration" {
  secret_id     = data.aws_secretsmanager_secret.plaid_integration.id
  version_stage = "AWSCURRENT"
}

data "aws_secretsmanager_secret" "rds_root_account" {
  name = "rds_root_account"
}

data "aws_secretsmanager_secret_version" "rds_root_account" {
  secret_id     = data.aws_secretsmanager_secret.rds_root_account.id
  version_stage = "AWSCURRENT"
}
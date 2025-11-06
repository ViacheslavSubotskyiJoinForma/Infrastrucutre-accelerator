data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "tf-state-us-east-1-<ID>"
    key    = "${var.env}/vpc/tf.state"
    region = var.region
  }
}

data "aws_secretsmanager_secret" "rds_root_account" {
  name = "rds_root_account"
}

data "aws_secretsmanager_secret_version" "rds_root_account" {
  secret_id     = data.aws_secretsmanager_secret.rds_root_account.id
  version_stage = "AWSCURRENT"
}
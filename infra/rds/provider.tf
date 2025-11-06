terraform {
  required_version = ">= 1.2.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.23.0"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "1.21.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.region
  assume_role {
    role_arn = "arn:aws:iam::${var.account}:role/OrganizationAccountAccessRole"
  }
}

provider "postgresql" {
  host            = module.aurora.cluster_endpoint
  port            = module.aurora.cluster_port
  database        = "postgres"
  username        = jsondecode(data.aws_secretsmanager_secret_version.rds_root_account.secret_string)["master_username"]
  password        = jsondecode(data.aws_secretsmanager_secret_version.rds_root_account.secret_string)["master_password"]
  sslmode         = "require"
  connect_timeout = 15
  superuser       = false
}

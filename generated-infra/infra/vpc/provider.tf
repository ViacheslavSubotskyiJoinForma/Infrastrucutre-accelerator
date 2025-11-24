terraform {
  required_version = ">= 1.5.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region

  # Profile is optional - will use AWS credentials from environment if not set
  # This allows CI/CD to work with AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
  dynamic "assume_role" {
    for_each = var.aws_profile != "" && var.aws_profile != "default" ? [] : []
    content {}
  }

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.env
      ManagedBy   = "Terraform"
      Component   = "vpc"
      Repository  = var.repository
    }
  }

  # For local testing with named profiles, set aws_profile variable
  # For CI/CD, AWS credentials are provided via environment variables
  # For production with role assumption, uncomment:
  # assume_role {
  #   role_arn = "arn:aws:iam::${var.account}:role/OrganizationAccountAccessRole"
  # }
}
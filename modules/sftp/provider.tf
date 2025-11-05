terraform {
  required_version = ">= 1.2"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">=4.19.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = ">=3.3.0"
    }
    null = {
      source  = "hashicorp/null"
      version = ">=3.1.1"
    }
  }
}

variable "env" {}

variable "account" {}

variable "region" {
  default = "us-east-1"
}

variable "dns" {
  default = "ClientDomain.com"
}

variable "secret_by_id" {
  default = {
    dev  = "<ID>",
    uat  = "<ID>",
    prod = "<ID>"
  }
}

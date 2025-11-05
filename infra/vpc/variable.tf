variable "env" {}

variable "account" {}

variable "region" {
  default = "us-east-1"
}

variable "cidr" {
  type = map(any)
  default = {
    dev  = "10.1"
    uat  = "10.2"
    prod = "10.3"
  }
}

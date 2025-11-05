variable "env" {
  type = string
}

variable "account" {
  type = string
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "instances_dev" {
  type = map(any)
  default = {
    one = {}
  }
}
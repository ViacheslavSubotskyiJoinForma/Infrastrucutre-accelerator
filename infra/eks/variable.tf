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

variable "dns" {
  type    = string
  default = "ClientDomain.com"
}
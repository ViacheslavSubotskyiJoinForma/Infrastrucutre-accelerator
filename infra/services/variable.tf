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

variable "bucket_name" {
  type    = string
  default = "ses-for-cognito-us-east-1"
}

variable "platform_credential" {
  type    = string
  default = "<ID>"
}

variable "username" {
  type    = string
  default = "<ID>"
}

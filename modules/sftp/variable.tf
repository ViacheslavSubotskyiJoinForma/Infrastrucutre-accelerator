variable "user" {
  type = list(string)
}

variable "dns_name" {
  default = "<ClientDomain>.com"
}

variable "sftp_prefix_name" {
  default = "sftp"
}

variable "tags" {
  description = "A mapping of tags to assign to all resources"
  type        = map(string)
  default     = {}
}

variable "env" {}

variable "security_group_ids" {}

variable "aws_subnet_ids" {}

variable "vpc_id" {}

variable "kms_arn" {}
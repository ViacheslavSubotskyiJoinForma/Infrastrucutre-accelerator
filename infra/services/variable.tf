variable "env" {}

variable "account" {}

variable "region" {
  default = "us-east-1"
}

variable "dns" {
  default = "ClientDomain.com"
}

variable "user" {
  type    = list(string)
  default = ["source1"]
}

variable "user_source2" {
  type    = list(string)
  default = ["source2"]
}

variable "bucket_name" {
  default = "ses-for-cognito-us-east-1"
}

variable "platform_credential" {
  default = "<ID>"
}

variable "username" {
  default = "<ID>"
}

variable "resource_prefix" {
  type        = string
  default     = "ClientDomain"
  description = "This value is prepended to the resources created by this template"
}

variable "error_reporting_email" {
  type        = string
  default     = "augusto@ClientDomain.com"
  description = "Errors will be reported to this email address. Please confirm the subscription."
}

variable "zendesk_portal" {
  type        = string
  default     = "https://ClientDomain.zendesk.com"
  description = "In the form of https://YOUR_COMPANY.zendesk.com"
}

variable "zendesk_use_public_comments" {
  type        = bool
  default     = false
  description = "Enable posting of public comments/follow ups on Zendesk"
}

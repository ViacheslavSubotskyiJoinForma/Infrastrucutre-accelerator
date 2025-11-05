variable "env" {}

variable "account" {}

variable "region" {
  default = "us-east-1"
}

variable "elasticsearch_version" {
  default = "OpenSearch_2.11"
}

variable "enable_dedicated_master_nodes" {
  default = false
}
variable "master_node_type" {
  default = "t3.medium.elasticsearch"
}
variable "master_node_count" {
  default = 3
}

variable "data_node_type" {
  default = "t3.small.elasticsearch"
}

variable "data_node_type_prod" {
  default = "t3.medium.elasticsearch"
}
variable "data_node_count" {
  default = 3
}
variable "data_node_disk_size" {
  default = "75" # GBs
}

variable "enable_custom_endpoint" {
   default = false
}
variable "create_service_linked_role" {
   default = false
}

variable "dns" {
  default = "ClientDomain.com"
}

variable "lambda_names" {
  type        = list(string)
  default     = [
    "PostConfirmationLambdaTrigger", 
    "CustomMessageForgotPasswordLambdaTrigger", 
    "PreSignUpLambdaTrigger",
    "PreTokenGenerationLambdaTrigger"
  ]
}
variable "env" {}

variable "account" {}

variable "region" {
  default = "us-east-1"
}

variable "db_instance_id" {
  type        = string
  description = "RDS Instance ID"
  default     = "db-one"
}

variable "evaluation_period" {
  type        = string
  default     = "10"
  description = "The evaluation period over which to use when triggering alarms."
}

variable "statistic_period" {
  type        = string
  default     = "60"
  description = "The number of seconds that make each statistic period."
}

variable "instances_dev" {
  default = {
    one = {}
  }
}

variable "instances_prod" {
  default = {
    one = {}
    two = {}
  }
}
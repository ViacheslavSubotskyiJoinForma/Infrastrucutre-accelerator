variable "env" {}

variable "account" {}

variable "region" {
  default = "us-east-1"
}

variable "datapoints_to_alarm" {
  type = string
  description = "The number of datapoints that must be breaching to trigger the alarm"
  default = "2"
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
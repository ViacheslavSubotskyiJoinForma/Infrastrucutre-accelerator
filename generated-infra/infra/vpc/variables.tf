variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "test-format-check"
}

variable "env" {
  description = "Environment name (dev/uat/prod)"
  type        = string
}

variable "repository" {
  description = "Repository name for resource tagging"
  type        = string
  default     = "infrastructure-accelerator"
}

variable "region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS Profile for local authentication"
  type        = string
  default     = "default"
}

variable "cidr" {
  description = "CIDR blocks for each environment"
  type        = map(any)
  default = {
    dev  = "10.1"
    uat  = "10.2"
    prod = "10.3"
  }
}

variable "availability_zone_count" {
  description = "Number of Availability Zones (1-3)"
  type        = number
  default     = 3

  validation {
    condition     = var.availability_zone_count >= 1 && var.availability_zone_count <= 3
    error_message = "Availability zone count must be between 1 and 3."
  }
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs (requires IAM permissions). Set to false for local testing with limited IAM permissions."
  type        = bool
  default     = true
}
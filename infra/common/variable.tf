variable "env" {
  default = "common"
}

variable "region" {
  default = "us-east-1"
}

variable "agent_namespace" {
  default = "terraform"
}

# Accounts for grant access to ecr repo
variable "accounts" {
  type    = list(string)
  default = ["ID1", "ID2", "ID3"]
}

#variable "repo" {
#  type    = list(string)
#  default = ["backend", "aws-k8s", "maven-backend", "wiremock-server", "infra"]
#}

variable "repo" {
  type    = list(string)
  default = ["backend", "wiremock-server"]
}

variable "tags" {
  type    = map(any)
  default = {}
}

variable "dns" {
  default = "common.ClientDomain.com"
}

variable "vpc_cidr_block" {
  default = {
    dev  = "10.1.0.0/16",
    uat  = "10.2.0.0/16",
    prod = "10.3.0.0/16"
  }
}

variable "extra_cidr_block" {
  default = {
    source11      = "<ip>",
    source12      = "<ip>",
    ipua-for-test = "<ip>" ## use for check Your VPN IP
  }
}

variable "vpn_env_group" {
  default = {
    "dev-to-dev"    = { group_id = "<id>", cidr = "10.1.0.0/16" }, ## Access to DEV env dev group
    "admin-to-dev"  = { group_id = "<id>", cidr = "10.1.0.0/16" }, ## Access to DEV env admin group
    "dev-to-uat"    = { group_id = "<id>", cidr = "10.2.0.0/16" }, ## Access to UAT env dev group
    "admin-to-uat"  = { group_id = "<id>", cidr = "10.2.0.0/16" }, ## Access to UAT env admin gro
    "dev-to-prod"   = { group_id = "<id>", cidr = "10.3.0.0/16" }, ## Access to UAT env dev group
    "admin-to-prod" = { group_id = "<id>", cidr = "10.3.0.0/16" }, ## Access to UAT env admin gro
  }
}

variable "dev" {
  type = list(string)
  default = [
    "User1",
    "User3",
    "User4",
    "User5"
  ]
}

variable "retool_team" {
  default = {
    "User7@ClientDomain.com" = { first_name = "<>", last_name = "<>" },
    "User4@ClientDomain.com" = { first_name = "<>", last_name = "<>" },
    "User5@ClientDomain.com" = { first_name = "<>", last_name = "<>" },
    "User6@ClientDomain.com" = { first_name = "<>", last_name = "<>" },
  }
}

variable "datapoints_to_alarm" {
  type        = string
  description = "The number of datapoints that must be breaching to trigger the alarm"
  default     = "2"
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

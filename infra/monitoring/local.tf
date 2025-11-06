locals {
  tags = {
    Environment = var.env
    Terraform   = "true"
  }
  emails = [
    "User1@ClientDomain.com",
    "User2@ClientDomain.com"
  ]
  prom2msdev  = "<HOOK_URL>"
  prom2msuat  = "<HOOK_URL>"
  prom2msprod = "<HOOK_URL>"

  prod    = var.env == "prod" ? "${local.prom2msprod}" : ""
  uat     = var.env == "uat" ? "${local.prom2msuat}" : ""
  dev     = var.env == "dev" ? "${local.prom2msdev}" : ""
  prom2ms = coalesce(local.prod, local.uat, local.dev)

  slack_dev     = var.env == "dev" ? "<HOOK_URL>" : ""
  slack_uat     = var.env == "uat" ? "<HOOK_URL>" : ""
  slack_prod    = var.env == "prod" ? "<HOOK_URL>" : ""
  slack_api_url = coalesce(local.slack_dev, local.slack_uat, local.slack_prod)

  slack_chanel_dev  = var.env == "dev" ? "#backend-alerts-dev" : ""
  slack_chanel_uat  = var.env == "uat" ? "#backend-alerts-uat" : ""
  slack_chanel_prod = var.env == "prod" ? "#backend-alerts" : ""
  slack_chanel      = coalesce(local.slack_chanel_dev, local.slack_chanel_uat, local.slack_chanel_prod)



  #login:password@hostname:port/dbname
  pg_login    = jsondecode(data.aws_secretsmanager_secret_version.rds_user.secret_string)["master_username"]
  pg_password = jsondecode(data.aws_secretsmanager_secret_version.rds_user.secret_string)["master_password"]
  pg_hostname = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["endpoint"]
  pg_port     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["port"]
  pg_db       = jsondecode(data.aws_secretsmanager_secret_version.rds_user.secret_string)["master_username"]

  pg_connecion = "${local.pg_login}:${local.pg_password}@${local.pg_hostname}:${local.pg_port}/${local.pg_db}"
}
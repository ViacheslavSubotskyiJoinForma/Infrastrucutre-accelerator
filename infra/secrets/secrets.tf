resource "aws_secretsmanager_secret" "secret-env" {
  name = "backend_${var.env}"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "secret-env" {
  secret_id     = aws_secretsmanager_secret.secret-env.id
  secret_string = jsonencode(local.secret_megre)
}

resource "aws_secretsmanager_secret" "db-init" {
  name = "db-init_${var.env}"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "db-init" {
  secret_id = aws_secretsmanager_secret.db-init.id
  secret_string = jsonencode({
    "PGUSER"     = jsondecode(data.aws_secretsmanager_secret_version.rds_root_account.secret_string)["master_username"],
    "PGPASSWORD" = jsondecode(data.aws_secretsmanager_secret_version.rds_root_account.secret_string)["master_password"],
    "PGHOST"     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["endpoint"],
    "PGPORT"     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["port"]
  })
}

resource "aws_secretsmanager_secret" "wiremock-server" {
  count = var.env == "dev" ? 1 : 0
  name  = "wiremock-server"
  tags  = local.tags
}

resource "aws_secretsmanager_secret_version" "wiremock-server" {
  count     = var.env == "dev" ? 1 : 0
  secret_id = aws_secretsmanager_secret.wiremock-server[0].id
  secret_string = jsonencode({
    "ClientDomain_MOCK_DB_USERNAME" = jsondecode(data.aws_secretsmanager_secret_version.rds_root_account.secret_string)["master_username"],
    "ClientDomain_MOCK_DB_PASS"     = jsondecode(data.aws_secretsmanager_secret_version.rds_root_account.secret_string)["master_password"],
    "ClientDomain_MOCK_DB_URL"      = "jdbc:postgresql://${jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["endpoint"]}:5432/"
  })
}
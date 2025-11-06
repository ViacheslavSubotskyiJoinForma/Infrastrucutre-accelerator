locals {
  secrets   = "external-secrets"
  partition = data.aws_partition.current.partition
  dns_name  = var.env == "prod" ? "${var.dns}" : "${var.env}.${var.dns}"
  cors_url  = var.env == "dev" ? "http://localhost:3000,https://admin.${local.dns_name}" : "https://admin.${local.dns_name}"
  tags = {
    Environment = var.env
    Terraform   = "true"
    account     = local.partition
  }
  secret_all = {
    "ClientDomain_DB_USER"                           = jsondecode(data.aws_secretsmanager_secret_version.rds_backend.secret_string)["username"],
    "ClientDomain_DB_PASSWORD"                       = jsondecode(data.aws_secretsmanager_secret_version.rds_backend.secret_string)["password"],
    "ClientDomain_DB_URL"                            = "jdbc:postgresql://${jsondecode(data.aws_secretsmanager_secret_version.rds_backend.secret_string)["endpoint"]}:${jsondecode(data.aws_secretsmanager_secret_version.rds_backend.secret_string)["port"]}/${jsondecode(data.aws_secretsmanager_secret_version.rds_backend.secret_string)["dbname"]}",
    "EMAIL_USER_POOL_ID"                             = data.terraform_remote_state.services.outputs.email_user_pool_id,
    "EMAIL_USER_POOL_CLIENT_ID"                      = data.terraform_remote_state.services.outputs.email_user_pool_id_client_id,
    "PHONE_USER_POOL_ID"                             = data.terraform_remote_state.services.outputs.phone_user_pool_id,
    "PHONE_USER_POOL_CLIENT_ID"                      = data.terraform_remote_state.services.outputs.phone_user_pool_id_client_id,
    "CORS_ALLOWED_ORIGINS"                           = local.cors_url,
    "REGION"                                         = var.region,
    "SPRING_PROFILES_ACTIVE"                         = "${var.env}",
    "FINCH_CLIENT_ID"                                = jsondecode(data.aws_secretsmanager_secret_version.finch_integration.secret_string)["FINCH_CLIENT_ID"],
    "FINCH_CLIENT_SECRET"                            = jsondecode(data.aws_secretsmanager_secret_version.finch_integration.secret_string)["FINCH_CLIENT_SECRET"],
    "SOURCE1_API_TRANS_KEY"                          = jsondecode(data.aws_secretsmanager_secret_version.source1_integration.secret_string)["SOURCE1_API_TRANS_KEY"],
    "SOURCE1_API_LOGIN"                              = jsondecode(data.aws_secretsmanager_secret_version.source1_integration.secret_string)["SOURCE1_API_LOGIN"],
    "SOURCE1_PROVIDER_ID"                            = jsondecode(data.aws_secretsmanager_secret_version.source1_integration.secret_string)["SOURCE1_PROVIDER_ID"],
    "SOURCE1_SECURITY_ENABLED"                       = jsondecode(data.aws_secretsmanager_secret_version.source1_integration.secret_string)["SOURCE1_SECURITY_ENABLED"],
    "SOURCE1_API_URL"                                = jsondecode(data.aws_secretsmanager_secret_version.source1_integration.secret_string)["SOURCE1_API_URL"],
    "SOURCE1_PUBLIC_KEY"                             = jsondecode(data.aws_secretsmanager_secret_version.source1_integration.secret_string)["SOURCE1_PUBLIC_KEY"],
    "SOURCE1_FORCE_SETL_RETRY_COUNT"                 = jsondecode(data.aws_secretsmanager_secret_version.source1_integration.secret_string)["SOURCE1_FORCE_SETL_RETRY_COUNT"],
    "SOURCE1_ASSET_URL"                              = jsondecode(data.aws_secretsmanager_secret_version.source1_integration.secret_string)["SOURCE1_ASSET_URL"],
    "SOURCE1_EVENT_LOGGING_ENABLED"                  = "true",
    "SOURCE1_TRANSFER_ADJUSTMENT_TYPE"               = "j1",
    "FIREBASE_GOOGLE_CREDENTIALS"                    = jsondecode(data.aws_secretsmanager_secret_version.firebase_integration.secret_string)["FIREBASE_GOOGLE_CREDENTIALS"],
    "FIREBASE_DYNAMIC_LINK_SUB_DOMAIN"               = jsondecode(data.aws_secretsmanager_secret_version.firebase_integration.secret_string)["FIREBASE_DYNAMIC_LINK_SUB_DOMAIN"],
    "APPLICATION_DOMAIN"                             = "api.${local.dns_name}",
    "FRONTEND_DOMAIN"                                = "admin.${local.dns_name}",
    "APPLICATION_DESKTOP_FALLBACK_URL"               = "https://admin.${local.dns_name}/confirm-email",
    "APP_PACKAGE_NAME_ANDROID"                       = jsondecode(data.aws_secretsmanager_secret_version.firebase_integration.secret_string)["APP_PACKAGE_NAME_ANDROID"],
    "APP_PACKAGE_NAME_IOS"                           = jsondecode(data.aws_secretsmanager_secret_version.firebase_integration.secret_string)["APP_PACKAGE_NAME_IOS"],
    "APPLICATION_APPLE_STORE_ID"                     = jsondecode(data.aws_secretsmanager_secret_version.firebase_integration.secret_string)["APPLICATION_APPLE_STORE_ID"],
    "PLAID_CLIENT_ID"                                = jsondecode(data.aws_secretsmanager_secret_version.plaid_integration.secret_string)["PLAID_CLIENT_ID"],
    "PLAID_SECRET"                                   = jsondecode(data.aws_secretsmanager_secret_version.plaid_integration.secret_string)["PLAID_SECRET"],
    "PLAID_TEMPLATE_ID"                              = jsondecode(data.aws_secretsmanager_secret_version.plaid_integration.secret_string)["PLAID_TEMPLATE_ID"],
    "PLAID_ENV"                                      = jsondecode(data.aws_secretsmanager_secret_version.plaid_integration.secret_string)["PLAID_ENV"],
    "PLAID_API_VERSION"                              = jsondecode(data.aws_secretsmanager_secret_version.plaid_integration.secret_string)["PLAID_API_VERSION"],
    "PLAID_LINK_AUTH_WEBHOOK_URL"                    = "https://api.ClientDomain.com/integration/plaid/webhook/bank-verification",
    "ENC_KEY"                                        = random_password.encryption_key.result,
    "ENC_SALT"                                       = sha1(random_password.encryption_key.result),
    "ENC_VECTOR"                                     = substr(md5(random_password.encryption_key.result), 0, 16),
    "COGNITO_CLEAN_JOB_CHUNK_USERS_LIMIT"            = "25",
    "COGNITO_CLEAN_JOB_DELAY_BETWEEN_CHUNKS"         = "30",
    "COGNITO_CLEAN_JOB_DEPRECATION_PERIOD"           = "7",
    "RDS_CLEAN_JOB_CHUNK_USERS_LIMIT"                = "25",
    "RDS_CLEAN_JOB_DELAY_BETWEEN_CHUNKS"             = "30",
    "RDS_CLEAN_JOB_DEPRECATION_PERIOD"               = "7",
    "AWS_SES_SENDER"                                 = "ClientDomain Support <no-reply@${local.dns_name}>",
    "SOURCE1_TRANSFER_FUNDS_EXECUTOR_TASK_POOL_SIZE" = "1",
    "SOURCE1_TRANSFER_FUNDS_EXECUTOR_MAX_POOL_SIZE"  = "1",
    "COMPANY_CENSUS_BUCKET_NAME"                     = "ClientDomain-company-census-${var.env}",
    "COMPANY_LOGO_BUCKET_NAME"                       = "ClientDomain-company-logos-${var.env}",
  }
  secret_dev = {
    "MIDDLE_MONTH_PAYMENT_DAY"           = "15",
    "ClientDomain_STATEMENT_DAYS-AMOUNT" = "5",
    "NEAREST_LAST_PAYROLL_DATE"          = "2023-02-22",
    "NEAREST_NEXT_PAYROLL_DATE"          = "2023-02-24"

  }
  secret_megre = var.env == "dev" ? merge(local.secret_all, local.secret_dev) : local.secret_all
}

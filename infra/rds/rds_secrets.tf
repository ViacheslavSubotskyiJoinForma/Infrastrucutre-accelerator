module "secrets-manager" {
  source  = "lgallard/secrets-manager/aws"
  version = "0.10.1"

  secrets = {
    db = {
      description = "RDS secrets"
      secret_key_value = {
        endpoint = module.aurora.cluster_endpoint
        port     = module.aurora.cluster_port
        dbname   = module.aurora.cluster_database_name
        arn      = module.aurora.cluster_arn
      }
      recovery_window_in_days = 7
    }
    backend_db_user = {
      description = "RDS secrets backend user"
      secret_key_value = {
        password = random_password.backend.result
        username = postgresql_role.backend.name
        endpoint = module.aurora.cluster_endpoint
        port     = module.aurora.cluster_port
        dbname   = module.aurora.cluster_database_name
      }
      recovery_window_in_days = 7
    }
  }
  tags = local.tags
}
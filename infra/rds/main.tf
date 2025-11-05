module "aurora" {
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "8.5.0"

  name           = "db"
  engine         = "aurora-postgresql"
  engine_version = "14.9"
  #instance_class = var.env == "dev" ? "db.t4g.medium" : "db.t4g.large"
  instance_class = "db.t4g.medium"
  #instances      = var.env == "dev" ? var.instances_dev : var.instances_prod
  instances      = var.instances_dev

  iam_database_authentication_enabled = true
  manage_master_user_password         = false
  master_username                     = jsondecode(data.aws_secretsmanager_secret_version.rds_root_account.secret_string)["master_username"]
  master_password                     = jsondecode(data.aws_secretsmanager_secret_version.rds_root_account.secret_string)["master_password"]
  database_name                       = "root"

  port = 5432

  autoscaling_enabled      = true
  autoscaling_min_capacity = 1
  autoscaling_max_capacity = 3

  vpc_id                  = data.terraform_remote_state.vpc.outputs.vpc_id
  subnets                 = data.terraform_remote_state.vpc.outputs.database_subnets
    security_group_rules = {
    common_ip_ingress = {
      cidr_blocks = [data.terraform_remote_state.vpc.outputs.cidr_blocks, "10.10.0.0/16"]
    }
  }

  storage_encrypted   = true
  apply_immediately   = true
  monitoring_interval = 10

  db_parameter_group_name         = aws_db_parameter_group.db.id
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.db.id
  create_db_subnet_group          = true

  enabled_cloudwatch_logs_exports = ["postgresql"]

  preferred_backup_window      = "02:00-03:00"
  backup_retention_period      = var.env == "prod" ? 30 : 7
  preferred_maintenance_window = "sun:05:00-sun:06:00"
  publicly_accessible          = false
  deletion_protection          = var.env == "dev" ? false : true
  ca_cert_identifier           = "rds-ca-rsa2048-g1"

  tags = merge(
    local.tags,
    {
      VantaContainsUserData = "true"
    }
  )
}

resource "aws_db_parameter_group" "db" {
  name        = "db"
  family      = "aurora-postgresql14"
  description = "db"
  tags        = local.tags
}

resource "aws_rds_cluster_parameter_group" "db" {
  name        = "db"
  family      = "aurora-postgresql14"
  description = "db"
  tags        = local.tags
}

resource "aws_cloudwatch_dashboard" "rds" {
  dashboard_name = "RDS-Dashboard"
  dashboard_body = "${file("${path.module}/files/dashboard-body.json")}"
}
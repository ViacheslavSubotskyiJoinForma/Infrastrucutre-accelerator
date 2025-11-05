module "postgresql" {
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "8.5.0" 

  name           = "common"
  engine         = "aurora-postgresql"
  engine_version = "14.9"
  instance_class = "db.t4g.medium"
  instances = {
    one = {}
  }

  iam_database_authentication_enabled = true
  #create_random_password              = false
  manage_master_user_password         = false
  database_name                       = "common"
  master_username                     = "common"
  master_password                     = random_password.password.result


  port = 5432

  autoscaling_enabled      = true
  autoscaling_min_capacity = 1
  autoscaling_max_capacity = 2

  vpc_id                  = module.vpc.vpc_id
  subnets                 = module.vpc.private_subnets
  create_db_subnet_group  = true
  security_group_rules = {
    common_ip_ingress = {
      cidr_blocks = ["10.10.0.0/16"]
    }
    common_ingress = {
      source_security_group_id = module.security_group.security_group_id
    }
  }


  storage_encrypted   = true
  apply_immediately   = true
  monitoring_interval = 10

  db_parameter_group_name         = "common"
  db_cluster_parameter_group_name = "common"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  preferred_backup_window      = "02:00-03:00"
  preferred_maintenance_window = "sun:05:00-sun:06:00"
  publicly_accessible          = false
  ca_cert_identifier           = "rds-ca-rsa2048-g1"

  tags = local.tags
}

resource "random_password" "password" {
  length  = 16
  special = true
}

resource "aws_ssm_parameter" "db" {
  name        = "/${var.env}/database/password/master"
  description = "Master password for common"
  type        = "SecureString"
  value       = random_password.password.result

  tags = {
    Environment = var.env
  }
}

module "security_group_rds" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.0" 

  name   = "db-sg-module"
  vpc_id = module.vpc.vpc_id

  # ingress
  ingress_with_cidr_blocks = [
    {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      description = "PostgreSQL access from within VPC"
      cidr_blocks = module.vpc.vpc_cidr_block
    },
  ]
  egress_with_cidr_blocks = [
    {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      description = "PostgreSQL access from within VPC"
      cidr_blocks = module.vpc.vpc_cidr_block
    }
  ]

  tags = local.tags
}


resource "postgresql_role" "rds_rw_iam" {
  name  = "rwiam"
  login = true
  roles = ["rds_iam"]
}

resource "postgresql_grant" "rds_rw_iam" {
  database    = module.aurora.cluster_database_name
  role        = postgresql_role.rds_rw_iam.name
  schema      = "public"
  object_type = "table"
  privileges  = ["SELECT", "INSERT", "UPDATE", "DELETE"]
}

resource "postgresql_grant" "rds_rw_iam_schema" {
  database    = module.aurora.cluster_database_name
  role        = postgresql_role.rds_rw_iam.name
  schema      = "public"
  object_type = "schema"
  privileges  = ["USAGE"]
}

resource "postgresql_grant" "rds_rw_iam_sequence" {
  database    = module.aurora.cluster_database_name
  role        = postgresql_role.rds_rw_iam.name
  schema      = "public"
  object_type = "sequence"
  privileges  = ["SELECT"]
}

resource "aws_iam_role" "rds_rw_iam_role" {
  name = "RDS-RW-IAM-Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.account}:root"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy" "rds_rw_iam_policy" {
  name = "RDS-RW-IAM-Policy"
  role = aws_iam_role.rds_rw_iam_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = "rds-db:connect"
        Resource = "arn:aws:rds-db:${var.region}:${var.account}:dbuser:*/${postgresql_role.rds_rw_iam.name}"
        Effect   = "Allow"
      },
    ]
  })
}

resource "postgresql_role" "backend_ro" {
  name                = "backend_ro"
  login               = true
  roles               = ["rds_iam"]
  skip_drop_role      = true
  skip_reassign_owned = true
}

resource "postgresql_grant" "grant_backend_ro_schema" {
  database    = "root"
  schema      = "public"
  role        = "backend_ro"
  object_type = "schema"
  privileges  = ["USAGE"]
}

resource "postgresql_grant" "grant_backend_ro_select" {
  database    = "root"
  schema      = "public"
  role        = "backend_ro"
  object_type = "table"
  privileges  = ["SELECT"]
}

resource "random_password" "backend" {
  length           = 17
  special          = true
  override_special = "_%@"
}

resource "postgresql_role" "backend" {
  name       = "backend"
  password   = random_password.backend.result
  login      = true
  depends_on = [module.aurora]
}

#resource "null_resource" "set_owner_root" {
#  depends_on = [postgresql_role.backend]
#
#  provisioner "local-exec" {
#    command = "PGPASSWORD=${module.aurora.cluster_master_password} psql -U ${module.aurora.cluster_master_username} -h ${module.aurora.cluster_endpoint} -p ${module.aurora.cluster_port} -c \"ALTER DATABASE root OWNER TO ${postgresql_role.backend.name};\""
#  }
#}

resource "postgresql_grant" "grant_backend_rw_schema" {
  database    = module.aurora.cluster_database_name
  role        = postgresql_role.backend.name
  schema      = "public"
  object_type = "schema"
  privileges  = ["CREATE", "USAGE"]
}

resource "postgresql_grant" "backend_all_table" {
  database    = module.aurora.cluster_database_name
  role        = postgresql_role.backend.name
  schema      = "public"
  object_type = "table"
  privileges  = ["DELETE", "INSERT", "REFERENCES", "SELECT", "TRIGGER", "TRUNCATE", "UPDATE", ]
  depends_on  = [postgresql_role.backend]
}

resource "postgresql_grant" "backend_all_sequence" {
  database    = module.aurora.cluster_database_name
  role        = postgresql_role.backend.name
  schema      = "public"
  object_type = "sequence"
  privileges  = ["USAGE", "SELECT", "UPDATE"]
  depends_on  = [postgresql_role.backend]
}
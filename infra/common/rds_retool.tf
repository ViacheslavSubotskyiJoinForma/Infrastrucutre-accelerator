resource "random_password" "retool_password" {
  length           = 16
  special          = true
  override_special = "_%@"
}

resource "postgresql_role" "retool_user" {
  name       = "retool"
  password   = random_password.retool_password.result
  login      = true
  depends_on = [module.postgresql]
}

resource "postgresql_database" "retool_db" {
  name              = "retool"
  owner             = postgresql_role.retool_user.name
  template          = "template0"
  lc_collate        = "C"
  connection_limit  = -1
  allow_connections = true
  depends_on = [
    module.postgresql,
    postgresql_role.retool_user
  ]
}
resource "okta_app_oauth" "firezone" {
  label                     = var.env
  type                      = "web"
  grant_types               = ["authorization_code"]
  redirect_uris             = ["${local.vpn}auth/oidc/okta/callback/"]
  post_logout_redirect_uris = [local.vpn]
  login_uri                 = local.okta_url
  response_types            = ["code"]

  groups_claim {
    type        = "FILTER"
    filter_type = "REGEX"
    name        = "groups"
    value       = ".*"
  }
  lifecycle {
    ignore_changes = [
      #groups, 
      #users,
      post_logout_redirect_uris,
      redirect_uris
    ]

  }
}

resource "okta_user" "dev" {
  for_each             = toset(var.dev)
  first_name           = element(split(".", each.key), 0)
  last_name            = element(split(".", each.key), 1)
  email                = lookup(local.custom_emails, each.key, "${each.key}@${local.email}")
  login                = lookup(local.custom_emails, each.key, "${each.key}@${local.email}")
  department           = "dev"
  password_inline_hook = "default"
  organization         = "ClientDomain"

  #lifecycle {
  #  ignore_changes = [
  #    status
  #  ]
  #}
}

resource "okta_user" "retool" {
  for_each             = var.retool_team
  first_name           = each.value.first_name
  last_name            = each.value.last_name
  email                = each.key
  login                = each.key
  department           = "retool"
  password_inline_hook = "default"

  lifecycle {
    ignore_changes = [
      status
    ]
  }
}

resource "okta_group" "retool" {
  name = "retool-firezone"
}
resource "okta_group" "dev" {
  name = "dev-firezone"
}

resource "okta_group" "admin" {
  name = "admin-firezone"
}

resource "okta_app_group_assignments" "group_assignments" {
  app_id = okta_app_oauth.firezone.id
  group {
    id       = okta_group.admin.id
    priority = 1
  }
  group {
    id       = okta_group.dev.id
    priority = 2
  }
  group {
    id       = okta_group.retool.id
    priority = 3
  }

  depends_on = [
    okta_app_oauth.firezone,
    okta_group.admin,
    okta_group.dev,
    okta_group.retool
  ]
}

resource "okta_group_memberships" "admin" {
  group_id = okta_group.admin.id
  users    = data.okta_users.admin.users[*].id
  lifecycle {
    ignore_changes = [users]
  }
}

resource "okta_group_memberships" "dev" {
  group_id = okta_group.dev.id
  users    = data.okta_users.dev.users[*].id
}

resource "okta_group_memberships" "retool" {
  group_id = okta_group.retool.id
  users    = data.okta_users.retool.users[*].id
}

data "okta_users" "admin" {
  search {
    name       = "profile.organization"
    value      = "ClientDomain"
    comparison = "eq"
  }
}

data "okta_users" "dev" {
  search {
    name       = "profile.department"
    value      = "dev"
    comparison = "eq"
  }
  depends_on = [
    okta_user.dev
  ]
}

data "okta_users" "retool" {
  search {
    name       = "profile.department"
    value      = "retool"
    comparison = "eq"
  }
  depends_on = [
    okta_user.retool
  ]
}
resource "aws_secretsmanager_secret" "firezone" {
  description = "Credentials from okta"
  name        = "firezone"
  tags       = local.tags
}

resource "aws_secretsmanager_secret_version" "firezone" {
  secret_id     = aws_secretsmanager_secret.firezone.id
  secret_string = <<EOF
{
    "client_id" : "${okta_app_oauth.firezone.client_id}",
    "client_secret" : "${okta_app_oauth.firezone.client_secret}"
}
EOF
  lifecycle {
      ignore_changes = [
        secret_string
      ]
  }
}

resource "okta_app_oauth" "grafana" {
  label                     = "grafana"
  type                      = "web"
  grant_types               = ["authorization_code"]
  redirect_uris             = ["${local.grafana}login/okta"]
  post_logout_redirect_uris = ["${local.grafana}login/okta"]
  login_uri                 = local.okta_url
  response_types            = ["code"]

  groups_claim {
    type        = "FILTER"
    filter_type = "REGEX"
    name        = "groups"
    value       = ".*"
  }
  #lifecycle {
  #    ignore_changes = [
  #      groups
  #    ]
  #}
}

resource "aws_secretsmanager_secret" "grafana" {
  description = "Credentials from okta"
  name        = "grafana"
  tags        = local.tags
}

resource "aws_secretsmanager_secret_version" "grafana" {
  secret_id     = aws_secretsmanager_secret.grafana.id
  secret_string = <<EOF
{
    "client_id" : "${okta_app_oauth.grafana.client_id}",
    "client_secret" : "${okta_app_oauth.grafana.client_secret}"
}
EOF
  lifecycle {
      ignore_changes = [
        secret_string
      ]
  }
}

resource "okta_app_group_assignments" "group_assignments_grafana" {
  app_id = okta_app_oauth.grafana.id
  group {
    id       = okta_group.admin.id
    priority = 1
  }
  group {
    id       = okta_group.dev.id
    priority = 2
  }

  depends_on = [
    okta_app_oauth.grafana,
    okta_group.admin,
    okta_group.dev
  ]
}

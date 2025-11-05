resource "aws_cognito_user_pool_domain" "email_domain" {
  domain       = "${var.env}-email"
  user_pool_id = aws_cognito_user_pool.email.id
}

resource "aws_cognito_user_pool" "email" {
  name = "${var.env}-email"

  mfa_configuration = "OFF"

  auto_verified_attributes = ["email"]

  lifecycle {
    ignore_changes = [
      auto_verified_attributes,
      schema,
      lambda_config,
      admin_create_user_config
    ]
  }
  alias_attributes = ["email"]

  email_configuration {
    email_sending_account  = "DEVELOPER"
    source_arn             = aws_ses_domain_identity.domain.arn
    from_email_address     = "ClientDomain Admin <ClientDomainadmin@${local.email_cognito}>" # mandatory field
    reply_to_email_address = "ClientDomainadmin@${local.email_cognito}" # mandatory field
  }
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }


  username_configuration {
    case_sensitive = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false

    invite_message_template {
      email_subject = "Welcome to ClientDomain!" # mandatory field
      email_message = templatefile("cognito/invitation-template.html", {
        admin_url_con  = local.admin_url
      })
      sms_message   = "Your username is {username}. Sign up at {####}" # mandatory field
    }
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  schema {
    name                     = "given_name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "family_name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "org_node_id"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "permissions"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "date_of_birth"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }
  lambda_config {
    pre_token_generation = data.terraform_remote_state.pre_token.outputs.pretoken_arn
    post_confirmation    = data.terraform_remote_state.post_confirmation.outputs.postconfirmation_arn
  }
  
  tags = local.tags

  depends_on = [
      aws_ses_receipt_rule.store
  ]
}


resource "aws_cognito_user_pool_domain" "phone_domain" {
  domain       = "${var.env}-phone"
  user_pool_id = aws_cognito_user_pool.phone.id
}

resource "aws_cognito_user_pool" "phone" {
  name = "${var.env}-phone"

  mfa_configuration = "OFF"

  alias_attributes = ["phone_number"]
  auto_verified_attributes = ["phone_number"]
  lifecycle {
    ignore_changes = [
      auto_verified_attributes,
      admin_create_user_config,
      schema,
      sms_configuration
    ]
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    sms_message          = "Use code: {####} as your ClientDomain verification code. Please do not share this code. This code is valid for 24 hours."
  }

  username_configuration {
    case_sensitive = false
  }

  sms_configuration {
    external_id    = local.external_id
    sns_caller_arn = aws_iam_role.CognitoSender.arn
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  schema {
    name                     = "given_name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "family_name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "phone_number"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "org_node_id"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "permissions"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "date_of_birth"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }
  lambda_config {
    pre_token_generation = data.terraform_remote_state.pre_token.outputs.pretoken_arn
    post_confirmation    = data.terraform_remote_state.post_confirmation.outputs.postconfirmation_arn
    #pre_sign_up          = data.terraform_remote_state.pre_signup.outputs.presignup_arn
    custom_message       = data.terraform_remote_state.custom_message_forgot_password.outputs.custom_message_forgot_password_arn
  }

  tags = local.tags

}

resource "random_id" "external" {
  byte_length = 16
}

data "aws_iam_policy_document" "cognito-role-policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["cognito-idp.amazonaws.com"]
    }

    # condition {
    #   test     = "ForAnyValue:StringEquals"
    #   variable = "sts:ExternalId"
    #   values   = [local.external_id]
    # }
  }
}

resource "aws_iam_role" "CognitoSender" {
  name                = "CognitoSender"
  path                = "/service-role/"
  assume_role_policy  = data.aws_iam_policy_document.cognito-role-policy.json
  managed_policy_arns = [aws_iam_policy.cognito.arn]
  tags                = local.tags
}

resource "aws_iam_policy" "cognito" {
  name = "cognito"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["sns:publish"]
        Effect   = "Allow"
        Resource = "*"
      },
    ]
  })
}

resource "aws_cognito_user_pool_client" "autotest" {
  name                                 = "client_connect"
  user_pool_id                         = aws_cognito_user_pool.email.id
  access_token_validity                = 30
  allowed_oauth_flows_user_pool_client = true
  id_token_validity                    = 30
  callback_urls                        = ["https://localhost"]
  prevent_user_existence_errors        = "ENABLED"
  allowed_oauth_scopes = [
    "email",
    "openid",
    "profile",
  ]
  explicit_auth_flows  = [
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]
  read_attributes      = [
    "custom:date_of_birth",
    "custom:org_node_id",
    "custom:permissions",
    "email",
    "email_verified",
    "family_name",
    "given_name",
  ]
  supported_identity_providers = [
    "COGNITO",
  ]
  write_attributes     = [
    "custom:date_of_birth",
    "custom:org_node_id",
    "custom:permissions",
    "email",
    "family_name",
    "given_name",
  ]
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
  allowed_oauth_flows = [
     "code",
     "implicit",
  ]
  depends_on = [
    aws_cognito_user_pool.email
  ]
}

resource "aws_cognito_user_pool_client" "postman" {
  name                                 = "client_connect"
  user_pool_id                         = aws_cognito_user_pool.phone.id
  access_token_validity                = 60
  allowed_oauth_flows_user_pool_client = true
  id_token_validity                    = 60
  callback_urls                        = ["https://localhost"]
  prevent_user_existence_errors        = "ENABLED"
  allowed_oauth_flows  = [
     "code",
     "implicit",
  ]
  explicit_auth_flows  = [
     "ALLOW_ADMIN_USER_PASSWORD_AUTH",
     "ALLOW_REFRESH_TOKEN_AUTH",
     "ALLOW_USER_SRP_AUTH",
  ]
  read_attributes      = [
     "custom:date_of_birth",
     "custom:org_node_id",
     "custom:permissions",
     "family_name",
     "given_name",
     "phone_number",
     "phone_number_verified",
  ]
  supported_identity_providers = [
     "COGNITO",
  ]
  write_attributes             = [
     "custom:date_of_birth",
     "custom:org_node_id",
     "custom:permissions",
     "family_name",
     "given_name",
     "phone_number",
  ]
  token_validity_units {
     access_token  = "minutes"
     id_token      = "minutes"
     refresh_token = "days"
  }
  allowed_oauth_scopes = [
     "openid",
     "phone",
     "profile",
  ]
  depends_on = [
    aws_cognito_user_pool.phone
  ]
}

#module "secrets-manager" {
#  source  = "lgallard/secrets-manager/aws"
#  version = "0.5.2"
#  
#  secrets = {
#    "cognito-email_${var.env}" = {
#      description        = "Cognito email pool secrets"
#      secret_key_value   = {
#        USER_POOL_ID            = aws_cognito_user_pool.email.id
#        USER_POOL_WEB_CLIENT_ID = aws_cognito_user_pool_client.autotest.id
#      }
#      recovery_window_in_days = 7
#    }
#  }
#  tags = local.tags
#  depends_on = [
#    aws_cognito_user_pool.email,
#    aws_cognito_user_pool_client.autotest
#  ]
#}

resource "aws_cognito_user" "zero_user" {
  user_pool_id = aws_cognito_user_pool.email.id
  username     = var.username
  password     = random_password.password.result

  attributes = {
    org_node_id        = "0"
    permissions        = "[1,2,5,6,7,16,22,24,26,27,28,30,34,39,40,41,43]"
    email              = local.email
    email_verified     = true
    family_name        = "superuser"
    given_name         = "superuser"
  }
  lifecycle {
    ignore_changes = [
      attributes
    ]
  }
}

resource "random_password" "password" {
  length           = 9
  special          = true
  override_special = "/"
  min_lower        = 1
  min_upper        = 1
  min_special      = 1
  min_numeric      = 1
}

module "zero_user" {
  source  = "lgallard/secrets-manager/aws"
  version = "0.10.1"
  
  secrets = {
    "zero-user" = {
      description        = "Zero user secret"
      secret_key_value   = {
        USER_UUID            = aws_cognito_user.zero_user.username
        USER_PASSWORD        = random_password.password.result
      }
      recovery_window_in_days = 7
    }
  }
  tags = local.tags

  depends_on = [
    aws_cognito_user_pool.email
  ]
}

resource "null_resource" "zero_user_setup" {
  provisioner "local-exec" {
    command     = "psql -h ${local.endpoint} -p ${local.port} -U ${local.user} -d ${local.db} -c \"insert INTO public.user (role_id, owner_node_id, email, first_name, last_name, status, id) values (1, 0, '${local.email}', 'supperuser', 'supperuser', 'PENDING_CONFIRMATION', '${var.username}') ON CONFLICT DO NOTHING\""
    environment = {
      PGPASSWORD = local.master-password
    }
  }
  #triggers = {
  #  always_run = "${timestamp()}"
  #}
}
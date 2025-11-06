module "eks_role" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  role_description              = "Role wtih access to AWS Services from EKS"
  version                       = "5.30.1"
  create_role                   = true
  role_name                     = "backend-role"
  provider_url                  = replace(data.terraform_remote_state.eks.outputs.issuer_url, "https://", "")
  oidc_fully_qualified_subjects = ["system:serviceaccount:${var.env}:backend"]

  role_policy_arns = [
    module.cognito_policy.policy_arn,
    module.ses_policy.policy_arn,
    module.kms_policy.policy_arn
  ]
}

module "cognito_policy" {
  source  = "cloudposse/iam-policy/aws"
  version = "2.0.1"

  name               = "CognitoPolicy"
  enabled            = true
  iam_policy_enabled = true

  iam_policy_statements = {
    CognitoPolicyEmail = {
      effect = "Allow"
      actions = [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:adminDeleteUser",
        "cognito-idp:ListUsers",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminRespondToAuthChallenge",
        "cognito-idp:AdminUserGlobalSignOut"
      ]
      resources  = [aws_cognito_user_pool.email.arn]
      conditions = []
    }
    CognitoPolicyPhone = {
      effect = "Allow"
      actions = [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:adminDeleteUser",
        "cognito-idp:ListUsers",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminRespondToAuthChallenge",
        "cognito-idp:AdminUserGlobalSignOut"
      ]
      resources  = [aws_cognito_user_pool.phone.arn]
      conditions = []
    }
  }
  tags = local.tags
}

module "ses_policy" {
  source  = "cloudposse/iam-policy/aws"
  version = "2.0.1"

  name               = "SESPolicy"
  enabled            = true
  iam_policy_enabled = true

  iam_policy_statements = {
    SESPolicy = {
      effect = "Allow"
      actions = [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail",
        "ses:SendBulkTemplatedEmail",
      ]
      resources  = ["*"]
      conditions = []
    }
  }
  tags = local.tags
}

module "kms_policy" {
  source  = "cloudposse/iam-policy/aws"
  version = "2.0.1"

  name               = "KMSPolicy"
  enabled            = true
  iam_policy_enabled = true

  iam_policy_statements = {
    KMSPolicy = {
      effect = "Allow"
      actions = [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey*"
      ]
      resources  = [aws_kms_key.s3_key.arn]
      conditions = []
    }
  }
  tags = local.tags
}
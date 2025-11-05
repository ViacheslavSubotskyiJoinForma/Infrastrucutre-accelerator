# Chart https://github.com/external-secrets/external-secrets/tree/main/deploy/charts/external-secrets
resource "helm_release" "external-secrets" {
  name    = local.secrets
  version = "0.5.8"

  namespace        = local.secrets
  create_namespace = true

  repository = "https://charts.external-secrets.io"
  chart      = local.secrets

  set {
    name  = "crds.createClusterSecretStore"
    value = "false"
  }
  set {
    name  = "processClusterStore"
    value = "false"
  }
  set {
    name  = "certController.create"
    value = "false"
  }
  set {
    name  = "serviceAccount.create"
    value = true
  }
  set {
    name  = "webhook.create"
    value = false
  }
  set {
    name  = "serviceAccount.name"
    value = module.external_secrets.iam_role_name
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = module.external_secrets.iam_role_arn
  }
  # Set ns where will be deployed service
  set {
    name  = "scopedNamespace"
    value = var.env
  }
}

module "external_secrets" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "5.30.1"
  create_role                   = true
  role_name                     = local.secrets
  provider_url                  = replace(data.terraform_remote_state.eks.outputs.issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.external_secrets.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:${local.secrets}:${local.secrets}"]
  tags                          = local.tags
}

resource "aws_iam_policy" "external_secrets" {
  name_prefix = "${local.secrets}-"
  policy      = data.aws_iam_policy_document.external_secrets.json
}

data "aws_iam_policy_document" "external_secrets" {
  statement {
    effect = "Allow"

    actions = [
      "secretsmanager:GetResourcePolicy",
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecretVersionIds"
    ]
    # Change to secrets arn
    resources = ["arn:aws:secretsmanager:us-east-1:${var.account}:secret:*"]
  }
}

resource "random_password" "encryption_key" {
  length           = 25
  special          = true
}

resource "aws_secretsmanager_secret" "secrets_manager_source1_ssh" {
    count       = var.env == "prod" ? 1 : 0
    name        = "${var.env}-ssh-public-key-source1"
    description = "Secrets for Store publick key from the Source1"
    tags        = local.tags
}
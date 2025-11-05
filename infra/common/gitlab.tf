resource "helm_release" "gitlab_runner" {
  name    = "gitlab-runner"
  version = "v0.74.0"

  repository = "https://charts.gitlab.io"
  chart      = "gitlab-runner"

  namespace        = "gitlab-runner"
  create_namespace = true
  set_sensitive {
    name  = "runnerRegistrationToken"
    value = jsondecode(data.aws_secretsmanager_secret_version.gitlab_runner.secret_string)["TOKEN"]
  }

  values = [templatefile("values/gitlab.yaml", {
    region   = var.region
    role_arn = module.gitlab_runner.iam_role_arn
    role_id  = module.gitlab_runner.iam_role_name
    bucket   = aws_s3_bucket.gitlab_runner.id
  })]

  depends_on = [
    module.vpc,
    module.eks,
    module.gitlab_runner
  ]
  lifecycle {
    ignore_changes = [
      values
    ]
  }
}

module "gitlab_runner" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  role_description              = "Role with access to AWS Services from EKS"
  version                       = "5.30.0"
  create_role                   = true
  role_name                     = "gitlab-runner"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  oidc_fully_qualified_subjects = ["system:serviceaccount:gitlab-runner:gitlab-runner"]
}

resource "aws_iam_role_policy" "gitlab_runner_s3" {
  name = "gitlab-runner-s3-policy"

  role   = module.gitlab_runner.iam_role_name
  policy = data.aws_iam_policy_document.gitlab_runner_s3.json
}

resource "aws_iam_role_policy" "gitlab_runner_ecr" {
  name = "gitlab-runner-ecr-policy"

  role   = module.gitlab_runner.iam_role_name
  policy = data.aws_iam_policy_document.gitlab_runner_ecr.json
}

resource "aws_iam_role_policy" "gitlab_runner_eks" {
  name = "gitlab-runner-eks-policy"

  role   = module.gitlab_runner.iam_role_name
  policy = data.aws_iam_policy_document.gitlab_runner_eks.json
}

# S3 bucket for cache 
resource "aws_s3_bucket" "gitlab_runner" {
  bucket = "gitlab-cache-${var.region}-${var.env}"
  tags   = local.tags
}

resource "aws_s3_bucket_acl" "gitlab_runner_acl" {
  bucket = aws_s3_bucket.gitlab_runner.id
  acl    = "private"
}

resource "aws_s3_bucket_public_access_block" "gitlab_runner_acl" {
  bucket = aws_s3_bucket.gitlab_runner.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "gitlab_runner_versioning" {
  bucket = aws_s3_bucket.gitlab_runner.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "gitlab_runner" {
  bucket = aws_s3_bucket.gitlab_runner.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}
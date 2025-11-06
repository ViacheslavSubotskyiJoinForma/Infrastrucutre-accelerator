module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name                   = "eks-dev-cluster-01"
  kubernetes_version     = "1.32"
  endpoint_public_access = true

  enable_cluster_creator_admin_permissions = true

  compute_config = {
    enabled    = true
    node_pools = ["general-purpose"]
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
}

resource "aws_eks_access_entry" "sso_admin" {
  for_each = data.aws_iam_roles.sso_admin.arns

  cluster_name  = module.eks.cluster_name
  principal_arn = each.key
}

resource "aws_eks_access_policy_association" "sso_admin" {
  for_each = data.aws_iam_roles.sso_admin.arns

  cluster_name  = module.eks.cluster_name
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  principal_arn = each.key

  access_scope {
    type = "cluster"
  }
}

resource "aws_eks_access_entry" "sso_rr_engineering_rw" {
  for_each = data.aws_iam_roles.sso_rr_engineering_rw.arns

  cluster_name  = module.eks.cluster_name
  principal_arn = each.key
}

resource "aws_eks_access_policy_association" "sso_rr_engineering_rw_edit_ns" {
  for_each = data.aws_iam_roles.sso_rr_engineering_rw.arns

  cluster_name  = module.eks.cluster_name
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"
  principal_arn = each.key

  access_scope {
    type       = "namespace"
    namespaces = ["rr-*"]
  }
}

resource "aws_eks_access_policy_association" "sso_rr_engineering_rw_view_cluster" {
  for_each = data.aws_iam_roles.sso_rr_engineering_rw.arns

  cluster_name  = module.eks.cluster_name
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy"
  principal_arn = each.key

  access_scope {
    type = "cluster" # This is required to see resources in the AWS Console.
  }
}

resource "aws_eks_access_entry" "github_infra_kubernetes_configs" {
  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.eks_access_from_github_infra_kubernetes_configs.arn
}

resource "aws_eks_access_policy_association" "github_infra_kubernetes_configs" {
  cluster_name  = module.eks.cluster_name
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  principal_arn = aws_iam_role.eks_access_from_github_infra_kubernetes_configs.arn

  access_scope {
    type = "cluster"
  }
}

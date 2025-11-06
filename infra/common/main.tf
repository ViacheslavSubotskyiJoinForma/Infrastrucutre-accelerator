module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.17.2"

  cluster_name    = local.cluster_name
  cluster_version = local.cluster_version

  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = false
  create_kms_key                  = false
  cluster_encryption_config       = {}

  cluster_addons = {
    coredns = {
      most_recent   = true
      addon_version = "v1.10.1-eksbuild.18"
    }
    kube-proxy = {
      most_recent   = true
      addon_version = "v1.28.4-eksbuild.4"
    }
    vpc-cni = {
      most_recent   = true
      addon_version = "v1.16.0-eksbuild.1"
    }
    aws-ebs-csi-driver = {
      service_account_role_arn = module.ebs_csi_irsa_role.iam_role_arn
      addon_version            = "v1.26.1-eksbuild.1"
      most_recent              = true
    }
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  eks_managed_node_groups = {
    tech = {
      min_size     = 1
      max_size     = 1
      desired_size = 1

      iam_role_additional_policies = {
        AmazonSSMManagedInstanceCore = "arn:${local.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore",
        CloudWatchLogsFullAccess     = "arn:${local.partition}:iam::aws:policy/CloudWatchLogsFullAccess",
        AmazonCognitoPowerUser       = "arn:${local.partition}:iam::aws:policy/AmazonCognitoPowerUser"
      }

      instance_types = ["t3.small"]

      create_security_group                 = false
      attach_cluster_primary_security_group = true

      capacity_type = "ON_DEMAND"
    }
  }

  # aws-auth configmap
  manage_aws_auth_configmap = true

  cluster_security_group_additional_rules = {
    ingress_all = {
      description = "Cross VPC Access to Cluster"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      cidr_blocks = ["10.10.0.0/16"]
    }
  }

  cluster_enabled_log_types              = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  cloudwatch_log_group_retention_in_days = 365

  aws_auth_users = [
    {
      userarn  = "${data.aws_caller_identity.current.arn}"
      username = "${data.aws_caller_identity.current.user_id}"
      groups   = ["system:masters"]
    }
  ]
  aws_auth_roles = [
    {
      rolearn  = local.admin_sso_rolearn
      username = "AWSReservedSSO_AdministratorAccess:{{SessionName}}"
      groups   = ["system:masters"]
    },
  ]

  tags = merge(
    local.tags,
    {
      "karpenter.sh/discovery" = local.cluster_name
    },
  )
}

resource "helm_release" "metrics-server" {
  name    = "metrics-server"
  version = "3.9.0"

  verify = false

  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"

  namespace = "kube-system"

  values = [
    "${file("values/metrics.yaml")}"
  ]

  depends_on = [
    module.eks
  ]
}

resource "helm_release" "prometheus" {
  name             = "prometheus"
  repository       = "https://prometheus-community.github.io/helm-charts"
  create_namespace = true
  namespace        = "monitoring"
  chart            = "prometheus"
  version          = "15.12.0"
  values = [templatefile("values/prometheus.yaml", {
    env            = var.env
    ENV            = upper(var.env)
    cloudwatch     = helm_release.prometheus-cloudwatch-exporter.name
    subnets        = join(", ", data.terraform_remote_state.vpc.outputs.private_subnets)
    default-sg     = data.aws_eks_cluster.cluster.vpc_config[0].cluster_security_group_id
    certificate    = data.terraform_remote_state.services.outputs.public_acm_arn
    slack_api_url  = local.slack_api_url
    slack_chanel   = local.slack_chanel
  })]
}

resource "helm_release" "prometheus-msteams" {
  name             = "prometheus-msteams"
  repository       = "https://prometheus-msteams.github.io/prometheus-msteams"
  create_namespace = true
  namespace        = "monitoring"
  chart            = "prometheus-msteams"
  version          = "1.3.1"
  values = [templatefile("values/prometheus-msteams.yaml", {
    url-sufix      = "prom2ms"
    ENV            = upper(var.env)
    webhookURL     = local.prom2ms
    prefix         = var.env
  })]
}

resource "helm_release" "kube-eagle" {
  name             = "kube-eagle"
  repository       = "https://raw.githubusercontent.com/cloudworkz/kube-eagle-helm-chart/master"
  create_namespace = true
  namespace        = "monitoring"
  chart            = "kube-eagle"
  version          = "2.0.0"
}

resource "helm_release" "prometheus-cloudwatch-exporter" {
  name             = "prometheus-cloudwatch-exporter"
  repository       = "https://prometheus-community.github.io/helm-charts"
  create_namespace = true
  namespace        = "monitoring"
  chart            = "prometheus-cloudwatch-exporter"
  version          = "0.19.2"
  values = [templatefile("values/prometheus-cloudwatch-exporter.yaml", {
    env            = var.env
    region         = var.region
    role_arn       = module.prometheus_cloudwatch_exporter_role.iam_role_arn
    role_id        = module.prometheus_cloudwatch_exporter_role.iam_role_name
  })]
}

module "prometheus_cloudwatch_exporter_role" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  role_description              = "Role wtih access to AWS CloudWatch from EKS"
  version                       = "5.30.1"
  create_role                   = true
  role_name                     = "prometheus-cloudwatch-exporter-role"
  provider_url                  = replace(data.terraform_remote_state.eks.outputs.issuer_url, "https://", "")
  oidc_fully_qualified_subjects = ["system:serviceaccount:monitoring:prometheus-cloudwatch-exporter-role"]
  role_policy_arns              = ["arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess", "arn:aws:iam::aws:policy/ResourceGroupsandTagEditorReadOnlyAccess"]
  tags                          = local.tags
}
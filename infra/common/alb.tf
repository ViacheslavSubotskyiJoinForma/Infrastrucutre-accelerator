resource "helm_release" "ingress-controller" {
  name    = "ingress-controller"
  version = "1.4.2"

  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"

  namespace = "kube-system"

  values = [templatefile("values/alb.yaml", {
    clusterName    = local.cluster_name
    serviceAccount = module.ingress_controller.iam_role_name
    role           = module.ingress_controller.iam_role_arn
    env            = var.env
  })]

  depends_on = [
    module.eks,
    module.ingress_controller
  ]
}

module "ingress_controller" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "5.30.0"
  create_role                   = true
  role_name                     = "ingress-controller"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.ingress.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:kube-system:ingress-controller"]
}

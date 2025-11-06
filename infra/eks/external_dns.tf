# https://github.com/kubernetes-sigs/external-dns/tree/master/charts/external-dns
resource "helm_release" "public-external-dns" {
  name    = "public-external-dns"
  version = "1.12.1"

  repository = "https://kubernetes-sigs.github.io/external-dns"
  chart      = "external-dns"

  namespace        = "external-dns"
  create_namespace = true

  set {
    name  = "serviceAccount.create"
    value = true
  }
  set {
    name  = "serviceAccount.name"
    value = module.public_dns.iam_role_name
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = module.public_dns.iam_role_arn
  }
  set {
    name  = "domainFilters[0]"
    value = var.env == "prod" ? var.dns : data.aws_route53_zone.public.name
  }
  set {
    name  = "policy"
    value = "sync"
  }
  set {
    name  = "interval"
    value = "20m"
  }
  set {
    name  = "triggerLoopOnEvent"
    value = true
  }
  set {
    name  = "sources[0]"
    value = "ingress"
  }
  set {
    name  = "extraArgs[0]"
    value = "--aws-zone-type=public"
  }
  set {
    name  = "extraArgs[1]"
    value = "--annotation-filter=public in (true)"
  }

  set {
    name  = "nodeSelector.karpenter\\.sh/provisioner-name"
    value = "spot"
  }

  depends_on = [
    module.eks,
    module.public_dns
  ]
}

module "public_dns" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "5.30.0"
  create_role                   = true
  role_name                     = "public-dns"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.public-dns.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:external-dns:public-dns"]
}

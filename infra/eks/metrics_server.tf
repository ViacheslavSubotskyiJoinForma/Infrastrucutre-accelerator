
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

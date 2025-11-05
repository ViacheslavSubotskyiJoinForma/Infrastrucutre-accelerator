resource "helm_release" "fluent_bit" {
  name             = "fluent-bit"
  version          = "0.22.0"
  verify           = false
  repository       = "https://fluent.github.io/helm-charts"
  chart            = "fluent-bit"
  namespace        = "fluent-bit"
  create_namespace = true
  timeout          = 30
  values = [
    "${file("values/fluent-bit.yaml")}"
  ]

  set {
    name  = "esendpoint"
    value = aws_elasticsearch_domain.es.endpoint
  }

}
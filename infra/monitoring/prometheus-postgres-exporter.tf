resource "kubernetes_secret" "prometheus-postgres-exporter" {
  metadata {
    name      = "prometheus-postgres-exporter-${var.env}"
    namespace = "monitoring"
  }

  data = {
    connection = "postgresql://${local.pg_connecion}?sslmode=disable"
  }

  type = "Opaque"
}

resource "helm_release" "prometheus-postgres-exporter" {
  name             = "prometheus-postgres-exporter"
  repository       = "https://prometheus-community.github.io/helm-charts"
  create_namespace = true
  namespace        = "monitoring"
  chart            = "prometheus-postgres-exporter"
  version          = "4.2.1"
  values = [templatefile("values/prometheus-postgres-exporter.yaml", {
    secretName = "prometheus-postgres-exporter-${var.env}"
    sekretKey  = "connection"
  })]
}
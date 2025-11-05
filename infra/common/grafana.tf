resource "helm_release" "grafana" {
  name             = "grafana"
  chart            = "grafana"
  repository       = "https://grafana.github.io/helm-charts"
  create_namespace = true
  namespace        = "grafana"
  version          = "6.32.14"

  values = [templatefile("values/grafana.yaml", {
    grafana_url    = "grafana.common.ClientDomain.com"
    client_id      = okta_app_oauth.grafana.client_id
    client_secret  = okta_app_oauth.grafana.client_secret
    okta_url       = local.okta_url
    allowed_groups = "dev-firezone, admin-firezone"
    env            = var.env
    certificate    = aws_acm_certificate.public_acm.arn
    sg             = "${aws_security_group.grafana.id}, ${data.aws_security_group.tem.id}"
    subnets        = "${join(", ", module.vpc.public_subnets)}"
  })]
}

resource "aws_security_group" "grafana" {
  name        = "grafana"
  description = "Allow HTTPS traffic"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Allow HTTP traffic for grafana"
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = 80
    to_port     = "80"
    protocol    = "tcp"
    self        = "false"
  }

  ingress {
    description = "Allow HTTPS traffic for grafana"
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = 443
    to_port     = "443"
    protocol    = "tcp"
    self        = "false"
  }

  egress {
    description = "Allow all outbound traffic"
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = "0"
    protocol    = "-1"
    self        = "false"
    to_port     = "0"
  }
  tags = local.tags
}

data "aws_security_group" "tem" {
  vpc_id = module.vpc.vpc_id

  filter {
    name   = "tag:Name"
    values = ["eks-cluster-sg-TEM*"]
  }
  tags = local.tags
}

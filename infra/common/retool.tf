resource "random_string" "retool_jwt" {
  length  = 36
  special = false
  upper   = true
  lower   = true
}

resource "random_string" "retool_encryptionKey" {
  length  = 42
  special = false
  upper   = true
  lower   = true
}

resource "helm_release" "retool" {
  name             = "retool"
  chart            = "retool"
  repository       = "https://charts.retool.com"
  create_namespace = true
  namespace        = "retool"
  version          = "5.0.7"

  values = [templatefile("values/retool.yaml", {
    retool_url      = "retool.common.ClientDomain.com"
    certificate     = aws_acm_certificate.public_acm.arn
    default-sg      = "${aws_security_group.retool.id}, ${data.aws_security_group.tem.id}"
    subnets         = "${join(", ", module.vpc.public_subnets)}"
    jwtSecret       = "${random_string.retool_jwt.result}"
    encryptionKey   = "${random_string.retool_encryptionKey.result}"
    db_host         = "${module.postgresql.cluster_endpoint}"
    db_port         = "${module.postgresql.cluster_port}"
    retool_db       = "${postgresql_database.retool_db.name}"
    retool_user     = "${postgresql_role.retool_user.name}"
    retool_password = "${random_password.retool_password.result}"
  })]
}

resource "aws_security_group" "retool" {
  name        = "retool"
  description = "Allow HTTPS traffic"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Allow HTTP traffic for retool"
    cidr_blocks = [
      "136.226.58.0/23",
      "165.225.222.0/23",
      "136.226.2.0/23",
      "104.129.204.0/23",
      "52.22.202.246/32",
      "136.226.122.0/23",
      "170.85.56.0/23",
      "104.129.206.0/23",
      "136.226.112.0/23"
    ]
    from_port = 80
    to_port   = "80"
    protocol  = "tcp"
    self      = "false"
  }

  ingress {
    description = "Allow HTTPS traffic for retool"
    cidr_blocks = [
      "170.85.56.0/23",
      "165.225.222.0/23",
      "136.226.58.0/23",
      "52.22.202.246/32",
      "104.129.206.0/23",
      "136.226.122.0/23",
      "136.226.2.0/23",
      "136.226.112.0/23",
      "104.129.204.0/23",

    ]
    from_port = 443
    to_port   = "443"
    protocol  = "tcp"
    self      = "false"
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
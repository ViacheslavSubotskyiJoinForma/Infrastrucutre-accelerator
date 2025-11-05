locals {
  cluster_name = "TEM"
  tags = {
    env       = var.env
    Terraform = true
  }

  emails = [
    "User1@ClientDomain.com",
    "User2@ClientDomain.com"
  ]

  cluster_version = "1.28"
  partition       = data.aws_partition.current.partition

  user_data = <<-EOT
  #!/bin/bash
  sudo yum update -y
  sudo yum install libxcrypt-compat python3-pip python3 augeas-libs -y
  sudo modprobe wireguard
  pip3 install boto3 certbot-dns-route53
  EOT

  admin_sso_rolearn = tolist([
    for parts in [for arn in data.aws_iam_roles.admin.arns : split("/", arn)] :
    format("%s/%s", parts[0], element(parts, length(parts) - 1))
  ])[0]

  email = "ClientDomain.com"
  custom_emails = {
    "User3" = "User3@ClientDomain.com",
    "User1" = "User1@ClientDomain.com",
    "User2" = "User2@ClientDomain.com"
  }
  vpn      = "https://vpn.${var.dns}/"
  okta_url = "https://ClientDomain.okta.com"
  grafana  = "https://grafana.${var.dns}/"
}
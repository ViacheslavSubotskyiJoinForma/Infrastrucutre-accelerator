## Part of config for AWS VPN
#resource "aws_iam_saml_provider" "vpn" {
#  name                   = "vpn"
#  saml_metadata_document = file("files/vpn.xml")
#}
#
#resource "aws_iam_saml_provider" "vpn_self_service" {
#  name                   = "vpn-self-service"
#  saml_metadata_document = file("files/vpn_self_service.xml")
#}
#
## Preparing CloudWatch for VPN logging
#resource "aws_cloudwatch_log_group" "client_vpn" {
#  name              = "vpn_endpoint_cloudwatch_log_group"
#  retention_in_days = 365
#}
#
#resource "aws_cloudwatch_log_stream" "client_vpn" {
#  name           = "vpn_endpoint_cloudwatch_log_stream"
#  log_group_name = aws_cloudwatch_log_group.client_vpn.name
#}
#
#resource "aws_ec2_client_vpn_endpoint" "vpn" {
#  description            = "VPN client for AWS"
#  server_certificate_arn = aws_acm_certificate.public_acm.arn
#
#  client_cidr_block     = "10.200.0.0/22"
#  dns_servers           = ["1.1.1.1", "8.8.8.8"]
#  session_timeout_hours = 12
#
#  split_tunnel        = "true"
#  self_service_portal = "enabled"
#  transport_protocol  = "udp"
#
#  vpc_id             = module.vpc.vpc_id
#  security_group_ids = [aws_security_group.vpn_main.id]
#
#  authentication_options {
#    type                           = "federated-authentication"
#    saml_provider_arn              = aws_iam_saml_provider.vpn.arn
#    self_service_saml_provider_arn = aws_iam_saml_provider.vpn_self_service.arn
#  }
#
#  connection_log_options {
#    enabled               = true
#    cloudwatch_log_group  = aws_cloudwatch_log_group.client_vpn.name
#    cloudwatch_log_stream = aws_cloudwatch_log_stream.client_vpn.name
#  }
#}
#
## Security groups for VPN
#resource "aws_security_group" "vpn_main" {
#  name        = "vpn_main"
#  description = "Allow VPN all traffic"
#  vpc_id      = module.vpc.vpc_id
#
#  egress {
#    description = "Allow all traffic for VPN"
#    cidr_blocks = ["0.0.0.0/0"]
#    from_port   = "0"
#    protocol    = "-1"
#    self        = "false"
#    to_port     = "0"
#  }
#
#  ingress {
#    description = "Allow all traffic for VPN"
#    cidr_blocks = ["0.0.0.0/0"]
#    from_port   = "0"
#    protocol    = "-1"
#    self        = "false"
#    to_port     = "0"
#  }
#}
#
#resource "aws_ec2_client_vpn_network_association" "association" {
#  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.vpn.id
#  subnet_id              = element(module.vpc.private_subnets, 0)
#
#  depends_on = [
#    aws_ec2_client_vpn_endpoint.vpn
#  ]
#}
#
## Allow access to common network for vpn's group as well
#resource "aws_ec2_client_vpn_authorization_rule" "vpn" {
#  for_each               = var.vpn_env_group
#  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.vpn.id
#  target_network_cidr    = each.value.cidr
#  access_group_id        = each.value.group_id
#  description            = "${each.key}"
#
#  depends_on = [
#    aws_ec2_client_vpn_endpoint.vpn,
#    aws_ec2_client_vpn_network_association.association
#  ]
#}
#
#
#resource "aws_ec2_client_vpn_authorization_rule" "common" {
#  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.vpn.id
#  target_network_cidr    = module.vpc.vpc_cidr_block
#  authorize_all_groups   = true
#  description            = "vpn-common"
#
#  depends_on = [
#    aws_ec2_client_vpn_endpoint.vpn,
#    aws_ec2_client_vpn_network_association.association
#  ]
#}
#
#resource "aws_ec2_client_vpn_authorization_rule" "extra" {
#  for_each               = var.extra_cidr_block
#  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.vpn.id
#  target_network_cidr    = each.value
#  authorize_all_groups   = true
#  description            = each.key
#
#  depends_on = [
#    aws_ec2_client_vpn_endpoint.vpn,
#    aws_ec2_client_vpn_network_association.association
#  ]
#}
#
#resource "aws_ec2_client_vpn_route" "vpn" {
#  for_each               = var.vpc_cidr_block
#  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.vpn.id
#  destination_cidr_block = each.value
#  target_vpc_subnet_id   = element(module.vpc.private_subnets, 0)
#
#  timeouts {
#    create = "5m"
#    delete = "5m"
#  }
#
#  depends_on = [
#    aws_ec2_client_vpn_endpoint.vpn,
#    aws_ec2_client_vpn_network_association.association
#  ]
#}
#
#resource "aws_ec2_client_vpn_route" "extra" {
#  for_each               = var.extra_cidr_block
#  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.vpn.id
#  destination_cidr_block = each.value
#  target_vpc_subnet_id   = element(module.vpc.private_subnets, 0)
#
#  timeouts {
#    create = "5m"
#    delete = "5m"
#  }
#
#  depends_on = [
#    aws_ec2_client_vpn_endpoint.vpn,
#    aws_ec2_client_vpn_network_association.association
#  ]
#}

# firezone vpn
# [https://docs.firezone.dev/]
module "ec2" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "5.5.0"

  name = "firezone-instance"

  ami                     = "ami-00ecc09e40aa9194b"
  availability_zone       = element(module.vpc.azs, 0)
  subnet_id               = element(module.vpc.public_subnets, 0)
  instance_type           = "t4g.small"
  key_name                = aws_key_pair.firezone.key_name
  monitoring              = true
  vpc_security_group_ids  = [module.security_group.security_group_id]
  disable_api_termination = true
  iam_instance_profile    = aws_iam_instance_profile.firezone.id

  enable_volume_tags = false
  root_block_device = [
    {
      encrypted   = true
      volume_type = "gp3"
      throughput  = 125
      volume_size = 30
      tags = {
        name = "firezone-root-block"
      }
    },
  ]

  user_data_base64 = base64encode(local.user_data)

  tags = {
    Terraform    = "true"
    Environment  = "common"
    Service_type = "vpn"
    Service_name = "firezone"
  }
}

module "security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.0"

  name   = "firezone-sg"
  vpc_id = module.vpc.vpc_id

  ingress_cidr_blocks = ["0.0.0.0/0"]
  ingress_rules       = ["https-443-tcp", "http-80-tcp", "all-icmp"]
  egress_rules        = ["all-all"]

  ingress_with_cidr_blocks = [
    {
      from_port   = 51820
      to_port     = 51820
      protocol    = "udp"
      cidr_blocks = "0.0.0.0/0"
    },
    {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = module.vpc.vpc_cidr_block
    }
  ]

  tags = merge(local.tags, {
    Service_type = "vpn"
    Service_name = "firezone"
  })
}

resource "tls_private_key" "firezone" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "firezone" {
  key_name   = "firezone"
  public_key = tls_private_key.firezone.public_key_openssh
}

output "firezone_private_key" {
  value     = tls_private_key.firezone.private_key_pem
  sensitive = true
}

# resource "aws_route53_record" "vpn" {
#   zone_id = data.aws_route53_zone.public.zone_id
#   name    = "vpn.${var.dns}"
#   type    = "A"
#   ttl     = "300"
#   records = [aws_eip.vpn.public_ip]
# }

#resource "aws_eip" "vpn2" {
#  vpc = true
#
#  # instance   = module.ec2.id
#  depends_on = [module.vpc.igw_id]
#
#  tags = merge(local.tags, {
#    Service_type = "vpn"
#    Service_name = "firezone"
#    Name         = "firezone-eip2"
#  })
#}

resource "aws_eip" "vpn" {
  #vpc = true

  instance   = module.ec2.id
  depends_on = [module.vpc.igw_id]

  tags = merge(local.tags, {
    Service_type = "vpn"
    Service_name = "firezone"
    Name         = "firezone-eip1"
  })
}

resource "aws_iam_instance_profile" "firezone" {
  name = "FirezoneInstanceProfile"
  role = aws_iam_role.firezone.id
}

resource "aws_iam_role" "firezone" {
  name = "firezone"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy" "firezone_policy" {
  name = "firezone_policy"
  role = aws_iam_role.firezone.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sts:AssumeRole"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:iam::847202492145:role/firezone-dns"
      }
    ]
  })
}

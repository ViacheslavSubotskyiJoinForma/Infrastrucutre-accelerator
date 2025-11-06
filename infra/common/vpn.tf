# Firezone VPN
# [https://docs.firezone.dev/]
# SECURITY NOTE: Firezone is configured with 0.0.0.0/0 access on ports 443, 80, and 51820.
# For production environments, consider restricting ingress_cidr_blocks to known IP ranges.
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
        Resource = "arn:aws:iam::444444444444:role/firezone-dns"
      }
    ]
  })
}

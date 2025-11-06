resource "aws_security_group" "sftp_security_group" {
  #count              = (var.env == "prod" || var.env == "uat") ? 1 : 0
  count       = var.env == "prod" ? 1 : 0
  name        = "${var.env}-sftp-sg"
  description = "Managed by Terraform"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  ingress {
    from_port = 22
    to_port   = 22
    protocol  = "tcp"

    cidr_blocks = [
      "52.22.202.246/32",
      "54.145.67.40/32",
      "52.55.251.193/32",
      "54.82.158.57/32",
      "199.73.116.54/32"
    ]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

module "sftp" {
  #count              = (var.env == "prod" || var.env == "uat") ? 1 : 0
  count              = var.env == "prod" ? 1 : 0
  source             = "../../modules/sftp"
  dns_name           = var.dns
  user               = var.user
  env                = var.env
  security_group_ids = aws_security_group.sftp_security_group[0].id
  aws_subnet_ids     = data.terraform_remote_state.vpc.outputs.public_subnets
  vpc_id             = data.terraform_remote_state.vpc.outputs.vpc_id
  kms_arn            = aws_kms_key.s3_key.arn

  tags = local.tags
}

resource "aws_s3_bucket_logging" "sftp-bucket-log" {
  #count              = (var.env == "prod" || var.env == "uat") ? 1 : 0
  count         = var.env == "prod" ? 1 : 0
  bucket        = module.sftp[0].bucket_id["source1"]
  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "sftp-bucket-source1-log/"
}

##Applicable only for galilelo SFTP server and user
resource "aws_transfer_ssh_key" "sftp_ssh_key_source1" {
  count     = var.env == "prod" ? 1 : 0
  server_id = module.sftp[0].id
  user_name = "source1"
  body      = local.source1_ssh_public_key
}


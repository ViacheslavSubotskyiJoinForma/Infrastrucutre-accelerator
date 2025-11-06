resource "aws_security_group" "es" {
  name        = "${var.env}-elasticsearch-sg"
  description = "Managed by Terraform"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"

    cidr_blocks = ["10.0.0.0/8"]
  }

  tags = local.tags
}

resource "aws_iam_service_linked_role" "es" {
  aws_service_name = "es.amazonaws.com"
}

resource "aws_elasticsearch_domain" "es" {
  domain_name           = "${var.env}-elasticsearch"
  elasticsearch_version = var.elasticsearch_version

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  cluster_config {
    instance_count = var.data_node_count
    #instance_type            = var.data_node_type
    instance_type            = var.env == "prod" ? var.data_node_type_prod : var.data_node_type
    dedicated_master_count   = var.master_node_count
    dedicated_master_enabled = false
    dedicated_master_type    = var.master_node_type
    zone_awareness_enabled   = true
    zone_awareness_config {
      availability_zone_count = 3
    }
  }
  ebs_options {
    ebs_enabled = var.data_node_disk_size > 0 ? true : false
    volume_type = "gp2"
    volume_size = var.data_node_disk_size
  }

  vpc_options {
    subnet_ids         = [data.terraform_remote_state.vpc.outputs.database_subnets[0], data.terraform_remote_state.vpc.outputs.database_subnets[1], data.terraform_remote_state.vpc.outputs.database_subnets[2]]
    security_group_ids = [aws_security_group.es.id]
  }
  domain_endpoint_options {
    custom_endpoint_enabled         = true
    custom_endpoint                 = var.env == "prod" ? "elasticsearch.ClientDomain.com" : "elasticsearch.${var.env}.ClientDomain.com"
    custom_endpoint_certificate_arn = var.env == "prod" ? data.aws_acm_certificate.ClientDomain.arn : data.terraform_remote_state.services.outputs.public_acm_arn
    tls_security_policy             = "Policy-Min-TLS-1-2-2019-07"
  }

  access_policies = <<CONFIG
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "es:*",
            "Principal": "*",
            "Effect": "Allow",
            "Resource": "arn:aws:es:us-east-1:${var.account}:domain/${var.env}-elasticsearch/*"
        }
    ]
}
CONFIG

  snapshot_options {
    automated_snapshot_start_hour = 23
  }

  tags = local.tags
}

resource "aws_route53_record" "es" {
  zone_id = var.env == "prod" ? data.aws_route53_zone.public.zone_id : data.terraform_remote_state.services.outputs.zone_id
  name    = "elasticsearch"
  type    = "CNAME"
  ttl     = "300"
  records = [aws_elasticsearch_domain.es.endpoint]
}

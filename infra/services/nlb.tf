resource "aws_lb" "backend_nlb" {
  name               = "backend-nlb-private"
  internal           = true
  load_balancer_type = "network"
  subnets            = data.terraform_remote_state.vpc.outputs.private_subnets

  enable_deletion_protection = false
  enable_cross_zone_load_balancing = true

  tags = local.tags
}

resource "aws_route53_record" "backend_nlb_record" {
  name    = local.backend_url
  type    = "CNAME"
  zone_id = var.env == "prod" ? data.aws_route53_zone.public.zone_id : aws_route53_zone.public_dns.zone_id
  ttl     = 60
  records = [ aws_lb.backend_nlb.dns_name ]
  depends_on = [
    aws_lb.backend_nlb
  ]
}

resource "aws_lb_target_group" "backend_nlb_target_group" {
  name        = "backend-nlb-target-group"
  port        = 8080
  protocol    = "TCP"
  target_type = "ip"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  tags = local.tags
}

resource "aws_lb_listener" "backend_listener" {
  load_balancer_arn = aws_lb.backend_nlb.arn
  port              = "443"
  protocol          = "TLS"
  certificate_arn   = var.env == "prod" ? data.aws_acm_certificate.ClientDomain.arn : aws_acm_certificate.public_acm.arn
  alpn_policy       = "HTTP2Optional"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_nlb_target_group.arn
  }

  depends_on = [
    aws_lb.backend_nlb,
    aws_lb_target_group.backend_nlb_target_group
  ]

  tags = local.tags
}

resource "aws_api_gateway_vpc_link" "backend_nlb_vpc_link" {
  name        = "backend-nlb-vpc-link"
  description = "VPC Link to private NLB"
  target_arns = [aws_lb.backend_nlb.arn]

  depends_on = [
    aws_lb.backend_nlb
  ]

  tags = local.tags
}

resource "kubernetes_manifest" "targetgroupbinding_backend" {
  manifest = {
    "apiVersion" = "elbv2.k8s.aws/v1beta1"
    "kind" = "TargetGroupBinding"
    "metadata" = {
      "name" = "backend-nlb-pods-binding"
      "namespace" = "${var.env}"
    }
    "spec" = {
      "ipAddressType" = "ipv4"
      "serviceRef" = {
        "name" = "backend"
        "port" = 80
      }
      "targetGroupARN" = "${aws_lb_target_group.backend_nlb_target_group.arn}"
      "targetType" = "ip"
    }
  }
}
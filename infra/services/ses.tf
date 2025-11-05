resource "aws_ses_domain_identity" "domain" {
  domain = local.ses_domain
}

resource "aws_route53_record" "amazonses_verification_record" {
  zone_id = var.env == "prod" ? data.aws_route53_zone.public.zone_id : aws_route53_zone.public_dns.zone_id
  name    = "_amazonses.${local.ses_domain}"
  type    = "TXT"
  ttl     = "600"
  records = [aws_ses_domain_identity.domain.verification_token]
}

resource "aws_ses_domain_dkim" "domain_dkim" {
  domain = "${aws_ses_domain_identity.domain.domain}"
}

resource "aws_route53_record" "amazonses_dkim_record" {
  count   = 3
  zone_id = var.env == "prod" ? data.aws_route53_zone.public.zone_id : aws_route53_zone.public_dns.zone_id
  name    = "${element(aws_ses_domain_dkim.domain_dkim.dkim_tokens, count.index)}._domainkey.${local.ses_domain}"
  type    = "CNAME"
  ttl     = "600"
  records = ["${element(aws_ses_domain_dkim.domain_dkim.dkim_tokens, count.index)}.dkim.amazonses.com"]
}

resource "aws_ses_receipt_rule" "store" {
  name          = "store"
  rule_set_name = "default-rule-set"
  enabled       = true
  scan_enabled  = true

  add_header_action {
    header_name  = "Custom-Header"
    header_value = "Added by SES"
    position     = 1
  }

  s3_action {
    bucket_name = var.bucket_name
    object_key_prefix = "incoming"
    position    = 2
  }
  depends_on = [
      aws_ses_receipt_rule_set.default
  ]
}

resource "aws_ses_receipt_rule_set" "default" {
  rule_set_name = "default-rule-set"
}
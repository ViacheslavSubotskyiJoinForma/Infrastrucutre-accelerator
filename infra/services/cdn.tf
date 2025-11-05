module "company-logos-bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "3.15.1"

  bucket = "ClientDomain-company-logos-${var.env}"
  acl    = "private"

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  # Bucket policies
  attach_policy = false

  versioning = {
    enabled    = true
    mfa_delete = false
  }
  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm     = "AES256"
      }
    }
  }
  cors_rule = jsonencode([
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = ["*"]
      expose_headers  = []
      max_age_seconds = 3000
    }
  ])
  
  tags = local.tags
}

resource "aws_s3_object" "logos_icons" {
    bucket   = module.company-logos-bucket.s3_bucket_id
    acl      = "private"
    key      = "company/icons/"
    source   = "/dev/null"
}

module "frontend-bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "3.15.1"

  bucket = local.admin_url
  acl    = "private"

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  # Bucket policies
  attach_policy = false

  versioning = {
    enabled    = true
    mfa_delete = false
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm     = "AES256"
      }
    }
  }
  
  tags = local.tags
}

module "cdn" {
  source              = "terraform-aws-modules/cloudfront/aws"
  version             = "3.2.1"
  aliases             = [local.admin_url, local.logos_url]
  default_root_object = "index.html"

  comment             = "CloudFront for Admin Portal"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_200"
  retain_on_delete    = false
  wait_for_deployment = false

  create_origin_access_identity = true
  origin_access_identities = {
    s3_bucket_one   = local.admin_url
  }

  origin = {
    s3_one = {
      domain_name = module.frontend-bucket.s3_bucket_bucket_regional_domain_name
      s3_origin_config = {
        origin_access_identity = "s3_bucket_one"
      }
    },
    s3_logos = {
      domain_name = module.company-logos-bucket.s3_bucket_bucket_regional_domain_name
      s3_origin_config = {
        origin_access_identity = "s3_bucket_one"
      }
    }
  }

  default_cache_behavior = {
    target_origin_id           = "s3_one"
    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache-control-policy.id

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]
    compress        = true
    query_string    = true
  }

  ordered_cache_behavior = [
    {
      path_pattern             = "/company/icons/*"
      target_origin_id         = "s3_logos"
      viewer_protocol_policy   = "redirect-to-https"

      allowed_methods          = ["GET", "HEAD", "OPTIONS"]
      cached_methods           = ["GET", "HEAD"]
      compress                 = true
      query_string             = true
      use_forwarded_values     = false
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.existing_cors_policy.id
      cache_policy_id          = data.aws_cloudfront_cache_policy.existing_cache_policy.id
    }
  ]

  viewer_certificate = {
    acm_certificate_arn = var.env == "prod" ? data.aws_acm_certificate.ClientDomain.arn : aws_acm_certificate.public_acm.arn
    ssl_support_method  = "sni-only"
  }

  custom_error_response = [{
    error_caching_min_ttl = 10
    error_code = 403
    response_code = 200
    response_page_path = "/"
  }]

  depends_on = [
    module.frontend-bucket,
    aws_cloudfront_response_headers_policy.cache-control-policy,
  ]
  tags = local.tags
}

resource "aws_route53_record" "admin-record" {
  name    = local.admin_url
  type    = "CNAME"
  zone_id = var.env == "prod" ? data.aws_route53_zone.public.zone_id : aws_route53_zone.public_dns.zone_id
  ttl     = 60
  records = [ module.cdn.cloudfront_distribution_domain_name ]
  depends_on = [
    module.cdn
  ]
}

resource "aws_route53_record" "logos-record" {
  name    = local.logos_url
  type    = "CNAME"
  zone_id = var.env == "prod" ? data.aws_route53_zone.public.zone_id : aws_route53_zone.public_dns.zone_id
  ttl     = 60
  records = [ module.cdn.cloudfront_distribution_domain_name ]
  depends_on = [
    module.cdn
  ]
}

data "aws_iam_policy_document" "s3_policy" {
  policy_id       = "PolicyForCloudFrontPrivateContent"
  statement {
    sid           = "1"
    actions       = ["s3:GetObject"]
    resources     = ["arn:aws:s3:::${module.frontend-bucket.s3_bucket_id}/*"]

    principals {
      type        = "AWS"
      identifiers = [module.cdn.cloudfront_origin_access_identities["s3_bucket_one"].iam_arn]
    }
  }
  depends_on = [
    module.cdn
  ]
}

resource "aws_s3_bucket_policy" "frontend-bucket-policy" {
  bucket = module.frontend-bucket.s3_bucket_id
  policy = data.aws_iam_policy_document.s3_policy.json
  depends_on = [
    module.cdn
  ]
}

data "aws_iam_policy_document" "s3_policy_logos_cdn" {
  policy_id       = "PolicyForCloudFrontCompanyLogos"
  statement {
    sid           = "LogosBucketCDN"
    actions       = ["s3:GetObject"]
    resources     = ["arn:aws:s3:::${module.company-logos-bucket.s3_bucket_id}/*"]

    principals {
      type        = "AWS"
      identifiers = [module.cdn.cloudfront_origin_access_identities["s3_bucket_one"].iam_arn]
    }
  }
  statement {
    sid           = "LogosBucket"
    actions       = ["s3:*"]
    resources     = [
      module.company-logos-bucket.s3_bucket_arn,
      "${module.company-logos-bucket.s3_bucket_arn}/*"
    ]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.account}:role/backend-role"]
    }
  }

  depends_on = [
    module.cdn
  ]
}

resource "aws_s3_bucket_policy" "ClientDomain-company-logos-policy-cdn" {
  bucket = module.company-logos-bucket.s3_bucket_id
  policy = data.aws_iam_policy_document.s3_policy_logos_cdn.json
  depends_on = [
    module.cdn
  ]
}

resource "aws_cloudfront_response_headers_policy" "cache-control-policy" {
  name = "cache-control-policy-${var.env}"

  custom_headers_config {
    items {
      header   = "Cache-Control"
      override = true
      value    = "no-cache, max-age=0, must-revalidate"
    }
  }
}
resource "aws_api_gateway_rest_api" "rest_api" {
  name = "gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  body = templatefile("./templates/apiGateway.yaml", {
    gateway_url     = local.gateway_url
    backend_url     = local.backend_url
    title           = "source1"
    uri             = "/{proxy}"
    uri_integration = "/integration/source1/{proxy}"
    vpc_link_id     = aws_api_gateway_vpc_link.backend_nlb_vpc_link.id
  })

  binary_media_types = ["text/csv", "multipart/form-data"]
  #lifecycle {
  #  ignore_changes = [
  #    body
  #  ]
  #}

  depends_on = [
    aws_api_gateway_vpc_link.backend_nlb_vpc_link
  ]

  tags = local.tags
}

resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_rest_api.rest_api.root_resource_id
  path_part   = "api"
}

resource "aws_api_gateway_resource" "api_proxy" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "api_proxy_method" {
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  resource_id   = aws_api_gateway_resource.api_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "api_integration" {
  http_method             = aws_api_gateway_method.api_proxy_method.http_method
  resource_id             = aws_api_gateway_resource.api_proxy.id
  rest_api_id             = aws_api_gateway_rest_api.rest_api.id
  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  connection_type         = "VPC_LINK"
  connection_id           = aws_api_gateway_vpc_link.backend_nlb_vpc_link.id
  uri                     = "https://${local.backend_url}/{proxy}"
  request_parameters      = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

resource "aws_api_gateway_resource" "integration" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_rest_api.rest_api.root_resource_id
  path_part   = "integration"
}

resource "aws_api_gateway_resource" "source1" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_resource.integration.id
  path_part   = "source1"
}

resource "aws_api_gateway_resource" "source1_proxy" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_resource.source1.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "source1_proxy_method" {
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  resource_id   = aws_api_gateway_resource.source1_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "source1_integration" {
  http_method             = aws_api_gateway_method.source1_proxy_method.http_method
  resource_id             = aws_api_gateway_resource.source1_proxy.id
  rest_api_id             = aws_api_gateway_rest_api.rest_api.id
  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  connection_type         = "VPC_LINK"
  connection_id           = aws_api_gateway_vpc_link.backend_nlb_vpc_link.id
  uri                     = "https://${local.backend_url}/integration/source1/{proxy}"
  request_parameters      = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.rest_api,
      aws_api_gateway_resource.api.id,
      aws_api_gateway_resource.api_proxy.id,
      aws_api_gateway_method.api_proxy_method.id,
      aws_api_gateway_integration.api_integration.id,
      aws_api_gateway_resource.integration.id,
      aws_api_gateway_resource.source1.id,
      aws_api_gateway_resource.source1_proxy.id,
      aws_api_gateway_method.source1_proxy_method.id,
      aws_api_gateway_integration.source1_integration.id,
      aws_api_gateway_resource.plaid,
      aws_api_gateway_resource.webhook,
      aws_api_gateway_resource.webhook_proxy,
      aws_api_gateway_method.webhook_proxy_method,
      aws_api_gateway_integration.webhook_integration,
      aws_api_gateway_resource.robot_txt,
      aws_api_gateway_method.robot_method,
      aws_api_gateway_resource.assetlinks_json,
      aws_api_gateway_method.assetlinks_json_method,
      aws_api_gateway_method.root_mock,
      aws_api_gateway_resource.webhook,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
  depends_on = [
    aws_api_gateway_resource.api,
    aws_api_gateway_resource.api_proxy,
    aws_api_gateway_method.api_proxy_method,
    aws_api_gateway_integration.api_integration,
    aws_api_gateway_resource.integration,
    aws_api_gateway_resource.source1,
    aws_api_gateway_resource.source1_proxy,
    aws_api_gateway_method.source1_proxy_method,
    aws_api_gateway_integration.source1_integration,
    aws_api_gateway_resource.plaid,
    aws_api_gateway_resource.webhook,
    aws_api_gateway_resource.webhook_proxy,
    aws_api_gateway_method.webhook_proxy_method,
    aws_api_gateway_integration.webhook_integration,
  ]
}

resource "aws_api_gateway_stage" "stage" {
  cache_cluster_size = "0.5"
  deployment_id      = aws_api_gateway_deployment.deployment.id
  rest_api_id        = aws_api_gateway_rest_api.rest_api.id
  stage_name         = "integration"
  access_log_settings {
    destination_arn = "arn:aws:logs:${var.region}:${var.account}:log-group:API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.rest_api.id}/integration"
    format          = jsonencode(
      {
        caller         = "$context.identity.caller"
        httpMethod     = "$context.httpMethod"
        protocol       = "$context.protocol"
        requestId      = "$context.requestId"
        requestTime    = "$context.requestTime"
        responseLength = "$context.responseLength"
        status         = "$context.status"
      })
    }

  lifecycle {
    ignore_changes = [
      deployment_id
    ]
  }
}

resource "aws_api_gateway_domain_name" "gateway_name" {
  domain_name              = local.gateway_url
  regional_certificate_arn = var.env == "prod" ? data.aws_acm_certificate.ClientDomain.arn : aws_acm_certificate.public_acm.arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_route53_record" "record" {
  name    = aws_api_gateway_domain_name.gateway_name.domain_name
  type    = "A"
  zone_id = var.env == "prod" ? data.aws_route53_zone.public.zone_id : aws_route53_zone.public_dns.zone_id

  alias {
    evaluate_target_health = true
    name                   = aws_api_gateway_domain_name.gateway_name.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.gateway_name.regional_zone_id
  }
}

resource "aws_api_gateway_base_path_mapping" "mapping" {
  api_id      = aws_api_gateway_rest_api.rest_api.id
  stage_name  = aws_api_gateway_stage.stage.stage_name
  domain_name = aws_api_gateway_domain_name.gateway_name.domain_name
}

resource "aws_api_gateway_rest_api_policy" "source1" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  policy      = data.aws_iam_policy_document.source1-policy.json

  #lifecycle {
  #  ignore_changes = [
  #    policy
  #  ]
  #}
}

data "aws_iam_policy_document" "source1-policy" {
  statement {
    actions = [
      "execute-api:Invoke"
    ]

    effect = "Allow"

    principals {
      type = "AWS"
      identifiers = [
        "*"
      ]
    }

    resources = ["${aws_api_gateway_rest_api.rest_api.execution_arn}/*/*/*"]
  }
  statement {
    actions = [
      "execute-api:Invoke"
    ]

    effect = "Deny"

    principals {
      type = "AWS"
      identifiers = [
        "*"
      ]
    }

    resources = ["${aws_api_gateway_rest_api.rest_api.execution_arn}/integration/*/integration/source1/*"]

    condition {
      test     = "NotIpAddress"
      variable = "aws:SourceIp"
      values   = local.source1_ips
    }
  }
  statement {
    actions = [
      "execute-api:Invoke"
    ]

    effect = "Deny"

    principals {
      type = "AWS"
      identifiers = [
        "*"
      ]
    }

    resources = ["${aws_api_gateway_rest_api.rest_api.execution_arn}/integration/*/api/integration/*"]
  }
  statement {
    actions = [
      "execute-api:Invoke"
    ]

    effect = "Deny"

    principals {
      type = "AWS"
      identifiers = [
        "*"
      ]
    }

    resources = [
      "${aws_api_gateway_rest_api.rest_api.execution_arn}/integration/*/api/internal/*",
      "${aws_api_gateway_rest_api.rest_api.execution_arn}/integration/*/api/admin-src/*",
      "${aws_api_gateway_rest_api.rest_api.execution_arn}/integration/*/api/admin-src*",
      "${aws_api_gateway_rest_api.rest_api.execution_arn}/integration/*/api/api-docs/*",
      "${aws_api_gateway_rest_api.rest_api.execution_arn}/integration/*/api/api-docs*"
    ]
  }
}

resource "aws_api_gateway_model" "Dummy" {
  rest_api_id  = aws_api_gateway_rest_api.rest_api.id
  name         = "Dummy"
  content_type = "application/json"

  schema = <<EOF
{
  "title" : "Success dummy response",
  "type" : "string",
  "enum" : [ "OK" ]
}
EOF
  lifecycle {
      ignore_changes = [
        schema
      ]
  }
}

resource "aws_api_gateway_model" "Empty" {
  rest_api_id  = aws_api_gateway_rest_api.rest_api.id
  name         = "Empty"
  content_type = "application/json"

  schema = <<EOF
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title" : "Empty Schema",
  "type" : "object"
}
EOF
  lifecycle {
      ignore_changes = [
        schema
      ]
  }
}

resource "aws_api_gateway_model" "Error" {
  rest_api_id  = aws_api_gateway_rest_api.rest_api.id
  name         = "Error"
  content_type = "application/json"

  schema = <<EOF
{
  "$schema" : "http://json-schema.org/draft-04/schema#",
  "title" : "Error Schema",
  "type" : "object",
  "properties" : {
    "message" : { "type" : "string" }
  }
}
EOF
  lifecycle {
      ignore_changes = [
        schema
      ]
  }
}

resource "aws_iam_role" "api-logging" {
  name               = "APIGatewayPushToCloudWatchLogs"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Service": "apigateway.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "api-logging" {
  role       = aws_iam_role.api-logging.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "api-logging" {
  cloudwatch_role_arn = "${aws_iam_role.api-logging.arn}"
}

resource "aws_api_gateway_method_settings" "general_settings" {
  rest_api_id = "${aws_api_gateway_rest_api.rest_api.id}"
  stage_name  = aws_api_gateway_stage.stage.stage_name
  method_path = "*/*"

  settings {
    # Enable CloudWatch logging and metrics
    # metrics_enabled        = true # Detailed Metrics
    logging_level          = "INFO"

    # Limit the rate of calls to prevent abuse and unwanted charges
    throttling_rate_limit  = 100
    throttling_burst_limit = 50
  }
  depends_on = [
    aws_api_gateway_account.api-logging
  ]
}
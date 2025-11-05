resource "aws_api_gateway_resource" "plaid" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_resource.integration.id
  path_part   = "plaid"
}
resource "aws_api_gateway_resource" "webhook" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_resource.plaid.id
  path_part   = "webhook"
}

resource "aws_api_gateway_resource" "webhook_proxy" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_resource.webhook.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "webhook_proxy_method" {
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  resource_id   = aws_api_gateway_resource.webhook_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "webhook_integration" {
  http_method             = aws_api_gateway_method.webhook_proxy_method.http_method
  resource_id             = aws_api_gateway_resource.webhook_proxy.id
  rest_api_id             = aws_api_gateway_rest_api.rest_api.id
  type                    = "AWS_PROXY"
  integration_http_method = "ANY"
  uri                     = module.plaid_routing_function_lambda.lambda_function_invoke_arn

  depends_on = [
    module.plaid_routing_function_lambda
  ]
}
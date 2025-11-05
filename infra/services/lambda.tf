data "archive_file" "python_lambda_package" {
  type                   = "zip"  
  source_file            = "${path.module}/code/PlaidRoutingFunction.py" 
  output_path            = "${path.module}/PlaidRoutingFunction.zip"
}

module "plaid_routing_function_lambda" {
  source                 = "terraform-aws-modules/lambda/aws"
  version                = "6.3.0"
  function_name          = "PlaidRoutingFunction"
  description            = "Lambda triggers for PlaidRoutingFunction"
  handler                = "PlaidRoutingFunction.lambda_handler"
  runtime                = "python3.9"
  vpc_subnet_ids         = data.terraform_remote_state.vpc.outputs.private_subnets
  vpc_security_group_ids = [data.aws_security_group.default.id]
  attach_network_policy  = true
  timeout                = 180
  attach_policy          = true
  policy                 = "arn:aws:iam::aws:policy/service-role/AWSAppSyncPushToCloudWatchLogs"
  create_current_version_allowed_triggers = false
  
  create_package         = false
  local_existing_package = data.archive_file.python_lambda_package.output_path
  
  #ignore_source_code_hash = true
  allowed_triggers = {
    APIGatewayAny = {
      service    = "apigateway"
      source_arn = "arn:aws:execute-api:${var.region}:${var.account}:${aws_api_gateway_rest_api.rest_api.id}/*/*/integration/plaid/webhook/*"
    }
  }

  depends_on = [
    data.archive_file.python_lambda_package
  ]
  
  tags = local.tags
  
}
data "archive_file" "python_lambda_package" {
  type        = "zip"
  source_file = "${path.module}/code/lambda_python_log.py"
  output_path = "lambda_python_log.zip"
}

module "logs_collect_from_lambda" {
  source                 = "terraform-aws-modules/lambda/aws"
  version                = "6.2.0"
  function_name          = "LogsCollectFromLambda"
  description            = "Lambda triggers for Elasticsearch"
  handler                = "lambda_python_log.lambda_handler"
  runtime                = "python3.9"
  vpc_subnet_ids         = data.terraform_remote_state.vpc.outputs.private_subnets
  vpc_security_group_ids = [data.aws_security_group.default.id]
  attach_network_policy  = true
  timeout                = 30
  attach_policy          = true
  policy                 = "arn:aws:iam::aws:policy/service-role/AWSAppSyncPushToCloudWatchLogs"

  create_package         = false
  local_existing_package = "lambda_python_log.zip"
  #ignore_source_code_hash = true

  environment_variables = {
    HOST = "https://${aws_elasticsearch_domain.es.endpoint}"
  }

  tags = local.tags
}

resource "aws_lambda_permission" "CustomMessageForgotPasswordLambdaTrigger" {
  count          = length(var.lambda_names)
  statement_id   = var.lambda_names[count.index]
  action         = "lambda:InvokeFunction"
  function_name  = module.logs_collect_from_lambda.lambda_function_name
  source_account = var.account
  principal      = "logs.amazonaws.com"
  source_arn     = "arn:aws:logs:us-east-1:${var.account}:log-group:/aws/lambda/${var.lambda_names[count.index]}:*"
}

resource "aws_cloudwatch_log_subscription_filter" "custom_message_cloudwatch_trigger" {
  count           = length(var.lambda_names)
  name            = var.lambda_names[count.index]
  log_group_name  = "/aws/lambda/${var.lambda_names[count.index]}"
  filter_pattern  = ""
  destination_arn = module.logs_collect_from_lambda.lambda_function_arn
  distribution    = "ByLogStream"
}
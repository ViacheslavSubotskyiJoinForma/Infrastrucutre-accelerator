resource "aws_sns_topic" "sns_topic_zendesk" {
  count        = var.env == "prod" ? 1 : 0
  name         = "${var.resource_prefix}-SendSafely-Zendesk-SNS-Topic"
  display_name = "${var.resource_prefix}-SendSafely-Zendesk-SNS"
  tags         = local.tags
}

resource "aws_sns_topic_subscription" "sns_topic_subscription_zendesk" {
  count     = var.env == "prod" ? 1 : 0
  topic_arn = aws_sns_topic.sns_topic_zendesk[0].arn
  protocol  = "email"
  endpoint  = var.error_reporting_email
}


resource "aws_dynamodb_table" "dynamodb_table_zendesk" {
  count          = var.env == "prod" ? 1 : 0
  name           = "${var.resource_prefix}-SendSafely-Zendesk-Dynamo"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "itemId"

  attribute {
    name = "itemId"
    type = "S"
  }
  tags = local.tags
}

resource "aws_secretsmanager_secret" "secrets_manager_zendesk" {
  count       = var.env == "prod" ? 1 : 0
  name        = "${var.resource_prefix}-SendSafely-Zendesk-Secrets"
  description = "Secrets for SendSafely Zendesk Connector"
  tags        = local.tags
}

resource "aws_secretsmanager_secret_version" "secrets_manager_version_zendesk" {
  count     = var.env == "prod" ? 1 : 0
  secret_id = aws_secretsmanager_secret.secrets_manager_zendesk[0].id

  secret_string = jsonencode({
    sendsafely_validation_key   = "PUT_YOUR_VALIDATION_KEY_HERE",
    zendesk_user_api_token      = "PUT_YOUR_ZENDESK_API_TOKEN_HERE",
    zendesk_portal_url          = var.zendesk_portal,
    aws_sns_reporting_topic_arn = aws_sns_topic.sns_topic_zendesk[0].arn,
    aws_dynamo_db_table         = aws_dynamodb_table.dynamodb_table_zendesk[0].id,
    zendesk_use_public_comments = var.zendesk_use_public_comments
  })

  lifecycle {
    ignore_changes = [
      secret_string,
    ]
  }
}


resource "aws_lambda_function" "lambda_zendesk" {
  count         = var.env == "prod" ? 1 : 0
  function_name = "${var.resource_prefix}-SendSafely-Zendesk-Lambda"
  description   = "Lambda function for SendSafely Zendesk Connector"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 300
  memory_size   = 128

  s3_bucket = "sendsafely"
  s3_key    = "connectors/ZendeskLambdaConnectorFunction_20210323.zip"

  role = aws_iam_role.lambda_execution_role_zendesk[0].arn

  environment {
    variables = {
      aws_secrets_manager_secret_name = aws_secretsmanager_secret.secrets_manager_zendesk[0].name
    }
  }
  tags = local.tags
}

resource "aws_cloudwatch_log_group" "log_group_zendesk" {
  count = var.env == "prod" ? 1 : 0
  name  = "/aws/lambda/${var.resource_prefix}-SendSafely-Zendesk-Lambda"
  tags  = local.tags
}

resource "aws_iam_role" "lambda_execution_role_zendesk" {
  count = var.env == "prod" ? 1 : 0
  name  = "${var.resource_prefix}-SendSafely-Zendesk-IAM-Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy" "lambda_execution_policy_zendesk" {
  count = var.env == "prod" ? 1 : 0
  name  = "${var.resource_prefix}-SendSafely-Zendesk-Execution-Policy"
  role  = aws_iam_role.lambda_execution_role_zendesk[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "secretsmanager:GetSecretValue",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "sns:Publish"
      ]
      Effect = "Allow"
      Resource = [
        aws_secretsmanager_secret.secrets_manager_zendesk[0].arn,
        aws_cloudwatch_log_group.log_group_zendesk[0].arn,
        aws_dynamodb_table.dynamodb_table_zendesk[0].arn,
        aws_sns_topic.sns_topic_zendesk[0].arn
      ]
    }]
  })
}

resource "aws_apigatewayv2_api" "http_api_zendesk" {
  count         = var.env == "prod" ? 1 : 0
  name          = "${var.resource_prefix}-SendSafely-Zendesk-API-Gateway"
  protocol_type = "HTTP"
  target        = aws_lambda_function.lambda_zendesk[0].arn

  cors_configuration {
    allow_headers = ["*"]
    allow_methods = ["POST"]
    allow_origins = ["https://"]
  }
  tags = local.tags
}

resource "aws_lambda_permission" "lambda_permission_zendesk" {
  count         = var.env == "prod" ? 1 : 0
  action        = "lambda:invokeFunction"
  function_name = aws_lambda_function.lambda_zendesk[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.region}:${var.account}:${aws_apigatewayv2_api.http_api_zendesk[0].id}/*"
}
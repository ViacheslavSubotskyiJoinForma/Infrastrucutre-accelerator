data "archive_file" "ses_python_lambda_package" {
  type        = "zip"
  source_file = "${path.module}/code/SESloggingLambda.py"
  output_path = "${path.module}/SESloggingLambda.zip"
}

resource "aws_ses_configuration_set" "domain_conf_set" {
  name = "DomainConfigurationSet"
}

resource "aws_ses_event_destination" "ses_event_destination" {
  name                   = "ses_event_destination"
  configuration_set_name = aws_ses_configuration_set.domain_conf_set.name
  enabled                = true
  matching_types         = ["send", "reject", "bounce", "complaint", "delivery", "open", "click", "renderingFailure"]

  sns_destination {
    topic_arn = aws_sns_topic.ses_lambda_sns_topic.arn
  }
}


data "aws_iam_policy_document" "ses_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ses_lambda_exec_role" {
  name               = "example_lambda_exec_role"
  assume_role_policy = data.aws_iam_policy_document.ses_assume_role_policy.json
  tags               = local.tags
}

resource "aws_lambda_permission" "ses_allow_execution_from_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ses_lambda_function.arn
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.ses_lambda_sns_topic.arn
}

resource "aws_sns_topic" "ses_lambda_sns_topic" {
  name = "ses-lambda-sns-topic"
  tags = local.tags
}

resource "aws_lambda_function" "ses_lambda_function" {
  filename      = data.archive_file.ses_python_lambda_package.output_path
  function_name = "SESloggingToCloudfront"
  role          = aws_iam_role.ses_lambda_exec_role.arn
  handler       = "SESloggingLambda.lambda_handler"
  runtime       = "python3.9"

  source_code_hash = filebase64sha256(data.archive_file.ses_python_lambda_package.output_path)

  tags = local.tags
}

resource "aws_sns_topic_subscription" "lambda_sns_subscription" {
  topic_arn = aws_sns_topic.ses_lambda_sns_topic.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.ses_lambda_function.arn
}

resource "aws_iam_role_policy_attachment" "ses_lambda_logs" {
  role       = aws_iam_role.ses_lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

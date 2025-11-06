variable "lambda_functions" {
  type = list(string)
  default = [
    "IterableSyncFunction",
    "PlaidRoutingFunction",
    "LogsCollectFromLambda",
    "DataAggregationFunction",
    "HtmlToPdfFunction",
    "ClientDomain-SendSafely-Zendesk-Lambda",
    "ReportingTriggerFunction",
    "BackendDataAlertingFunction",
    "PreTokenGenerationLambdaTrigger",
    "CognitoAuthorizerFunction",
    "PreSignUpLambdaTrigger",
    "DataExportFunction",
    "PostConfirmationLambdaTrigger",
    "SESloggingToCloudfront",
    "CustomMessageForgotPasswordLambdaTrigger"
  ]
}

resource "aws_cloudwatch_metric_alarm" "lambda_error_alarms" {
  count               = var.env == "prod" ? length(var.lambda_functions) : 0
  alarm_name          = format("LambdaErrorAlarm-%s-%s", var.lambda_functions[count.index], var.env)
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = format("Alarm when %s has errors in %s environment", var.lambda_functions[count.index], var.env)
  dimensions = {
    FunctionName = var.lambda_functions[count.index]
  }

  alarm_actions = [aws_sns_topic.SNS_alarm_notification.arn]
  tags          = local.tags
}

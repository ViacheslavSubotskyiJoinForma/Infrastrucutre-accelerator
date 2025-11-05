resource "aws_cloudwatch_metric_alarm" "gateway_5XXError_rate" {
  count               = var.env == "prod" ? 1 : 0
  alarm_name          = "${var.env}-gateway-errors-5XXError"
  comparison_operator = "GreaterThanThreshold"
  alarm_description   = "Gateway error 5XX"
  treat_missing_data  = "notBreaching"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = var.statistic_period
  evaluation_periods  = 1
  threshold           = 0
  statistic           = "Sum"
  unit                = "Count"
  alarm_actions       = [aws_sns_topic.SNS_alarm_notification.arn]
  #ok_actions          = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    ApiName = "gateway"
    Stage = "integration"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "gateway_4XXError_rate" {
  count               = var.env == "prod" ? 1 : 0
  alarm_name          = "${var.env}-gateway-errors-4XXError"
  comparison_operator = "GreaterThanThreshold"
  alarm_description   = "Gateway error 4XX"
  treat_missing_data  = "notBreaching"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = var.statistic_period
  evaluation_periods  = 1
  threshold           = 0
  statistic           = "Sum"
  unit                = "Count"
  alarm_actions       = [aws_sns_topic.SNS_alarm_notification.arn]
  #ok_actions          = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    ApiName = "gateway"
    Stage = "integration"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "gateway_latency" {
  count               = var.env == "prod" ? 1 : 0
  alarm_name          = "${var.env}-gateway-latency"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  alarm_description   = "Gateway Latency over 1000ms"
  treat_missing_data  = "notBreaching"
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = var.statistic_period
  evaluation_periods  = 1
  threshold           = 10000
  statistic           = "Average"
  unit                = "Milliseconds"
  alarm_actions       = [aws_sns_topic.SNS_alarm_notification.arn]
  #ok_actions          = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    ApiName = "gateway"
    Stage = "integration"
  }
  tags = local.tags
}
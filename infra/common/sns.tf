resource "aws_sns_topic" "SNS_alarm_notification" {
  name = "${var.env}-alarms-notifications"
  tags = local.tags
}

resource "aws_sns_topic_subscription" "SNS_alarm_Subscription" {
  count     = length(local.emails)
  topic_arn = aws_sns_topic.SNS_alarm_notification.arn
  protocol  = "email"
  endpoint  = local.emails[count.index]

  depends_on = [
    aws_sns_topic.SNS_alarm_notification
  ]
}
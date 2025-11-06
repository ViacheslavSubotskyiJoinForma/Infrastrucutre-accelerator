output "monitoring_sns_arn" {
  value = aws_sns_topic.SNS_alarm_notification.arn
}
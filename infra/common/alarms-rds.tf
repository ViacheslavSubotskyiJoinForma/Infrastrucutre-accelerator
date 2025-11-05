// CPU Utilization
resource "aws_cloudwatch_metric_alarm" "cpu_utilization_too_high" {
  alarm_name                = "${var.env}-rds-common-one-highCPUUtilization"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "CPUUtilization"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "80"
  alarm_description         = "Average database CPU utilization is too high."
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "common-one"
  }
  tags = local.tags
}

// Memory Utilization
resource "aws_cloudwatch_metric_alarm" "memory_freeable_too_low" {
  alarm_name                = "${var.env}-rds-common-one-lowFreeableMemory"
  comparison_operator       = "LessThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "FreeableMemory"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "256000000" // 256 MB
  alarm_description         = "Average database freeable memory is too low, performance may be negatively impacted."
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "common-one"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "free_storage_space_too_low" {
  alarm_name                = "${var.env}-rds-common-one-freeStorageSpaceTooLow"
  comparison_operator       = "LessThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "FreeLocalStorage"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "1000000000" // 1 GB
  alarm_description         = "Average database free storage space is less than 1 GB"
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "common-one"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "aws_rds_database_connections_average" {
  alarm_name                = "${var.env}-rds-DB-DatabaseConnections"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "DatabaseConnections"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "80"
  alarm_description         = "Average database connections over last 10 minutes too high"
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBClusterIdentifier = "common"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "aws_rds_database_write_latency" {
  alarm_name                = "${var.env}-rds-common-one-writeLatency"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "WriteLatency"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "0.25"
  alarm_description         = "Average database write latency over last 10 minutes too high"
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "common-one"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "aws_rds_database_read_latency" {
  alarm_name                = "${var.env}-rds-common-one-readLatency"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "ReadLatency"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "0.25"
  alarm_description         = "Average database read latency over last 10 minutes too high"
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "common-one"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_queue_depth" {
  alarm_name                = "${var.env}-rds-common-one-DiskQueueDepth"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "DiskQueueDepth"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "10"
  alarm_description         = "The number of outstanding I/Os (read/write requests) waiting to access the disk is too high."
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "common-one"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_read_iops" {
  alarm_name                = "${var.env}-rds-common-one-ReadIOPS"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "ReadIOPS"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "200"
  alarm_description         = "The number of outstanding I/Os (read/write requests) waiting to access the disk is too high."
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "common-one"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_write_iops" {
  alarm_name                = "${var.env}-rds-common-one-WriteIOPS"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "WriteIOPS"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "100"
  alarm_description         = "The number of outstanding I/Os (read/write requests) waiting to access the disk is too high."
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "common-one"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "volume_read_iops" {
  alarm_name                = "${var.env}-rds-DB-VolumeReadIOPs"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "VolumeReadIOPs"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "200"
  alarm_description         = "Average database connections over last 10 minutes too high"
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBClusterIdentifier = "common"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "volume_write_iops" {
  alarm_name                = "${var.env}-rds-DB-VolumeWriteIOPS"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "VolumeWriteIOPS"
  namespace                 = "AWS/RDS"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "100"
  alarm_description         = "Average database connections over last 10 minutes too high"
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBClusterIdentifier = "common"
  }
  tags = local.tags
}
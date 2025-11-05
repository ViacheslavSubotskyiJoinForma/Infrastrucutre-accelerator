// CPU Utilization
resource "aws_cloudwatch_metric_alarm" "cpu_utilization_too_high" {
  for_each                  = toset(data.terraform_remote_state.rds.outputs.cluster_instances)
  alarm_name                = "${var.env}-rds-${each.key}-highCPUUtilization"
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
    DBInstanceIdentifier = each.key
  }
  tags = local.tags
}

// Memory Utilization
resource "aws_cloudwatch_metric_alarm" "memory_freeable_too_low" {
  for_each                  = toset(data.terraform_remote_state.rds.outputs.cluster_instances)
  alarm_name                = "${var.env}-rds-${each.key}-lowFreeableMemory"
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
    DBInstanceIdentifier = each.key
  }
  tags = local.tags
}

//Storage Utilization
resource "aws_cloudwatch_metric_alarm" "free_storage_space_too_low" {
  for_each                  = toset(data.terraform_remote_state.rds.outputs.cluster_instances)
  alarm_name                = "${var.env}-rds-${each.key}-freeStorageSpaceTooLow"
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
    DBInstanceIdentifier = each.key
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
    DBClusterIdentifier = "db"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "aws_rds_database_write_latency" {
  for_each                  = toset(data.terraform_remote_state.rds.outputs.cluster_instances)
  alarm_name                = "${var.env}-rds-${each.key}-writeLatency"
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
    DBInstanceIdentifier = each.key
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "aws_rds_database_read_latency" {
  for_each                  = toset(data.terraform_remote_state.rds.outputs.cluster_instances)
  alarm_name                = "${var.env}-rds-${each.key}-readLatency"
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
    DBInstanceIdentifier = each.key
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_queue_depth" {
  for_each                  = toset(data.terraform_remote_state.rds.outputs.cluster_instances)
  alarm_name                = "${var.env}-rds-${each.key}-DiskQueueDepth"
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
    DBInstanceIdentifier = each.key
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_read_iops" {
  for_each                  = toset(data.terraform_remote_state.rds.outputs.cluster_instances)
  alarm_name                = "${var.env}-rds-${each.key}-ReadIOPS"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "ReadIOPS"
  namespace                 = "AWS/RDS"
  period                    = 900
  statistic                 = "Average"
  threshold                 = "500"
  alarm_description         = "The number of outstanding I/Os (read/write requests) waiting to access the disk is too high."
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = each.key
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_write_iops" {
  for_each                  = toset(data.terraform_remote_state.rds.outputs.cluster_instances)
  alarm_name                = "${var.env}-rds-${each.key}-WriteIOPS"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "WriteIOPS"
  namespace                 = "AWS/RDS"
  period                    = 900
  statistic                 = "Average"
  threshold                 = "900"
  alarm_description         = "The number of outstanding I/Os (read/write requests) waiting to access the disk is too high."
  datapoints_to_alarm       = 8
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = each.key
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
    DBClusterIdentifier = "db"
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
    DBClusterIdentifier = "db"
  }
  tags = local.tags
}

resource "aws_cloudwatch_log_metric_filter" "sql-error" {
  name           = "SQLErrorMetric"
  log_group_name = "/aws/rds/cluster/db/postgresql"
  pattern        = "ERROR"
  metric_transformation {
    name      = "SQLErrorMetric"
    namespace = "SQLErrorMetricsNamespace"
    value     = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "sql-error-alarm" {
  alarm_name                = "${var.env}-sql-error-alarm-from-log"
  metric_name               = aws_cloudwatch_log_metric_filter.sql-error.name
  threshold                 = "0"
  statistic                 = "Sum"
  comparison_operator       = "GreaterThanThreshold"
  datapoints_to_alarm       = "1"
  evaluation_periods        = "1"
  period                    = "60"
  namespace                 = "SQLErrorMetricsNamespace"
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]

  tags = local.tags
}


//SOC2 manual created RDS
// CPU Utilization
resource "aws_cloudwatch_metric_alarm" "cpu_utilization_too_high_replica" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-rds-reporting-instance-1-highCPUUtilization"
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
    DBInstanceIdentifier = "reporting-instance-1"
  }
  tags = local.tags
}

// Memory Utilization
resource "aws_cloudwatch_metric_alarm" "memory_freeable_too_low_replica" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-rds-reporting-instance-1-lowFreeableMemory"
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
    DBInstanceIdentifier = "reporting-instance-1"
  }
  tags = local.tags
}

//Storage Utilization
resource "aws_cloudwatch_metric_alarm" "free_storage_space_too_low_replica" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-rds-reporting-instance-1-freeStorageSpaceTooLow"
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
    DBInstanceIdentifier = "reporting-instance-1"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_queue_depth_replica" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-rds-rds-reporting-instance-1-DiskQueueDepth"
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
    DBInstanceIdentifier = "rds-reporting-instance-1"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_read_iops_replica" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-rds-rds-reporting-instance-1-ReadIOPS"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "ReadIOPS"
  namespace                 = "AWS/RDS"
  period                    = 900
  statistic                 = "Average"
  threshold                 = "500"
  alarm_description         = "The number of outstanding I/Os (read/write requests) waiting to access the disk is too high."
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "rds-reporting-instance-1"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "disk_write_iops_replica" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-rds-rds-reporting-instance-1-WriteIOPS"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "WriteIOPS"
  namespace                 = "AWS/RDS"
  period                    = 900
  statistic                 = "Average"
  threshold                 = "900"
  alarm_description         = "The number of outstanding I/Os (read/write requests) waiting to access the disk is too high."
  datapoints_to_alarm       = 8
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    DBInstanceIdentifier = "rds-reporting-instance-1"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "volume_read_iops_replica" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-rds-reporting-instance-1-rds-DB-VolumeReadIOPs"
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
    DBClusterIdentifier = "reporting"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "volume_write_iops_replica" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-rds-reporting-instance-1-rds-DB-VolumeWriteIOPS"
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
    DBClusterIdentifier = "reporting"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "Consumed_Read_Capacity_Units" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-SendSafely-Zendesk-Dynamo-ConsumedReadCapacityUnits"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "ConsumedReadCapacityUnits"
  namespace                 = "DynamoDB"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "100"
  alarm_description         = "Alarms for ConsumedReadCapacityUnits "
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    TableName = "ClientDomain-SendSafely-Zendesk-Dynamo"
  }
  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "Consumed_Write_Capacity_Units" {
  count                     = var.env == "prod" ? 1 : 0
  alarm_name                = "${var.env}-SendSafely-Zendesk-Dynamo-ConsumedWriteCapacityUnits"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_period
  metric_name               = "ConsumedWriteCapacityUnits"
  namespace                 = "DynamoDB"
  period                    = var.statistic_period
  statistic                 = "Average"
  threshold                 = "100"
  alarm_description         = "Alarms for ConsumedWriteCapacityUnits"
  datapoints_to_alarm       = var.datapoints_to_alarm
  alarm_actions             = [aws_sns_topic.SNS_alarm_notification.arn]
  ok_actions                = [aws_sns_topic.SNS_alarm_notification.arn]
  insufficient_data_actions = [aws_sns_topic.SNS_alarm_notification.arn]

  dimensions = {
    TableName = "ClientDomain-SendSafely-Zendesk-Dynamo"
  }
  tags = local.tags
}
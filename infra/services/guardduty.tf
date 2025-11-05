resource "aws_guardduty_detector" "prodDetector" {
  count  = var.env == "prod" ? 1 : 0
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = false
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
}

resource "aws_cloudwatch_event_rule" "gd-alert-rule" {
  count       = var.env == "prod" ? 1 : 0
  name        = "GuardDuty-Findings-Topic"
  description = "GuardDuty Finding"

  event_pattern = <<EOF
{
  "source": ["aws.guardduty"],
  "region": ["${var.region}"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [6, 6.0, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9]
  }
}
EOF
}

resource "aws_cloudwatch_event_target" "sns-guardduty" {
  count      = var.env == "prod" ? 1 : 0
  rule       = aws_cloudwatch_event_rule.gd-alert-rule[0].name
  arn        = data.terraform_remote_state.monitoring.outputs.monitoring_sns_arn
  target_id  = "SendToSNS"
  depends_on = [aws_cloudwatch_event_rule.gd-alert-rule[0]]
} 
resource "aws_sns_topic" "kyc" {
  name = "KYC"
  tags = local.tags
}

resource "aws_sns_platform_application" "fcm_application" {
  name                      = "KYC"
  platform                  = "GCM"
  platform_credential       = var.platform_credential
  failure_feedback_role_arn = aws_iam_role.sns-failure-feedback.arn
  success_feedback_role_arn = aws_iam_role.sns-success-feedback.arn
}

resource "aws_iam_role" "sns-success-feedback" {
  name = "SNSSuccessFeedback"
  assume_role_policy = "${file("${path.module}/templates/sns-assume.json")}"
  tags = local.tags
}

resource "aws_iam_role" "sns-failure-feedback" {
  name = "SNSFailureFeedback"
  assume_role_policy = "${file("${path.module}/templates/sns-assume.json")}"
  tags = local.tags
}

resource "aws_iam_policy" "sns-failure-feedback-policy" {
  name        = "SNSFailureFeedbackPolicy"
  policy      = "${file("${path.module}/templates/sns-feedback.json")}"
  tags        = local.tags
}

resource "aws_iam_policy" "sns-success-feedback-policy" {
  name        = "SNSSuccessFeedbackPolicy"
  policy      = "${file("${path.module}/templates/sns-feedback.json")}"
  tags        = local.tags
}

resource "aws_iam_policy_attachment" "sns-success-feedback-attach" {
  name       = "sns-success-feedback-attach"
  roles      = [aws_iam_role.sns-success-feedback.name]
  policy_arn = aws_iam_policy.sns-success-feedback-policy.arn
}

resource "aws_iam_policy_attachment" "sns-failure-feedback-attach" {
  name       = "sns-failure-feedback-attach"
  roles      = [aws_iam_role.sns-failure-feedback.name]
  policy_arn = aws_iam_policy.sns-failure-feedback-policy.arn
}

resource "aws_sns_sms_preferences" "update_sms_prefs" {
  delivery_status_success_sampling_rate  = 100
  delivery_status_iam_role_arn           = aws_iam_role.sns-success-feedback.arn
  default_sms_type                       = "Transactional"
}
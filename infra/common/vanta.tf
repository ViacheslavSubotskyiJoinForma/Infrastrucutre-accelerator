resource "aws_iam_role" "vanta-audit" {
  name = "vanta-auditor"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::956993596390:root"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "sts:ExternalId": "D9A26BA33889E1E"
                }
            }
        }
    ]
  })

  tags = local.tags
}

resource "aws_iam_policy" "vanta-management-account-permissions" {
  name        = "VantaManagementAccountPermissions"
  #path        = "/"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "organizations:Describe*",
          "organizations:List*",
          "ecr:DescribeImageScanFindings",
          "ecr:DescribeImages",
          "ecr:ListTagsForResource",
          "ecr:BatchGetRepositoryScanningConfiguration",
          "inspector2:BatchGet*",
          "inspector2:Get*",
          "inspector2:Describe*",
          "inspector2:List*",
          "dynamodb:ListTagsOfResource",
          "sqs:ListQueueTags"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "datapipeline:EvaluateExpression",
          "datapipeline:QueryObjects",
          "rds:DownloadDBLogFilePortion"
        ],
        Effect   = "Deny",
        Resource = "*"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_policy_attachment" "vanta-mang-acc-perm-attach" {
  name       = "vanta-mang-acc-perm-attach"
  roles      = [aws_iam_role.vanta-audit.name]
  policy_arn = aws_iam_policy.vanta-management-account-permissions.arn
}

resource "aws_iam_role_policy_attachment" "vanta-auditor" {
  role       = aws_iam_role.vanta-audit.name
  policy_arn = "arn:aws:iam::aws:policy/SecurityAudit"
}
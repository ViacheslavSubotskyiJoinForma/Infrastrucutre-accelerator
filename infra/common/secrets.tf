resource "aws_secretsmanager_secret" "secret" {
  for_each = toset(var.accounts)
  name     = "secret-${each.key}"

  tags = {
    "env"     = "common"
    "type"    = "shared"
    "account" = "${each.key}"
  }
}

resource "aws_secretsmanager_secret_policy" "secret_policy" {
  for_each   = toset(var.accounts)
  secret_arn = aws_secretsmanager_secret.secret[each.key].arn

  policy = data.aws_iam_policy_document.secret_policy[each.key].json
}

data "aws_iam_policy_document" "secret_policy" {
  for_each = toset(var.accounts)

  statement {
    sid = "EnableAnotherAWSAccountToReadTheSecret"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [
      aws_secretsmanager_secret.secret[each.key].arn
    ]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${each.key}:root"]
    }
  }
}

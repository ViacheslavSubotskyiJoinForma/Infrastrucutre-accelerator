locals {
  cluster_name    = "TEM_${upper(var.env)}"
  cluster_version = "1.28"
  partition       = data.aws_partition.current.partition

  tags = {
    env       = var.env
    Terraform = true
  }

  admin_sso_rolearn = tolist([
    for parts in [for arn in data.aws_iam_roles.admin.arns : split("/", arn)] :
    format("%s/%s", parts[0], element(parts, length(parts) - 1))
  ])[0]

  dev_sso_rolearn = tolist([
    for parts in [for arn in data.aws_iam_roles.dev.arns : split("/", arn)] :
    format("%s/%s", parts[0], element(parts, length(parts) - 1))
  ])[0]
}

locals {
  private_subnets = [
    "${lookup(var.cidr, var.env)}.1.0/24",
    "${lookup(var.cidr, var.env)}.2.0/24",
    "${lookup(var.cidr, var.env)}.3.0/24"
  ]

  database_subnets = [
    "${lookup(var.cidr, var.env)}.61.0/24",
    "${lookup(var.cidr, var.env)}.62.0/24",
    "${lookup(var.cidr, var.env)}.63.0/24"
  ]

  public_subnets = [
    "${lookup(var.cidr, var.env)}.21.0/24",
    "${lookup(var.cidr, var.env)}.22.0/24",
    "${lookup(var.cidr, var.env)}.23.0/24"
  ]
  redshift_subnets = [ # <= must be removed
    "${lookup(var.cidr, var.env)}.41.0/24",
    "${lookup(var.cidr, var.env)}.42.0/24",
    "${lookup(var.cidr, var.env)}.43.0/24"
  ]
  cluster_name = "TEM_${upper(var.env)}"
  tags = {
    env                      = var.env
    "karpenter.sh/discovery" = local.cluster_name
  }
}
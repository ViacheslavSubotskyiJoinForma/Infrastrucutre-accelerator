resource "aws_eip" "nat" {
  count = var.env == "prod" ? var.availability_zone_count : 0

  tags = local.tags
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"

  name = "vpc"
  cidr = "${var.cidr[var.env]}.0.0/16"

  azs              = slice(data.aws_availability_zones.available.names, 0, var.availability_zone_count)
  private_subnets  = local.private_subnets
  public_subnets   = local.public_subnets
  database_subnets = local.database_subnets

  enable_nat_gateway  = true
  single_nat_gateway  = var.env == "prod" ? false : true
  reuse_nat_ips       = var.env == "prod" ? true : false
  external_nat_ip_ids = aws_eip.nat[*].id
  enable_vpn_gateway  = false

  enable_dns_hostnames          = true
  enable_dns_support            = true
  map_public_ip_on_launch       = true
  manage_default_network_acl    = false
  manage_default_route_table    = false
  manage_default_security_group = false

  # Flowlogs (optional - requires IAM permissions)
  enable_flow_log                                 = var.enable_flow_logs
  flow_log_cloudwatch_log_group_retention_in_days = var.enable_flow_logs ? 365 : null
  create_flow_log_cloudwatch_iam_role             = var.enable_flow_logs
  create_flow_log_cloudwatch_log_group            = var.enable_flow_logs
  flow_log_max_aggregation_interval               = var.enable_flow_logs ? 60 : null
  flow_log_traffic_type                           = var.enable_flow_logs ? "ALL" : null

  # Tags are inherited from provider's default_tags - no need to pass explicitly
  # This avoids duplicate tag key conflicts (case-insensitive) with IAM resources
  public_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                      = "1"
  }
}
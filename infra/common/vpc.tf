module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"

  name = "vpc"
  cidr = "10.10.0.0/16"

  azs             = data.aws_availability_zones.available.names
  private_subnets = ["10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
  public_subnets  = ["10.10.21.0/24", "10.10.22.0/24", "10.10.23.0/24"]

  single_nat_gateway = true
  enable_nat_gateway = true
  enable_vpn_gateway = false

  enable_dns_hostnames          = true
  enable_dns_support            = true
  map_public_ip_on_launch       = true
  manage_default_network_acl    = false
  manage_default_route_table    = false
  manage_default_security_group = false

  # Flowlogs
  enable_flow_log                                 = true
  flow_log_cloudwatch_log_group_retention_in_days = 365
  create_flow_log_cloudwatch_iam_role             = true
  create_flow_log_cloudwatch_log_group            = true
  flow_log_max_aggregation_interval               = 60
  flow_log_traffic_type                           = "ALL"

  private_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "owned"
    "karpenter.sh/discovery"                      = local.cluster_name
  }

  tags = {
    env                      = var.env,
    "karpenter.sh/discovery" = local.cluster_name
  }
}

# VPC Peering Config
module "vpc_dev_peering" {
  source  = "grem11n/vpc-peering/aws"
  version = "6.0.0"

  providers = {
    aws.this = aws
    aws.peer = aws.dev
  }

  this_dns_resolution = true
  peer_dns_resolution = true

  this_vpc_id = module.vpc.vpc_id
  peer_vpc_id = data.terraform_remote_state.vpc_dev.outputs.vpc_id

  auto_accept_peering = true

  tags = {
    Name        = "vpc-dev-peering"
    Environment = "dev"
  }
}

module "vpc_uat_peering" {
  source  = "grem11n/vpc-peering/aws"
  version = "6.0.0"

  providers = {
    aws.this = aws
    aws.peer = aws.uat
  }

  this_vpc_id = module.vpc.vpc_id
  peer_vpc_id = data.terraform_remote_state.vpc_uat.outputs.vpc_id

  auto_accept_peering = true

  tags = {
    Name        = "vpc-uat-peering"
    Environment = "uat"
  }
}

module "vpc_prod_peering" {
  source  = "grem11n/vpc-peering/aws"
  version = "6.0.0"

  providers = {
    aws.this = aws
    aws.peer = aws.prod
  }

  this_vpc_id = module.vpc.vpc_id
  peer_vpc_id = data.terraform_remote_state.vpc_prod.outputs.vpc_id

  auto_accept_peering = true

  tags = {
    Name        = "vpc-prod-peering"
    Environment = "prod"
  }
}

output "arn" {
  value = module.eks.cluster_arn
}

output "issuer_url" {
  value = module.eks.cluster_oidc_issuer_url
}

output "oidc_arn" {
  value = module.eks.oidc_provider_arn
}

output "cluster_id" {
  value = module.eks.cluster_name
}

output "admin_arn" {
  value = local.admin_sso_rolearn
}

output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

# Subnets
output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}
output "private_subnets_cidr_blocks" {
  value = module.vpc.private_subnets_cidr_blocks
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "s3_bucket_arn" {
  description = "The ARN of the bucket. Will be of format arn:aws:s3:::bucketname."
  value       = module.lambda.s3_bucket_arn
}
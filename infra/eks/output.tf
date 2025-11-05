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

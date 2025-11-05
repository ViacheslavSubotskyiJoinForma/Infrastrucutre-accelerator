output "cluster_endpoint" {
    value = module.aurora.cluster_endpoint
}

output "cluster_port" {
    value = module.aurora.cluster_port
}

output "cluster_master_username" {
    value     = module.aurora.cluster_master_username
    sensitive = true
}

output "cluster_master_password" {
    value     = module.aurora.cluster_master_password
    sensitive = true
}

output "cluster_arn" {
    value     = module.aurora.cluster_arn
}

output "cluster_database_name" {
    value     = module.aurora.cluster_database_name
}

output "cluster_instances" {
    value     = [
      for instance in module.aurora.cluster_instances: instance.id
    ]
}
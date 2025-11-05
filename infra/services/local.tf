locals {
    tags = {
        Environment = var.env
        Terraform   = "true"
    }
    dns_name        = "${var.env}.${var.dns}"
    gateway_url     = var.env == "prod" ? "api.${var.dns}" : "api.${local.dns_name}"
    external_id     = "phone_id_${random_id.external.hex}"
    admin_url       = var.env == "prod" ? "admin.${var.dns}" : "admin.${local.dns_name}"
    logos_url       = var.env == "prod" ? "logos.${var.dns}" : "logos.${local.dns_name}"
    backend_url     = var.env == "prod" ? "backend.${var.dns}" : "backend.${local.dns_name}"
    email_cognito   = var.env == "prod" ? "${var.dns}" : "${local.dns_name}"
    admin_logs      = "${local.admin_url}-logs"
    master-password = jsondecode(data.aws_secretsmanager_secret_version.rds_user.secret_string)["master_password"]
    user            = jsondecode(data.aws_secretsmanager_secret_version.rds_user.secret_string)["master_username"]
    endpoint        = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["endpoint"]
    port            = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["port"]
    db              = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["dbname"]
    email           = var.env == "prod" ? "zerouser@${var.dns}" : "zerouser@${local.dns_name}"
    ses_domain      = var.env == "prod" ? var.dns : local.dns_name

    source1_cv_ips   = [
        "50.17.190.21",
        "54.235.100.53",
        "23.20.156.152",
        "44.234.243.167",
        "35.163.36.127",
        "54.201.77.211",
        "52.22.202.246",
        "18.211.14.120",
    ]
    source1_prod_ips = [
        "54.145.67.40",
        "52.55.251.193",
        "54.82.158.57",
        "54.68.189.45",
        "44.225.75.117",
        "54.186.22.6"
    ]
    source1_ips = var.env == "prod" ? concat(local.source1_cv_ips, local.source1_prod_ips) : local.source1_cv_ips

    source1_ssh_public_key = var.env == "prod" ? jsondecode(data.aws_secretsmanager_secret_version.source1_ssh_piblic_key[0].secret_string)["source1_ssh_public_key"] : ""

}
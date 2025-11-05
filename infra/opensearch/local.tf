locals {
    dns_name = "${var.env}.${var.dns}"
    tags = {
    Environment = var.env
    Terraform   = "true"
    }
}

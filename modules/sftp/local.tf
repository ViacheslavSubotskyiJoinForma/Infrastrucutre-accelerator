locals {
  secret_key_name = "user_ssh_key_public"
  dns_name        = "${var.env}.${var.dns_name}"
  bucket_name     = "${var.env}-incoming"
  tags = {
    env       = var.env
    Terraform = true
  }
}
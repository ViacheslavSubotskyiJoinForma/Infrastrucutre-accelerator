output "dns_public_servers" {
  value = aws_route53_zone.public_dns.name_servers
}
output "dns_public_arn" {
  value = aws_route53_zone.public_dns.arn
}
output "public_acm_arn" {
  value = aws_acm_certificate.public_acm.arn
}
output "dns_name" {
  value = local.dns_name
}

output "email_user_pool_id" {
  value = aws_cognito_user_pool.email.id
}

output "phone_user_pool_id" {
  value = aws_cognito_user_pool.phone.id
}

output "email_user_pool_id_client_id" {
  value = aws_cognito_user_pool_client.autotest.id
}

output "phone_user_pool_id_client_id" {
  value = aws_cognito_user_pool_client.postman.id
}

output "zone_id" {
  value = aws_route53_zone.public_dns.zone_id
}
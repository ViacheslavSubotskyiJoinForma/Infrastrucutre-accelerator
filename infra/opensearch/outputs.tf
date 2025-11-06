output "es_endpoint" {
  description = "ElasticSearch endpoint"
  value       = aws_elasticsearch_domain.es.endpoint
}
output "local_filename_lambda" {
  value = module.logs_collect_from_lambda.local_filename
}

output "lambda_function_source_code_hash_lambda" {
  value = module.logs_collect_from_lambda.lambda_function_source_code_hash
}

output "lambda_function_source_code_size_lambda" {
  value = module.logs_collect_from_lambda.lambda_function_source_code_size
}
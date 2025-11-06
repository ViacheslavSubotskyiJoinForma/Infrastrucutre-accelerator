output "bucket_arn" {
  value = {
    for k, v in aws_s3_bucket.sftp_bucket : k => v.arn
  }
}

output "bucket_id" {
  value = {
    for k, v in aws_s3_bucket.sftp_bucket : k => v.id
  }
}

output "endpoint" {
  value = aws_transfer_server.sftp.endpoint
}

output "arn" {
  value = aws_transfer_server.sftp.arn
}

output "id" {
  value = aws_transfer_server.sftp.id
}
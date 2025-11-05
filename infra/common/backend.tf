terraform {
  backend "s3" {
    encrypt        = true
    bucket         = "tf-state-us-east-1-<ID>"
    key            = "common/service/tf.state"
    dynamodb_table = "tf-lock-us-east-1-<ID>"
    region         = "us-east-1"
  }
}

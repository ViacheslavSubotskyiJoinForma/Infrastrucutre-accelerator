# Terraform Backend Component

This component creates the foundational infrastructure for Terraform state management:
- **S3 Bucket** - For storing Terraform state files
- **DynamoDB Table** - For state locking and consistency

## Features

### S3 Bucket
- ✅ Versioning enabled (90-day retention for old versions)
- ✅ Server-side encryption (AES256)
- ✅ Public access blocked
- ✅ TLS-only access enforced
- ✅ Lifecycle policies for cleanup

### DynamoDB Table
- ✅ Pay-per-request billing (cost-effective)
- ✅ Point-in-time recovery enabled
- ✅ Automatic scaling

## Usage

### 1. Deploy First

This component **must be deployed first** before any other components because it creates the backend infrastructure.

```bash
cd infra/terraform-backend
terraform init
terraform plan -var-file=../config/dev.tfvars
terraform apply -var-file=../config/dev.tfvars
```

### 2. Note the Outputs

After deployment, note these outputs:
```bash
terraform output s3_bucket_name
terraform output dynamodb_table_name
```

### 3. Configure Other Components

Use the outputs to configure backend for other components (VPC, EKS, RDS, etc.):

```hcl
terraform {
  backend "s3" {
    bucket         = "your-project-terraform-state-123456789012"
    key            = "dev/vpc/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "your-project-terraform-locks"
    encrypt        = true
  }
}
```

## Important Notes

### Bootstrap Component

This component uses **local backend** because it creates the S3 backend that other components will use. This is a chicken-and-egg situation that requires local state for the backend component itself.

### State File Security

⚠️ **Critical**: The `terraform.tfstate` file for this component contains sensitive information:
- S3 bucket name
- DynamoDB table name
- AWS account ID

**Recommendations:**
1. Store the state file in a secure location (encrypted drive, secrets manager)
2. Consider using a separate S3 backend for team collaboration
3. Add `terraform.tfstate*` to `.gitignore`
4. Use version control for team access (with encryption)

### One Per AWS Account

Typically, you deploy **one** terraform-backend per AWS account, and all environments (dev/uat/prod) use the same S3 bucket with different key prefixes:

```
s3://project-terraform-state-123456789012/
├── dev/
│   ├── vpc/terraform.tfstate
│   ├── eks-auto/terraform.tfstate
│   └── rds/terraform.tfstate
├── uat/
│   ├── vpc/terraform.tfstate
│   └── ...
└── prod/
    ├── vpc/terraform.tfstate
    └── ...
```

## Cost Estimate

- **S3**: ~$0.023/GB/month + minimal request costs
- **DynamoDB**: ~$0.00013 per read/write (pay-per-request)

**Typical monthly cost**: < $1 for small teams

## Resources Created

| Resource | Name Pattern | Purpose |
|----------|--------------|---------|
| S3 Bucket | `{project}-terraform-state-{account}` | State storage |
| DynamoDB Table | `{project}-terraform-locks` | State locking |

## Migration from Local to S3 Backend

If migrating existing components from local to S3 backend:

1. Deploy this terraform-backend component first
2. Update `backend.tf` in each component
3. Run `terraform init -migrate-state` in each component
4. Confirm the migration when prompted
5. Verify state is in S3: `aws s3 ls s3://{bucket}/{key}`

## Security Best Practices

✅ Versioning enabled - Recover from accidental deletions
✅ Encryption at rest - AES256 encryption
✅ TLS-only policy - Prevents unencrypted transfers
✅ Public access blocked - No public access allowed
✅ Point-in-time recovery - DynamoDB backup capability

## Troubleshooting

### State Locking Errors

If you see "Error acquiring the state lock":
```bash
# List locks
aws dynamodb scan --table-name {project}-terraform-locks

# Force unlock (use with caution!)
terraform force-unlock {LOCK_ID}
```

### Bucket Already Exists

S3 bucket names are globally unique. If you see "BucketAlreadyExists":
- Change project name
- Use a different AWS account ID suffix
- Manually specify a unique bucket name

## Next Steps

After deploying this component:
1. ✅ Update `backend.tf` in VPC component
2. ✅ Update `backend.tf` in EKS-Auto component
3. ✅ Update `backend.tf` in RDS component
4. ✅ Run `terraform init -migrate-state` in each component

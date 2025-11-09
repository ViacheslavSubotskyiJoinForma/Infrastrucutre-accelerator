# Terraform Backend Component

This component creates the foundational infrastructure for Terraform state management:
- **S3 Bucket** - For storing Terraform state files with native state locking

## Features

### S3 Bucket with Native State Locking
- ✅ **Native state locking** - Uses S3 Conditional Writes (Terraform 1.10+, no DynamoDB needed)
- ✅ Versioning enabled (90-day retention for old versions)
- ✅ Server-side encryption (AES256)
- ✅ Public access blocked
- ✅ TLS-only access enforced
- ✅ Lifecycle policies for cleanup

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

After deployment, note the S3 bucket name:
```bash
terraform output s3_bucket_name
```

### 3. Configure Other Components

Use the bucket name to configure backend for other components (VPC, EKS, RDS, etc.):

```hcl
terraform {
  backend "s3" {
    bucket       = "your-project-terraform-state-123456789012"
    key          = "dev/vpc/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true  # S3 native locking (Terraform 1.10+)
  }
}
```

## Important Notes

### Bootstrap Component

This component uses **local backend** because it creates the S3 backend that other components will use. This is a chicken-and-egg situation that requires local state for the backend component itself.

### State File Security

⚠️ **Critical**: The `terraform.tfstate` file for this component contains sensitive information:
- S3 bucket name
- AWS account ID
- Resource ARNs

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
- **No DynamoDB costs** - Native S3 locking is free

**Typical monthly cost**: < $0.50 for small teams (significantly reduced from DynamoDB-based approach)

## Resources Created

| Resource | Name Pattern | Purpose |
|----------|--------------|---------|
| S3 Bucket | `{project}-terraform-state-{account}` | State storage with native locking |

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
✅ Native S3 locking - Uses S3 Conditional Writes (Terraform 1.10+)

## Troubleshooting

### State Locking Errors

If you see "Error acquiring the state lock":
```bash
# S3 native locking uses .tflock files in the bucket
# List lock files
aws s3 ls s3://{bucket}/{environment}/{component}/ | grep tflock

# Force unlock (use with caution!)
terraform force-unlock {LOCK_ID}

# Or manually delete the lock file (extreme caution!)
aws s3 rm s3://{bucket}/{environment}/{component}/terraform.tfstate.tflock
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

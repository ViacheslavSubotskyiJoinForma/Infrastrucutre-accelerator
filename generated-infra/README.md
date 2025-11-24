# test-format-check Infrastructure

Generated Terraform infrastructure using template generator.

## Components

- vpc

## Environments

- dev

## Prerequisites

- Terraform >= 1.2.0
- AWS CLI configured
- GitLab CI/CD (optional)

## Directory Structure

```
infra/
  vpc/
  config/  # Environment-specific .tfvars files (gitignored)
```

## Usage

### 1. Configure Environment Variables

Create `.tfvars` files in `infra/config/`:

```bash
cp infra/config/sample.tfvars.example infra/config/dev.tfvars
# Edit dev.tfvars with your values
```

### 2. Initialize Terraform

```bash
cd infra/<component>
terraform init
```

### 3. Plan Changes

```bash
terraform plan -var-file=../config/${ENV}.tfvars
```

### 4. Apply Changes

```bash
terraform apply -var-file=../config/${ENV}.tfvars
```

## Deployment Order

Components must be deployed in this order due to dependencies:

1. vpc

## GitLab CI/CD

The repository includes a `.gitlab-ci.yml` file that automates:
- **Validate**: Runs fmt and validate checks
- **Plan**: Creates execution plans per environment
- **Apply**: Manual approval required on main branch

## Configuration

Backend Type: **LOCAL**
- **State Storage**: Local (terraform.tfstate in each component directory)
- **State Locking**: None (local backend only)
- **Region**: `us-east-1`
- **AWS Account**: `156041409155`

**Note**: For production use, consider migrating to S3 backend with native state locking (Terraform 1.10+).


## VPC Flow Logs

VPC Flow Logs are **enabled by default** for production use.

For local testing with limited IAM permissions (e.g., AWS Contributor role), disable Flow Logs:

```bash
# Add to your .tfvars file:
enable_flow_logs = false
```

**Note**: Flow Logs require permissions to create IAM roles and CloudWatch Log Groups. Disable this setting if testing locally with limited permissions.

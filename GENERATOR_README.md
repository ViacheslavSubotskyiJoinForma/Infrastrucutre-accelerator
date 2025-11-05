# Infrastructure Template Generator

Automated Terraform infrastructure generation system with GitHub Actions workflow.

## Overview

This repository provides a template-based infrastructure generator that creates customized Terraform configurations based on your requirements. It includes:

- **Modular Components**: VPC, RDS, EKS, Services, Secrets, OpenSearch, Monitoring, Common
- **GitHub Actions Workflow**: UI-driven generation with validation
- **Automatic Validation**: terraform fmt, validate, and tflint checks
- **GitLab CI/CD**: Auto-generated pipeline configuration
- **Ready-to-use Artifacts**: Compressed archive with all generated code

## Quick Start

### Using GitHub Actions (Recommended)

1. **Navigate to Actions tab** in GitHub
2. **Select "Generate Infrastructure Template"** workflow
3. **Click "Run workflow"**
4. **Fill in the form**:
   - Project name (e.g., `my-project`)
   - Select components you need
   - Specify environments (e.g., `dev,uat,prod`)
   - Configure AWS region and other settings
5. **Wait for completion** (~2-3 minutes)
6. **Download the artifact** from the workflow run
7. **Extract and use** the generated infrastructure

### Using Command Line

```bash
# Install dependencies
pip install -r requirements.txt

# Generate infrastructure
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components vpc,rds,eks,services \
  --environments dev,uat,prod \
  --region us-east-1 \
  --state-bucket my-tf-state-bucket \
  --dynamodb-table my-tf-lock-table

# Output will be in generated-infra/
```

## Components

### Available Components

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| **vpc** | VPC, subnets, NAT gateways, flow logs | None |
| **rds** | Aurora PostgreSQL database | vpc |
| **secrets** | AWS Secrets Manager resources | eks, services |
| **eks** | EKS cluster with addons | vpc |
| **services** | API Gateway, Lambda, Cognito, S3, SES, CloudFront, NLB | vpc, eks |
| **opensearch** | OpenSearch cluster | vpc, services, eks |
| **monitoring** | Grafana and metrics | vpc, eks, services, rds |
| **common** | Management account resources (GitLab runner, ECR, Retool) | None |

### Component Selection

The generator automatically includes required dependencies. For example:
- Selecting `services` will automatically include `vpc` and `eks`
- Selecting `monitoring` will include `vpc`, `eks`, `services`, and `rds`

## GitHub Actions Workflow

### Workflow Inputs

#### Required
- **project_name**: Name for your project (used in resource naming)
- **component_preset**: Choose from predefined component sets
  - `minimal` - VPC only (basic networking)
  - `standard` - VPC, RDS, EKS, Services (typical application stack)
  - `full-stack` - All components except common (complete infrastructure)
  - `kubernetes` - VPC, EKS, Monitoring (K8s-focused)
  - `custom` - Specify your own components
- **environments**: Comma-separated list (e.g., `dev,uat,prod`)

#### Optional
- **custom_components**: If preset=custom, specify components (e.g., `vpc,rds,eks,services,secrets,opensearch,monitoring,common`)
- **region**: AWS region (default: `us-east-1`)
- **state_bucket**: S3 bucket for Terraform state (auto-generated if empty)
- **dynamodb_table**: DynamoDB table for state locking (auto-generated if empty)
- **use_assume_role**: Enable AWS role assumption (default: true)

### Component Presets

| Preset | Components | Use Case |
|--------|-----------|----------|
| **minimal** | vpc | Basic networking setup for testing or manual resource deployment |
| **standard** | vpc, rds, eks, services | Typical web application with database, Kubernetes, and API services |
| **full-stack** | vpc, rds, secrets, eks, services, opensearch, monitoring | Complete production infrastructure with all features |
| **kubernetes** | vpc, eks, monitoring | Kubernetes-focused deployment with monitoring |
| **custom** | (specify your own) | Maximum flexibility - choose exactly what you need |

### Workflow Steps

1. **Checkout repository**
2. **Set up Python** and install dependencies
3. **Build component list** from selected preset or custom input
4. **Generate infrastructure** using template generator
5. **Validate Terraform**:
   - Initialize (without backend)
   - Format check
   - Configuration validation
   - tflint analysis
6. **Create validation report**
7. **Create compressed archive**
8. **Upload as artifact** (retained for 30 days)
9. **Generate summary** with results

## Generated Structure

```
generated-infra/
├── .gitlab-ci.yml              # GitLab CI/CD pipeline
├── README.md                   # Usage instructions
├── VALIDATION_REPORT.md        # Terraform validation results
└── infra/
    ├── vpc/                    # VPC component
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   ├── provider.tf
    │   ├── backend.tf
    │   ├── locals.tf
    │   └── data.tf
    ├── rds/                    # RDS component (if selected)
    ├── eks/                    # EKS component (if selected)
    ├── services/               # Services component (if selected)
    └── config/                 # Configuration directory
        ├── README.md
        └── sample.tfvars.example
```

## Usage After Generation

### 1. Extract the Archive

```bash
tar -xzf infrastructure-my-project-YYYYMMDD-HHMMSS.tar.gz
cd generated-infra/
```

### 2. Configure Environments

Create `.tfvars` files for each environment:

```bash
cd infra/config/

# Copy sample
cp sample.tfvars.example dev.tfvars

# Edit with your values
nano dev.tfvars
```

Example `dev.tfvars`:
```hcl
env     = "dev"
account = "123456789012"  # Your AWS Account ID
region  = "us-east-1"
dns     = "example.com"

# Component-specific variables
# (See sample.tfvars.example for all available options)
```

### 3. Deploy Infrastructure

#### Using Terraform Directly

```bash
# Initialize
cd infra/vpc
terraform init -backend-config="key=dev/vpc/tf.state"

# Plan
terraform plan -var-file=../config/dev.tfvars

# Apply
terraform apply -var-file=../config/dev.tfvars
```

Repeat for each component in dependency order (see README.md in generated output).

#### Using GitLab CI/CD

1. **Push to GitLab repository**
2. **Create feature branch** and make changes
3. **Pipeline automatically runs Plan** on push
4. **Merge to main branch**
5. **Manually trigger Apply** in pipeline

## Validation Checks

The workflow performs these validations:

### 1. Terraform Init
```bash
terraform init -backend=false
```
Validates provider configurations and module sources.

### 2. Terraform Format
```bash
terraform fmt -check -recursive
```
Checks code formatting consistency. Auto-fixes if needed.

### 3. Terraform Validate
```bash
terraform validate
```
Validates configuration syntax and internal consistency.

### 4. TFLint
```bash
tflint --init
tflint
```
Additional linting for best practices and potential issues.

## Customization

### Adding New Templates

1. Create template files in `template-modules/<component>/`:
   ```
   template-modules/
   └── my-component/
       ├── main.tf.j2
       ├── variables.tf.j2
       ├── outputs.tf.j2
       ├── provider.tf.j2
       └── backend.tf.j2
   ```

2. Use Jinja2 syntax for templating:
   ```hcl
   resource "aws_s3_bucket" "example" {
     bucket = "{{ project_name }}-bucket"

     tags = {
       Project = "{{ project_name }}"
       Region  = "{{ region }}"
     }
   }
   ```

3. Update `AVAILABLE_COMPONENTS` and `DEPENDENCIES` in `generate_infrastructure.py`

### Modifying the Generator

Edit `scripts/generators/generate_infrastructure.py`:

- Add new template variables in `context` dictionary
- Modify component dependencies in `DEPENDENCIES`
- Customize GitLab CI/CD template generation
- Add validation steps

### Customizing the Workflow

Edit `.github/workflows/generate-infrastructure.yml`:

- Add new input parameters
- Modify validation steps
- Add additional checks (security scanning, cost estimation, etc.)
- Customize artifact retention

## Troubleshooting

### Generator Fails

**Issue**: Python script errors
```bash
# Check Python version (requires 3.8+)
python3 --version

# Install dependencies
pip install -r requirements.txt

# Run with verbose output
python3 -v scripts/generators/generate_infrastructure.py ...
```

### Terraform Validation Fails

**Issue**: Validation errors in workflow

1. Download the artifact anyway (partial generation)
2. Review error messages in workflow logs
3. Fix template files in `template-modules/`
4. Re-run workflow

### Missing Templates

**Issue**: Component has no template

The generator will copy files from `infra/<component>/` as fallback. To create proper templates:

1. Copy files to `template-modules/<component>/`
2. Rename to `.j2` extension
3. Add Jinja2 template variables
4. Test generation

### GitLab CI/CD Issues

**Issue**: Pipeline fails

Common fixes:
- Ensure `.tfvars` files exist in `infra/config/`
- Verify AWS credentials are configured in GitLab
- Check S3 bucket and DynamoDB table exist
- Review variable names match across files

## Best Practices

### Security

- ✅ Never commit `.tfvars` files (they're gitignored)
- ✅ Store sensitive values in AWS Secrets Manager
- ✅ Use IAM roles with least privilege
- ✅ Enable MFA for production deployments
- ✅ Review generated code before applying

### State Management

- ✅ Use separate state files per component and environment
- ✅ Enable S3 versioning on state bucket
- ✅ Use DynamoDB for state locking
- ✅ Implement state backup strategy
- ✅ Consider Terraform Cloud/Enterprise for teams

### Deployment

- ✅ Deploy components in dependency order
- ✅ Test in dev before uat/prod
- ✅ Use `terraform plan` before every apply
- ✅ Tag all resources consistently
- ✅ Document any manual changes

### Maintenance

- ✅ Keep Terraform versions consistent
- ✅ Update provider versions regularly
- ✅ Review and update module versions
- ✅ Maintain CLAUDE.md with infrastructure changes
- ✅ Document customizations in README

## Examples

### Minimal Setup (VPC only)

```bash
python3 scripts/generators/generate_infrastructure.py \
  --project-name minimal-infra \
  --components vpc \
  --environments dev \
  --region us-west-2
```

### Full Stack (All components)

```bash
python3 scripts/generators/generate_infrastructure.py \
  --project-name full-stack \
  --components vpc,rds,secrets,eks,services,opensearch,monitoring,common \
  --environments dev,staging,prod \
  --region eu-west-1 \
  --state-bucket my-company-terraform-state \
  --dynamodb-table my-company-terraform-locks
```

### Kubernetes-focused

```bash
python3 scripts/generators/generate_infrastructure.py \
  --project-name k8s-cluster \
  --components vpc,eks,monitoring \
  --environments dev,prod \
  --region ap-southeast-1
```

## Support

### Documentation

- **Terraform**: https://www.terraform.io/docs
- **AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws
- **Jinja2**: https://jinja.palletsprojects.com/

### Issues

Report issues with the generator:
1. Check existing issues in repository
2. Provide workflow run logs
3. Include generated files (sanitized)
4. Specify inputs used

## License

This infrastructure generator is part of the Infrastructure Accelerator project.

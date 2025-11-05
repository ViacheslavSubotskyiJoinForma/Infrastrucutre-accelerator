# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Terraform infrastructure-as-code repository for managing AWS infrastructure across multiple environments (dev, uat, prod) using an AWS Organizations setup with cross-account role assumptions.

## Infrastructure Architecture

The infrastructure is organized into modular layers that must be deployed in a specific order due to dependencies:

1. **vpc/** - VPC, subnets, NAT gateways, flow logs (foundational networking)
2. **rds/** - RDS database instances
3. **secrets/** - AWS Secrets Manager resources
4. **eks/** - EKS cluster, node groups, Karpenter, external-dns, metrics-server
5. **services/** - Application layer (API Gateway, Lambda, Cognito, S3, SES, CloudFront CDN, NLB, GuardDuty)
6. **opensearch/** - OpenSearch cluster and configuration
7. **monitoring/** - Grafana and metrics infrastructure
8. **common/** - Management account resources shared across environments (GitLab runner, ECR, Retool, Grafana, Okta integration, RDS, Karpenter, VPN)

### Multi-Account Structure

- **Management Account**: Hosts common resources in `infra/common/`
- **Environment Accounts**: Each environment (dev/uat/prod) has a dedicated AWS account
- Provider configurations in `infra/common/provider.tf` define cross-account role assumptions using `OrganizationAccountAccessRole`

## Terraform Commands

### Initialization

Each infrastructure layer is independent and requires separate initialization:

```bash
cd infra/<layer>  # e.g., vpc, eks, services, etc.
terraform init -backend-config="key=${ENV}/<layer>/tf.state"
```

### Planning Changes

```bash
# Must be in the specific layer directory
terraform plan -var-file=../config/${ENV}.tfvars
```

Note: `.tfvars` files are gitignored. Configuration files should be located in `infra/config/` directory (not committed to repo).

### Applying Changes

```bash
terraform apply -var-file=../config/${ENV}.tfvars
```

### Validating Configuration

```bash
terraform validate
```

## GitLab CI/CD Pipeline

The repository uses GitLab CI/CD with three stages: Init, Plan, Apply.

- **Terraform version**: 1.5.4 (installed in pipeline)
- **Image**: postgres:15.3-alpine3.18
- **State backend**: S3 bucket with DynamoDB table for state locking
- **Automatic plan**: Triggered on non-main branch pushes when files in a layer change
- **Manual apply**: Only allowed on main branch, requires manual approval

### Pipeline Triggers

Plans run automatically when changes are detected in:
- `monitoring/**/*`
- `vpc/**/*`
- `rds/**/*`
- `secrets/**/*`
- `eks/**/*`
- `services/**/*`
- `opensearch/**/*`

## Remote State References

Infrastructure layers reference outputs from other layers via `terraform_remote_state` data sources. For example:
- EKS layer references VPC outputs for `vpc_id` and `private_subnets`
- Services layer references EKS cluster information for Kubernetes/Helm providers

## Provider Versions

- **Terraform**: >= 1.2.0
- **AWS**: 5.23.0
- **Kubernetes**: 2.23.0 (services), 2.36.0 (common)
- **Helm**: 2.11.0
- **Kubectl**: ~> 1.14
- **Okta**: 4.5.0
- **PostgreSQL**: 1.21.0

## Key Resources

### EKS Configuration
- Cluster addons: coredns, kube-proxy, vpc-cni, aws-ebs-csi-driver
- Karpenter for node autoscaling
- External-dns for DNS management
- Metrics-server for resource metrics
- Private endpoint access (public access disabled)

### Services Layer
- API Gateway with Lambda integration
- Cognito for authentication
- CloudFront CDN
- S3 buckets with logging
- SES for email services
- Network Load Balancer
- GuardDuty for security monitoring
- Zendesk integration

### Common Layer (Management Account)
- GitLab runner infrastructure
- ECR repositories
- Retool deployment
- Grafana
- Okta SSO integration
- VPN resources

## Modules

Custom modules are located in `modules/`:
- **sftp/**: SFTP server module with data sources, outputs, and variables

## Infrastructure Template Generator

This repository includes an automated infrastructure template generator that creates customized Terraform configurations.

### Overview

- **Location**: `scripts/generators/generate_infrastructure.py`
- **Templates**: `template-modules/` (Jinja2 templates for each component)
- **Workflow**: `.github/workflows/generate-infrastructure.yml` (GitHub Actions)
- **Documentation**: `GENERATOR_README.md`

### Quick Usage

#### Via GitHub Actions (Recommended)
1. Go to Actions tab → "Generate Infrastructure Template"
2. Click "Run workflow"
3. Select desired components (VPC, RDS, EKS, Services, etc.)
4. Configure environments and AWS settings
5. Download generated artifact (compressed archive)

#### Via Command Line
```bash
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components vpc,rds,eks \
  --environments dev,uat,prod \
  --region us-east-1
```

### Generated Output

Creates a complete infrastructure project:
- Terraform code for selected components
- GitLab CI/CD pipeline configuration (`.gitlab-ci.yml`)
- README with deployment instructions
- Configuration templates
- Validation report

### Component Dependencies

The generator automatically resolves dependencies:
- **vpc**: No dependencies (foundational)
- **rds**: Requires vpc
- **eks**: Requires vpc
- **services**: Requires vpc, eks
- **secrets**: Requires eks, services
- **opensearch**: Requires vpc, services, eks
- **monitoring**: Requires vpc, eks, services, rds
- **common**: Independent (management account)

### Validation

The workflow automatically validates generated code:
- `terraform init` - Provider and module validation
- `terraform fmt` - Code formatting check
- `terraform validate` - Configuration syntax validation
- `tflint` - Best practices and linting

### Customization

- **Templates**: Edit files in `template-modules/<component>/*.j2`
- **Generator**: Modify `scripts/generators/generate_infrastructure.py`
- **Workflow**: Update `.github/workflows/generate-infrastructure.yml`

See `GENERATOR_README.md` for detailed documentation.

## Important Notes

- All provider configurations assume roles across AWS accounts using `OrganizationAccountAccessRole`
- The common layer uses multiple AWS provider aliases (dev, uat, prod) to manage resources across accounts
- State files are isolated per environment and layer: `${ENV}/${TF_ROOT}/tf.state`
- Kubernetes and Helm providers authenticate using EKS cluster endpoints
- PostgreSQL provider connects to RDS instances using credentials from random_password resource

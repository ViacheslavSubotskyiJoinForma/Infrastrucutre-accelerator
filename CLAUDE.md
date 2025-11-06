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
3. Select desired components (VPC, EKS-Auto, etc.)
4. Configure environments and AWS settings
5. Download generated artifact (ZIP archive)

#### Via Command Line

**Prerequisites**: Python 3.11+ with virtual environment

```bash
# First time setup: Create and activate virtual environment
source .venv/bin/activate

# Install dependencies (if not already installed)
pip install jinja2

# Generate infrastructure
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components vpc,eks-auto \
  --environments dev,uat,prod \
  --region us-east-1 \
  --aws-account-id YOUR_ACCOUNT_ID \
  --aws-profile YOUR_PROFILE
```

**Important**: Always use `.venv/bin/activate` before running the generator locally.

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
- **eks-auto**: Requires vpc (EKS Auto Mode - simplified cluster with automatic node management)
- **rds**: Requires vpc (future)
- **eks**: Requires vpc (future - traditional EKS with manual node groups)
- **services**: Requires vpc, eks (future)
- **secrets**: Requires eks, services (future)
- **opensearch**: Requires vpc, services, eks (future)
- **monitoring**: Requires vpc, eks, services, rds (future)
- **common**: Independent (management account, future)

### Validation

The workflow automatically validates generated code:
- `terraform init` - Provider and module validation
- `terraform fmt` - Code formatting check
- `terraform validate` - Configuration syntax validation
- `tflint` - Best practices and linting
- `gitlab-ci-local` - GitLab CI pipeline validation

### Testing

**Automated testing** is performed via GitHub Actions workflow. The generator has been tested with:
- ✅ Local generation: `vpc+eks-auto` components
- ✅ Terraform validation: init, fmt, validate all pass
- ✅ VPC deployment: Successfully tested apply and destroy
- ⚠️ EKS-Auto deployment: Plan works, but apply requires elevated IAM permissions beyond AWS Contributor role

**Local testing** (when needed):
```bash
# Use venv for dependencies
source .venv/bin/activate

# Generate infrastructure
python3 scripts/generators/generate_infrastructure.py \
  --project-name test \
  --components vpc,eks-auto \
  --environments dev \
  --aws-profile YOUR_PROFILE

# Test in generated directory
cd generated-infra/infra/vpc
terraform init
terraform plan -var-file=../config/dev.tfvars
```

**Note**: Do not test manually via GitHub Actions unless investigating specific workflow issues. All standard testing is automated.

### Customization

- **Templates**: Edit files in `template-modules/<component>/*.j2`
  - Use `{%-` for Jinja2 whitespace control to avoid formatting issues
  - Always run `terraform fmt` on generated output to verify
- **Generator**: Modify `scripts/generators/generate_infrastructure.py`
- **Workflow**: Update `.github/workflows/generate-infrastructure.yml`

See `GENERATOR_README.md` for detailed documentation.

## Important Notes

- All provider configurations assume roles across AWS accounts using `OrganizationAccountAccessRole`
- The common layer uses multiple AWS provider aliases (dev, uat, prod) to manage resources across accounts
- State files are isolated per environment and layer: `${ENV}/${TF_ROOT}/tf.state`
- Kubernetes and Helm providers authenticate using EKS cluster endpoints
- PostgreSQL provider connects to RDS instances using credentials from random_password resource

## Security & Configuration Guidelines

### Sensitive Data Management

This repository has been sanitized for public/shared use. All sensitive data has been replaced with placeholders:

#### AWS Account IDs
Real AWS Account IDs have been replaced with synthetic values:
- **Management account**: `111111111111` (placeholder)
- **Dev account**: `222222222222` (placeholder)
- **UAT account**: `333333333333` (placeholder)
- **Prod account**: `444444444444` (placeholder)
- **Vanta account**: `999999999999` (placeholder)

**Action Required**: Replace these placeholders in the following files with your actual AWS Account IDs:
- `infra/common/provider.tf` (lines 47, 55, 63)
- `infra/common/vpn.tf` (line 316 - if using Firezone)
- `infra/common/vanta.tf` (line 12 - if using Vanta)
- `infra/eks/main.tf` (line 79)
- `infra/secrets/data.tf` (line 35, commented)
- `infra/services/vanta.tf` (line 12 - if using Vanta)

#### Organization Name (ClientDomain)
The placeholder `ClientDomain` appears throughout the codebase and should be replaced with your actual organization name:

**Common locations**:
- `infra/common/locals.tf` - Email addresses, DNS names
- `infra/common/variable.tf` - Default values
- `infra/services/cognito.tf` - Cognito pool names, email templates
- `infra/services/cdn.tf` - S3 bucket names
- `infra/services/local.tf` - Configuration values
- `infra/monitoring/local.tf` - Email notifications

**Recommended approach**:
1. Create a variable `var.organization_name` in root variables
2. Use search and replace: `ClientDomain` → `${var.organization_name}` where appropriate
3. Or directly replace with your organization's name

#### External IDs
- **Vanta External ID**: `EXAMPLE-EXTERNAL-ID-12345` (placeholder)
  - Location: `infra/common/vanta.tf:17`, `infra/services/vanta.tf:17`
  - Replace with actual External ID from Vanta if using their service

#### Email Addresses
All email addresses use placeholders (`User1@ClientDomain.com`, etc.). Configure actual email addresses in your `.tfvars` files (which are gitignored).

### Configuration Files

#### Required .tfvars Files
Create environment-specific configuration files in `infra/config/` directory:
```
infra/config/
├── dev.tfvars
├── uat.tfvars
└── prod.tfvars
```

These files are gitignored and should contain:
- Actual AWS Account IDs
- Email addresses
- API keys and tokens
- Organization-specific values
- Environment-specific settings

#### Environment Variables
For local development or CI/CD, export:
```bash
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1
export TF_VAR_env=dev  # or uat, prod
```

### Security Best Practices

#### Secrets Management
- **DO NOT** commit secrets to Git
- **USE** AWS Secrets Manager for sensitive data (API keys, database passwords)
- **USE** `.tfvars` files for configuration (already in `.gitignore`)
- **VERIFY** `.gitignore` includes:
  - `*.tfvars`
  - `.env*`
  - `*.pem`
  - `.terraform/`
  - `*.tfstate*`

#### Network Security
- **Firezone VPN** (`infra/common/vpn.tf`): Currently configured with `0.0.0.0/0` access
  - **Production recommendation**: Restrict `ingress_cidr_blocks` to known IP ranges
  - Ports exposed: 443 (HTTPS), 80 (HTTP), 51820 (WireGuard UDP)

- **Security Groups**: Review and restrict CIDR blocks where possible
- **NLB Deletion Protection**: Currently disabled in `infra/services/nlb.tf:7`
  - **Production recommendation**: Set `enable_deletion_protection = true`

#### IAM Policies
- Review policies with `Resource = "*"` in:
  - `infra/eks/policy.tf` (AWS Load Balancer Controller - has conditions)
  - `infra/common/policy.tf` (Karpenter - has conditions)
  - `infra/common/vanta.tf` (Audit permissions - read-only)
- Ensure proper IAM conditions are in place to limit scope

#### Code Quality
- **Commented Code**: Legacy/unused code has been removed
  - Old AWS VPN Client Endpoint configuration removed (replaced by Firezone)
  - Unused resources and configurations cleaned up

- **Lifecycle Management**: Several resources use `lifecycle.ignore_changes`
  - Review these carefully as they may indicate configuration drift issues
  - Consider if manual changes should be brought into Terraform management

### VPN Configuration

Two VPN configurations are referenced in this repository:

#### 1. AWS Client VPN (Legacy - Commented Out)
The old AWS Client VPN configuration has been removed from `infra/common/vpn.tf`. It used:
- SAML authentication with Okta
- CloudWatch logging
- Multiple authorization rules per environment

#### 2. Firezone VPN (Current)
Currently deployed VPN solution:
- EC2-based VPN using Firezone (https://docs.firezone.dev/)
- Instance type: t4g.small (ARM-based)
- WireGuard protocol on port 51820/UDP
- Web UI on ports 443/TCP and 80/TCP
- **Security consideration**: Publicly accessible (0.0.0.0/0) - restrict in production

Configuration details:
- Module: `terraform-aws-modules/ec2-instance/aws` v5.5.0
- SSH key generated via Terraform (private key in sensitive output)
- Elastic IP assigned for static access
- Security group: `firezone-sg`

### Deployment Checklist

Before deploying to a new environment:

1. **Replace Placeholders**
   - [ ] AWS Account IDs in provider configurations
   - [ ] Organization name (ClientDomain)
   - [ ] External IDs (Vanta, if applicable)
   - [ ] Email addresses in variables

2. **Create Configuration Files**
   - [ ] Environment-specific `.tfvars` files
   - [ ] AWS credentials configured
   - [ ] Backend configuration (S3 bucket for state)

3. **Review Security Settings**
   - [ ] Restrict VPN access (change 0.0.0.0/0)
   - [ ] Enable NLB deletion protection (production)
   - [ ] Review IAM policies and conditions
   - [ ] Configure secrets in AWS Secrets Manager

4. **Validate Infrastructure**
   ```bash
   terraform init
   terraform validate
   terraform plan -var-file=../config/${ENV}.tfvars
   ```

5. **Deploy in Order**
   Follow the deployment order in "Infrastructure Architecture" section above.

### Maintenance Notes

#### Regular Updates
- Review and update provider versions periodically
- Check for security advisories on used modules
- Update EKS cluster and node versions regularly
- Rotate secrets and credentials

#### Monitoring
- CloudWatch logs configured for Lambda, VPN, and EKS
- VPC Flow Logs enabled for network monitoring
- Consider enabling AWS Config for compliance tracking

#### Backup and Disaster Recovery
- Terraform state stored in S3 with versioning enabled
- RDS automated backups configured
- Consider implementing cross-region backup strategy for critical data

---

**Last Updated**: 2025-11-06
**Repository Sanitization**: All sensitive data replaced with placeholders
**Git History**: Cleaned (single initial commit)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an **Infrastructure Template Generator** that creates production-ready Terraform infrastructure-as-code for AWS. It uses Jinja2 templates to generate customizable infrastructure components across multiple environments (dev, uat, prod).

**Key Focus**: This repository generates infrastructure templates - it does not contain deployed infrastructure code.

## Infrastructure Template Generator

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

**Prerequisites**: Python 3.12 with virtual environment

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
  --aws-profile YOUR_PROFILE \
  --ci-provider gitlab
```

**CI/CD Provider Options**:
- `gitlab` - GitLab CI/CD (default)
- `github` - GitHub Actions
- `azuredevops` - Azure DevOps Pipelines

**Important**: Always use `.venv/bin/activate` before running the generator locally.

### Generated Output

Creates a complete infrastructure project:
- Terraform code for selected components
- CI/CD pipeline configuration (based on selected provider):
  - **GitLab**: `.gitlab-ci.yml`
  - **GitHub Actions**: `.github/workflows/terraform-ci.yml`
  - **Azure DevOps**: `azure-pipelines.yml`
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

- Generated infrastructure supports multi-account AWS Organizations setup
- Templates include cross-account role assumptions using `OrganizationAccountAccessRole`
- State files are designed to be isolated per environment and layer
- Generated code includes provider configurations for Kubernetes, Helm, and AWS

## Security & Configuration Guidelines

### Generated Infrastructure Security

The generator creates secure, production-ready infrastructure with best practices:

#### Secrets Management
- Generated code never includes hardcoded secrets
- Uses AWS Secrets Manager for sensitive data
- `.tfvars` files for configuration (included in generated `.gitignore`)
- Placeholders for all sensitive values that must be replaced

#### Configuration Files
Generated projects include:
```
generated-infra/
├── infra/
│   ├── config/           # .tfvars files (gitignored)
│   ├── vpc/              # VPC component
│   └── eks-auto/         # EKS Auto Mode component
├── .gitlab-ci.yml        # GitLab CI/CD pipeline
└── README.md             # Deployment instructions
```

#### Environment Variables
For local development, export:
```bash
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1
export TF_VAR_env=dev  # or uat, prod
```

### Deployment Checklist

When deploying generated infrastructure:

1. **Configure Environment**
   - [ ] Create `.tfvars` files for each environment
   - [ ] Configure AWS credentials
   - [ ] Set up S3 backend for Terraform state

2. **Review Security Settings**
   - [ ] Review and adjust security group rules
   - [ ] Configure appropriate CIDR blocks
   - [ ] Enable deletion protection for production resources
   - [ ] Review IAM policies and least-privilege access

3. **Validate Infrastructure**
   ```bash
   cd generated-infra/infra/<component>
   terraform init
   terraform validate
   terraform plan -var-file=../config/${ENV}.tfvars
   ```

4. **Deploy in Order**
   - VPC (foundational)
   - EKS Auto Mode (depends on VPC)
   - Additional components as needed

### Maintenance Notes

#### Generator Updates
- Review and update template provider versions
- Check for security advisories on Terraform modules
- Update component templates as AWS services evolve
- Test generated code with latest Terraform versions

#### Web Interface

**Location**: `docs/` (GitHub Pages)

The web interface provides an interactive UI for configuring and triggering infrastructure generation:

**Files**:
- `docs/index.html` - Main UI page
- `docs/js/app.js` - Application logic, validation, and UI interactions
- `docs/js/security.js` - Security utilities, input validation, XSS protection
- `docs/js/auth.js` - GitHub OAuth authentication
- `docs/js/workflow-monitor.js` - Real-time workflow monitoring and artifact download
- `docs/css/style.css` - Styling with dark mode support

**Features**:
- Interactive form with visual validation feedback
- Custom input validation (no browser default prompts)
- **CI/CD provider selection** (GitLab CI, GitHub Actions, Azure DevOps)
- Dark/light mode with system preference detection
- Real-time architecture diagram preview
- OAuth integration for GitHub Actions workflow triggers
- **Real-time workflow monitoring** with progress tracking
- **Automatic artifact download** when generation completes
- **Job-level progress display** showing individual workflow steps
- Security-focused design (XSS protection, input sanitization)

**Workflow Monitoring** (New in v1.1):
- Real-time status updates via GitHub API polling (every 5 seconds)
- Animated progress bar with shimmer effect
- Live job status tracking (queued ⏳, running ⚡, success ✅, failure ❌)
- Automatic ZIP download when workflow completes successfully
- Background monitoring (modal can be closed while workflow runs)
- Elapsed time display
- Fallback to manual download if auto-download fails
- See `docs/WORKFLOW_MONITORING.md` for detailed documentation

**Validation**:
- Project names: lowercase alphanumeric with hyphens, DNS-compliant (max 63 chars)
- AWS Account IDs: exactly 12 digits (blocks test IDs like 123456789012)
- Error highlighting with inline messages (no alert() popups)
- Auto-clear errors on user input

**Testing**:
- HTML test suite: `tests/test_validation.html` (browser-based)
- Node.js tests: `tests/validation.test.js` (automated, run with `node tests/validation.test.js`)
- All validation logic tested independently

## CI/CD Provider Support

The generator supports multiple CI/CD platforms:

### GitLab CI ✅ (Active)
- **File**: `.gitlab-ci.yml`
- **Status**: Fully supported and tested
- **Features**:
  - Multi-stage pipeline (Validate, Plan, Apply)
  - Per-component and per-environment jobs
  - Manual approval for apply stages
  - Automatic dependency resolution
  - Artifact management for Terraform plans

### GitHub Actions ✅ (Active)
- **File**: `.github/workflows/terraform-ci.yml`
- **Status**: Fully supported and enabled in web UI
- **Documentation**: See `docs/GITHUB_ACTIONS_SETUP.md`
- **Features**:
  - Pull request validation with plan comments
  - Environment-based deployments with approvals
  - Workflow dispatch for manual runs
  - Per-component and per-environment jobs
  - AWS credentials via secrets or OIDC
  - Artifact management for Terraform plans
- **Setup**:
  - Configure secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
  - Optional: GitHub Environments for approval workflows
  - Recommended: AWS OIDC for enhanced security

### Azure DevOps Pipelines (Templates Ready)
- **File**: `azure-pipelines.yml`
- **Status**: Templates implemented, marked as "Coming Soon" in web UI
- **Features**:
  - Multi-stage pipeline with environment approvals
  - Parameter-based deployment control
  - Deployment jobs with environment protection
  - Artifact management for plans
  - AWS authentication via service connections

**Usage**: Select CI provider in web UI or use `--ci-provider` flag with CLI. GitLab and GitHub Actions are fully supported. Azure DevOps templates are ready but pending full validation.

---

**Last Updated**: 2025-11-08
**Repository Type**: Infrastructure Template Generator
**Git History**: Clean (sanitized)

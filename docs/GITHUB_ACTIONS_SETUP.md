# GitHub Actions Setup Guide

## Overview

This guide explains how to configure GitHub Actions CI/CD for your generated infrastructure project.

## Prerequisites

- GitHub repository for your infrastructure code
- AWS account with appropriate permissions
- Generated infrastructure code with GitHub Actions workflow

## Required GitHub Secrets

Configure the following secrets in your GitHub repository:

### Navigation
Go to: **Repository → Settings → Secrets and variables → Actions**

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key for GitHub Actions | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS region for deployment | `us-east-1` |

### Setting Up Secrets

#### Option 1: Using GitHub Web UI

1. Navigate to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter secret name and value
5. Click **Add secret**
6. Repeat for all required secrets

#### Option 2: Using GitHub CLI

```bash
# Install GitHub CLI if needed
# https://cli.github.com/

# Set secrets
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY
gh secret set AWS_REGION
```

## AWS Credentials

### Recommended: IAM User for CI/CD

Create a dedicated IAM user for GitHub Actions with minimal required permissions:

```bash
# Create IAM user
aws iam create-user --user-name github-actions-terraform

# Attach policies (adjust based on your infrastructure)
aws iam attach-user-policy \
  --user-name github-actions-terraform \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Create access keys
aws iam create-access-key --user-name github-actions-terraform
```

**Security Best Practices:**
- Use least-privilege IAM policies
- Rotate access keys regularly
- Never commit access keys to version control
- Consider using AWS OIDC for GitHub Actions (no long-lived credentials)

### Alternative: AWS OIDC (No Secrets Required) ⭐ Recommended

Use OpenID Connect for more secure, temporary credentials:

```yaml
# In your workflow, replace aws-actions/configure-aws-credentials step:
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
    aws-region: us-east-1
```

**Setup:**
1. Create OIDC identity provider in AWS
2. Create IAM role with trust policy for GitHub
3. No secrets needed in GitHub!

[AWS Documentation: GitHub Actions OIDC](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)

## GitHub Environments (Optional but Recommended)

Configure environments for approval workflows:

### Setup

1. Go to **Repository → Settings → Environments**
2. Create environments: `dev`, `uat`, `prod`
3. Configure protection rules:
   - **dev**: No restrictions
   - **uat**: Require 1 reviewer
   - **prod**: Require 2 reviewers + wait timer (5 min)

### Benefits

- Manual approval gates for production deployments
- Environment-specific secrets
- Deployment history tracking
- Rollback capabilities

## Workflow Triggers

### Automatic (Pull Request)

```yaml
on:
  pull_request:
    branches: [main, master]
```

- Runs: Validate, Plan
- Comments plan output on PR
- No apply step (safe for review)

### Automatic (Push to Main)

```yaml
on:
  push:
    branches: [main, master]
```

- Runs: Validate, Plan, Apply (auto-approved)
- ⚠️ **Caution**: Applies changes immediately

### Manual (Workflow Dispatch)

```yaml
on:
  workflow_dispatch:
    inputs:
      environment: dev|uat|prod
      component: vpc|eks-auto|...
      action: plan|apply
```

- Trigger from: **Actions → Terraform CI/CD → Run workflow**
- Select specific environment, component, and action
- Requires environment approval for `apply`

## Workflow Structure

### Jobs

```
validate-{component}
  ├─ terraform fmt -check
  ├─ terraform init -backend=false
  └─ terraform validate

plan-{component}-{env}
  ├─ terraform init
  ├─ terraform plan -var-file=config/{env}.tfvars
  ├─ Comment plan on PR
  └─ Upload plan artifact

apply-{component}-{env}
  ├─ Download plan artifact
  ├─ terraform init
  └─ terraform apply -auto-approve tfplan-{env}
```

### Component & Environment Matrix

For `vpc`, `eks-auto` across `dev`, `uat`, `prod`:

- **Validate jobs**: 2 (one per component)
- **Plan jobs**: 6 (2 components × 3 environments)
- **Apply jobs**: 6 (2 components × 3 environments)

## Testing Your Workflow

### 1. Test Validation (PR)

```bash
# Create feature branch
git checkout -b test/github-actions

# Make a change
echo "# Test" >> infra/vpc/README.md

# Commit and push
git add .
git commit -m "test: GitHub Actions validation"
git push origin test/github-actions

# Create PR on GitHub
# → Workflow runs validation automatically
```

### 2. Test Manual Run

1. Go to **Actions** tab
2. Select **Terraform CI/CD**
3. Click **Run workflow**
4. Choose:
   - Branch: `main`
   - Environment: `dev`
   - Component: `vpc`
   - Action: `plan`
5. Click **Run workflow**
6. Monitor execution

### 3. Test Full Deployment

```bash
# Ensure config files exist
ls infra/config/dev.tfvars

# Merge PR to main
# → Plan runs automatically
# → Apply runs if conditions met (push to main)
```

## Troubleshooting

### Error: "AWS credentials not found"

**Solution:** Verify secrets are set correctly:
```bash
gh secret list
```

### Error: "terraform init failed"

**Possible causes:**
- S3 backend not accessible
- Missing AWS permissions
- Invalid backend configuration

**Solution:** Check backend config in `backend.tf`:
```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "vpc/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### Error: "Environment protection rules"

**Solution:**
- For `dev`: No protection needed
- For `prod`: Approve deployment manually in Actions tab

### Workflow not triggering

**Check:**
1. Workflow file path: `.github/workflows/terraform-ci.yml`
2. Branch name matches trigger: `main` or `master`
3. File paths match triggers: `infra/vpc/**`, `infra/config/**`

## Best Practices

### 1. Use Branch Protection

```yaml
# Require PR reviews before merge
branches:
  - name: main
    protection:
      required_reviews: 1
      required_status_checks:
        - validate-vpc
        - validate-eks-auto
```

### 2. Separate State Files

```
s3://my-terraform-state/
  vpc/
    dev/terraform.tfstate
    uat/terraform.tfstate
    prod/terraform.tfstate
  eks-auto/
    dev/terraform.tfstate
    ...
```

### 3. Use Matrix Strategy (Advanced)

```yaml
strategy:
  matrix:
    component: [vpc, eks-auto]
    environment: [dev, uat, prod]
```

### 4. Add Security Scanning

```yaml
- name: tfsec
  uses: aquasecurity/tfsec-action@v1.0.0
  with:
    soft_fail: false
```

### 5. Slack/Email Notifications

```yaml
- name: Notify on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Migration from GitLab CI

If migrating from GitLab CI:

| GitLab | GitHub Actions |
|--------|----------------|
| `.gitlab-ci.yml` | `.github/workflows/*.yml` |
| `CI/CD → Variables` | `Settings → Secrets` |
| `CI/CD → Pipelines` | `Actions` tab |
| `only: [main]` | `on.push.branches: [main]` |
| `when: manual` | `workflow_dispatch` |

## Cost Considerations

### GitHub Actions Pricing

- **Public repos**: Unlimited free
- **Private repos**:
  - Free tier: 2,000 minutes/month
  - Paid: $0.008/minute (Linux runners)

### Estimation

For a typical workflow:
- Validate: ~2 minutes
- Plan: ~3 minutes per component/env
- Apply: ~5 minutes per component/env

**Monthly usage** (10 deployments):
- Validate: 2 × 10 = 20 min
- Plan: 3 × 6 × 10 = 180 min
- Apply: 5 × 6 × 10 = 300 min
- **Total**: ~500 minutes (~$4/month)

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Terraform GitHub Actions](https://developer.hashicorp.com/terraform/tutorials/automation/github-actions)
- [AWS Actions Documentation](https://github.com/aws-actions)
- [OIDC with GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

## Support

For issues or questions:
- Open an issue on the Infrastructure Accelerator repository
- Check existing discussions
- Review workflow logs in Actions tab

---

**Version:** 1.0
**Last Updated:** 2025-11-08
**Compatible with:** GitHub Actions workflows generated by Infrastructure Accelerator

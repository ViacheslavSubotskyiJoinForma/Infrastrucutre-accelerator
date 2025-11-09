# Manual Deployment Test Workflow

**Owner/Maintainer Use Only** - This workflow is designed for testing infrastructure deployment in AWS test accounts.

## Overview

This GitHub Actions workflow allows manual testing of generated Terraform infrastructure deployment without affecting production or customer environments. It's useful for:

- Validating infrastructure changes before release
- Testing new components or features
- Verifying deployment workflows
- Troubleshooting deployment issues

## Prerequisites

### Required GitHub Secrets

Configure the following secrets in your repository:

1. **AWS_ACCESS_KEY_ID** - AWS access key for test account
2. **AWS_SECRET_ACCESS_KEY** - AWS secret key for test account
3. **AWS_REGION** - Default AWS region (optional, can use workflow input)

### Optional: OIDC Configuration

For enhanced security, configure AWS OIDC authentication:

1. Create an IAM role with trust policy for GitHub Actions
2. Add secret: **AWS_ROLE_TO_ASSUME** - ARN of the IAM role
3. Update workflow to use OIDC (uncomment relevant lines)

See [GitHub Actions AWS OIDC Guide](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

### GitHub Environments (Optional)

**Note**: GitHub Environments are NOT required for this workflow since all deployments run in a single test AWS account. The workflow runs automatically without approval gates for faster testing cycles.

If you want to add approval gates:

1. Uncomment the `environment:` sections in the workflow YAML
2. Create GitHub Environments in Settings → Environments
3. Configure required reviewers for each environment

## Usage

### 1. Navigate to Actions

Go to the **Actions** tab in GitHub → **Manual Deployment Test (Owner Only)**

### 2. Run Workflow

Click **"Run workflow"** and configure:

#### Basic Configuration

- **Test project name**: Name for test infrastructure (default: `test-infra`)
- **Components**: Comma-separated list (e.g., `vpc,eks-auto,rds`)
  - Available: `vpc`, `eks-auto`, `rds`, `terraform-backend`
- **Environments**: Comma-separated list (e.g., `dev,uat,prod`)
  - Deploy to multiple environments in one run
  - All environments deploy to the same AWS test account
- **AWS Region**: AWS region for deployment (default: `us-east-1`)
- **AWS Test Account ID**: Your test AWS account ID

#### Backend Configuration

- **Backend type**:
  - `local` - Local state storage (simpler, for quick tests)
  - `s3` - S3 backend with native locking (production-like)
- **S3 bucket for state**: Required only if backend_type=s3
  - Must pre-deploy `terraform-backend` component first

#### Deployment Options

- **Run terraform apply**:
  - `false` - Validation only (plan without apply)
  - `true` - Full deployment (no approval required)
- **Auto-destroy after successful apply**:
  - `true` - Automatically cleanup infrastructure after successful deployment (default, recommended)
  - `false` - Keep infrastructure after deployment for manual inspection

#### Advanced Options

- **Number of Availability Zones**: `1`, `2`, or `3` (default: `3`)

### 3. Workflow Execution

The workflow executes in stages:

#### Stage 1: Generate & Validate (Automatic)
- Generates Terraform code from templates
- Validates syntax and formatting
- Uploads generated infrastructure as artifact

#### Stage 2: Plan (Automatic, if apply=true)
- Runs `terraform plan` for each component/environment combination
- Uploads plan files as artifacts
- Matrix execution (parallel for all component/environment combinations)

#### Stage 3: Apply (Automatic, no approval required)
- Applies infrastructure changes for all component/environment combinations
- Matrix execution (sequential, max-parallel=1 to avoid conflicts)
- Uploads outputs as artifacts

#### Stage 4: Destroy (Automatic, if auto_destroy=true)
- Automatically destroys deployed infrastructure after successful apply
- No approval required for faster testing cycles
- Matrix execution (sequential)
- Cleanup of all test resources

#### Stage 5: Final Summary (Automatic)
- Generates comprehensive test summary
- Shows results of all jobs

## Workflow Scenarios

### Scenario 1: Validation Only

**Use case**: Test template generation and Terraform validation without deployment

```yaml
run_apply: false
auto_destroy: true  # ignored when run_apply=false
```

**Result**: Generates and validates infrastructure, no AWS resources created

### Scenario 2: Full Deployment Test (Keep Resources)

**Use case**: Deploy infrastructure and keep it for manual inspection

```yaml
run_apply: true
auto_destroy: false
```

**Result**: Deploys infrastructure, keeps resources for manual testing/inspection

### Scenario 3: Complete Test with Auto-Cleanup (Recommended)

**Use case**: Test deployment and automatic cleanup

```yaml
run_apply: true
auto_destroy: true  # default
```

**Result**: Deploys infrastructure, validates deployment, then automatically destroys it (full round-trip test)

### Scenario 4: Multi-Environment Deployment

**Use case**: Test deployment to multiple environments at once (all in same AWS account)

```yaml
environments: dev,uat,prod
components: vpc
run_apply: true
auto_destroy: true
```

**Result**: Deploys VPC to dev, uat, and prod environments sequentially, then cleans up all

### Scenario 5: S3 Backend Test

**Use case**: Test production-like setup with S3 state backend

```yaml
backend_type: s3
state_bucket: my-test-terraform-state-123456789012
run_apply: true
auto_destroy: true
```

**Prerequisites**: First deploy `terraform-backend` component:

```bash
# Generate terraform-backend
components: terraform-backend
environments: dev
backend_type: local
run_apply: true

# Note the S3 bucket name from outputs
# Then use that bucket for subsequent deployments
```

## Example Configurations

### Test VPC Deployment (Single Environment)

```yaml
project_name: test-vpc-v1
components: vpc
environments: dev
region: us-east-1
aws_account_id: 123456789012
backend_type: local
run_apply: true
auto_destroy: true
availability_zones: 3
```

### Test EKS Auto with Dependencies (Multi-Environment)

```yaml
project_name: test-eks-v1
components: vpc,eks-auto
environments: dev,uat,prod
region: us-east-1
aws_account_id: 123456789012
backend_type: s3
state_bucket: test-terraform-state-123456789012
run_apply: true
auto_destroy: false
availability_zones: 3
```

### Test Full Stack (All Environments)

```yaml
project_name: test-full-v1
components: vpc,eks-auto,rds
environments: dev,uat,prod
region: us-east-1
aws_account_id: 123456789012
backend_type: s3
state_bucket: test-terraform-state-123456789012
run_apply: true
auto_destroy: true
availability_zones: 3
```

## Artifacts

The workflow produces several artifacts (retained for 7 days):

1. **generated-infra-{run_id}** - Complete generated infrastructure code
2. **tfplan-{component}-{env}-{run_id}** - Terraform plan files for each component/environment
3. **outputs-{component}-{env}-{run_id}** - Terraform outputs (JSON) for each component/environment

## Monitoring & Troubleshooting

### Viewing Progress

1. Go to Actions → Select workflow run
2. View job progress in real-time
3. Check job summaries for status

### Common Issues

#### Issue: Plan fails with authentication error

**Solution**: Verify AWS credentials in GitHub Secrets

#### Issue: S3 backend initialization fails

**Solution**:
- Verify S3 bucket exists and is accessible
- Check bucket name matches exactly
- Ensure bucket has native locking enabled (Terraform 1.10+)

#### Issue: Component deployment fails due to dependencies

**Solution**: Deploy components in order:
1. `vpc` (foundational)
2. `eks-auto` or `rds` (depends on vpc)

#### Issue: Destroy fails with resources still in use

**Solution**:
- Manually clean up dependent resources first
- Check AWS console for remaining resources
- Re-run destroy after cleanup

## Security Considerations

### Test Account Isolation

- Use dedicated AWS test account
- Never use production AWS account ID
- Implement account-level guardrails (SCPs)

### Credential Management

- Use OIDC authentication when possible (preferred)
- Rotate static credentials regularly
- Limit IAM permissions to test account only

### Resource Cleanup

- Enable `auto_destroy: true` (default) for automated cleanup after testing
- Disable `auto_destroy` only when you need to inspect deployed resources manually
- Monitor AWS costs in test account
- Set up AWS Budgets alerts
- Review orphaned resources monthly

## Cost Management

### Estimated Costs (us-east-1)

- **VPC only**: ~$0-5/month (mostly NAT Gateway if enabled)
- **VPC + EKS Auto**: ~$70-100/month (EKS cluster + node compute)
- **VPC + EKS + RDS**: ~$100-150/month (+ Aurora Serverless v2)

### Cost Optimization Tips

1. **Use auto_destroy=true** (default) for short-lived tests
2. **Test single environment first** before deploying to all environments
3. **Use availability_zones=1** for quick tests (reduces NAT Gateway costs)
4. **Monitor with AWS Cost Explorer**
5. **Set up billing alerts**

## Best Practices

### Before Running

- [ ] Verify AWS credentials are configured
- [ ] Check test account has sufficient quota
- [ ] Review components and dependencies
- [ ] Choose appropriate environments to test (single or multiple)
- [ ] Decide on cleanup strategy (auto_destroy=true/false)

### During Execution

- [ ] Monitor job progress in Actions tab
- [ ] Review plan outputs in job logs
- [ ] Check for unexpected changes
- [ ] Verify resource creation in AWS console

### After Completion

- [ ] Download and review outputs artifacts
- [ ] Verify resources match expectations
- [ ] Clean up if not auto-destroyed
- [ ] Document any issues found

## Workflow Updates

### Adding New Components

1. Ensure component is supported in generator
2. Update component list in workflow description
3. Test new component in isolation first
4. Add to example configurations

### Modifying Workflow

1. Test changes in feature branch
2. Validate YAML syntax: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/manual-deployment-test.yml'))"`
3. Test with validation-only run first
4. Document changes in this README

## Support

### Issues

If you encounter issues:

1. Check workflow run logs for error details
2. Review Terraform plan/apply output
3. Verify AWS resources in console
4. Check GitHub Actions logs
5. Open issue in repository with details

### Improvements

Suggestions for workflow improvements:

1. Open GitHub issue with enhancement label
2. Describe use case and benefit
3. Provide example configuration
4. Submit PR if you've implemented it

---

**Last Updated**: 2025-11-09
**Workflow Version**: 1.0
**Maintainer**: Repository Owner

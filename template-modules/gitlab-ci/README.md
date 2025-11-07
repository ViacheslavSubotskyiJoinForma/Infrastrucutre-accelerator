# GitLab CI/CD Template

This directory contains the Jinja2 template for generating GitLab CI/CD pipeline configuration.

## Overview

The GitLab CI template generates a `.gitlab-ci.yml` file that provides:
- Automated Terraform validation
- Multi-environment deployment pipeline
- Manual approval gates for production
- Artifact management for Terraform plans

## Template File

- **`gitlab-ci.yml.j2`** - Complete GitLab CI/CD pipeline configuration

## Variables

The template uses:
- `components` - List of infrastructure components to validate/deploy
- `environments` - List of deployment environments

## Generated Pipeline

### Stages

1. **Validate** - Terraform format check and validation
2. **Plan** - Generate Terraform execution plans
3. **Apply** - Execute Terraform changes (manual approval)

### Jobs Per Component

For each component (VPC, EKS-Auto, etc.), the pipeline creates:

#### Validate Job
```yaml
Validate_vpc:
  stage: Validate
  script:
    - terraform fmt -check
    - terraform validate
  rules:
    - on merge requests affecting the component
    - on main branch
```

#### Plan Jobs (per environment)
```yaml
Plan_vpc_dev:
  stage: Plan
  script:
    - terraform plan -var-file=../config/dev.tfvars -out=tfplan-dev
  artifacts:
    paths:
      - infra/vpc/tfplan-dev
    expire_in: 2 hrs
  when: manual
```

#### Apply Jobs (per environment)
```yaml
Apply_vpc_dev:
  stage: Apply
  when: manual
  script:
    - terraform apply -auto-approve tfplan-dev
  needs:
    - Plan_vpc_dev
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

## Usage

The template is automatically used when generating infrastructure:

```bash
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components vpc,eks-auto \
  --environments dev,uat,prod
```

This generates `.gitlab-ci.yml` in the output directory.

## GitLab CI Configuration

### Prerequisites

1. **GitLab Runner** with Docker executor
2. **Terraform Docker image** (hashicorp/terraform:1.5.4)
3. **AWS credentials** configured as GitLab CI/CD variables

### Required GitLab Variables

Configure these in GitLab CI/CD Settings:

```
AWS_ACCESS_KEY_ID       - AWS access key (masked)
AWS_SECRET_ACCESS_KEY   - AWS secret key (masked)
AWS_DEFAULT_REGION      - Default AWS region
TF_VAR_aws_account_id   - AWS account ID
```

### Optional Variables

```
TF_CLI_ARGS             - Additional Terraform CLI arguments
```

## Pipeline Behavior

### Merge Request Events

When a merge request is created:
- **Validate** jobs run automatically for changed components
- **Plan** jobs can be manually triggered
- **Apply** jobs are disabled

### Main Branch

When merged to main:
- **Validate** jobs run automatically
- **Plan** jobs require manual trigger
- **Apply** jobs require manual trigger (only on main)

### Manual Approvals

All **Apply** jobs require manual approval to prevent accidental deployments.

## State Management

### Current (MVP): Local State

```hcl
# Local state backend (default)
terraform {
  backend "local" {}
}
```

**Limitations:**
- State stored in GitLab artifacts
- No state locking
- Not suitable for team collaboration

### Recommended: S3 Backend

For production use, configure S3 backend in generated `backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "vpc/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

**Benefits:**
- Centralized state storage
- State locking with DynamoDB
- Team collaboration support
- Encryption at rest

## Customization

### Add Additional Validation

Edit `gitlab-ci.yml.j2` to add more checks:

```yaml
Validate_{{ component }}:
  script:
    - terraform fmt -check
    - terraform validate
    - tflint  # Add linting
    - checkov -d .  # Add security scanning
```

### Change Terraform Version

```yaml
image:
  name: hashicorp/terraform:1.6.0  # Update version
  entrypoint: [""]
```

### Add Slack Notifications

```yaml
.terraform_base_{{ component }}:
  after_script:
    - 'curl -X POST -H "Content-type: application/json" --data "{\"text\":\"Job $CI_JOB_NAME completed\"}" $SLACK_WEBHOOK'
```

### Add Cost Estimation

```yaml
Plan_{{ component }}_{{ env }}:
  script:
    - terraform plan -var-file=../config/{{ env }}.tfvars -out=tfplan-{{ env }}
    - terraform show -json tfplan-{{ env }} | infracost diff --path=-
```

## Deployment Workflow

### Standard Deployment

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-infrastructure
   ```

2. **Make changes** to infrastructure code

3. **Push and create MR**
   ```bash
   git push origin feature/new-infrastructure
   ```

4. **Validate** job runs automatically

5. **Trigger Plan** job manually in GitLab UI

6. **Review plan** output in job logs

7. **Merge to main** if plan looks good

8. **On main branch:**
   - Trigger **Plan** job
   - Review plan output
   - Trigger **Apply** job
   - Monitor apply progress

### Emergency Changes

For urgent fixes:
1. Create hotfix branch
2. Make minimal changes
3. Fast-track MR approval
4. Deploy to production

## Troubleshooting

### Issue: "terraform init fails"

**Cause**: Missing AWS credentials or backend configuration
**Solution**: Check GitLab CI/CD variables, verify backend.tf

### Issue: "Plan job artifacts expired"

**Cause**: 2-hour artifact expiration
**Solution**: Re-run Plan job before Apply

### Issue: "State lock errors"

**Cause**: Previous job didn't release lock
**Solution**: Manually remove lock or wait for timeout

### Issue: "Permission denied"

**Cause**: Insufficient AWS IAM permissions
**Solution**: Update IAM policy for GitLab CI role

## Security Best Practices

1. **Masked Variables** - Always mask AWS credentials in GitLab
2. **Protected Branches** - Restrict Apply jobs to protected branches
3. **Manual Approvals** - Require manual trigger for production applies
4. **MR Reviews** - Require code review before merging
5. **Audit Logs** - Enable GitLab audit logging
6. **Least Privilege** - Use minimal IAM permissions for CI/CD role

## Performance Optimization

### Parallel Execution

Components are validated in parallel:
```yaml
Validate_vpc:
  parallel: 3  # Run multiple validation jobs
```

### Caching

Add Terraform plugin caching:
```yaml
cache:
  paths:
    - .terraform
    - .terraform.lock.hcl
```

### Selective Execution

Only run jobs when component changes:
```yaml
rules:
  - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    changes:
      - infra/{{ component }}/**/*
```

## Migration to GitHub Actions

If moving to GitHub Actions:

1. Use `.github/workflows/terraform.yml` instead
2. Replace GitLab CI variables with GitHub Secrets
3. Update state backend configuration
4. Adjust workflow triggers

See project root for GitHub Actions workflow example.

## Related Documentation

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Terraform in GitLab](https://docs.gitlab.com/ee/user/infrastructure/iac/)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

---

**Version**: 1.0
**Last Updated**: 2025-11-07
**Terraform Version**: 1.5.4

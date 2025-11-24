# 🧪 Comprehensive Infrastructure Testing Plan

**Date**: 2025-11-17
**Branch**: `infrastructure-testing-20251117`
**Environment**: `testing` (GitHub Environment)
**Region**: `us-east-1` (Virginia)

---

## ✅ Setup Status

### GitHub Environment
- [x] Environment `testing` created
- [x] Branch policy configured for `infrastructure-testing-20251117`
- [x] AWS credentials configured:
  - `AWS_ACCESS_KEY_ID` ✅
  - `AWS_SECRET_ACCESS_KEY` ✅
  - `AWS_SESSION_TOKEN` ✅ (temporary credentials)
  - `AWS_REGION` ✅

### Test Branch
- [x] Branch `infrastructure-testing-20251117` created
- [x] Workflow modified to use `testing` environment
- [x] Testing framework committed and pushed
- [x] All scripts executable

### AWS Configuration
- **Account ID**: `123456789012`
- **Region**: `us-east-1`
- **Credentials Type**: Temporary (with SESSION_TOKEN)
- **⚠️ Expiry**: Monitor - typical lifetime 1-12 hours

---

## 📋 Test Execution Plan

### Phase 1: DEV Environment - Local Backend
**Goal**: Validate all component combinations with local state

| Test ID | Components | Backend | Env | Duration | Cost Est | Status |
|---------|-----------|---------|-----|----------|----------|--------|
| T1.1 | vpc | local | dev | ~10min | $0.50 | ⏳ Pending |
| T1.2 | vpc,rds | local | dev | ~25min | $3.00 | ⏳ Pending |
| T1.3 | vpc,eks-auto | local | dev | ~25min | $3.50 | ⏳ Pending |
| T1.4 | vpc,eks-auto,rds | local | dev | ~35min | $5.00 | ⏳ Pending |

**Phase Duration**: ~2 hours
**Phase Cost**: ~$12

### Phase 2: DEV Environment - S3 Backend
**Goal**: Validate S3 state backend functionality

| Test ID | Components | Backend | Env | Duration | Cost Est | Status |
|---------|-----------|---------|-----|----------|----------|--------|
| T2.1 | terraform-backend | local | dev | ~8min | $0.10 | ⏳ Pending |
| T2.2 | vpc | s3 | dev | ~10min | $0.50 | ⏳ Pending |
| T2.3 | vpc,rds | s3 | dev | ~25min | $3.00 | ⏳ Pending |
| T2.4 | vpc,eks-auto,rds | s3 | dev | ~35min | $5.00 | ⏳ Pending |

**Phase Duration**: ~2 hours
**Phase Cost**: ~$9

**Note**: T2.1 creates S3 bucket, its output is used for T2.2-T2.4

### Phase 3: PROD Environment - Full Validation
**Goal**: Validate production-ready deployment

| Test ID | Components | Backend | Env | Duration | Cost Est | Status |
|---------|-----------|---------|-----|----------|----------|--------|
| T3.1 | vpc,eks-auto,rds | s3 | prod | ~35min | $5.00 | ⏳ Pending |

**Phase Duration**: ~40 minutes
**Phase Cost**: ~$5

---

## 🎯 Total Estimates

- **Total Tests**: 9
- **Total Duration**: 4-5 hours
- **Total Cost**: ~$26
- **Budget Limit**: $500 ✅ Well under budget

---

## 🚀 Execution Instructions

### Option 1: Automated Execution (Recommended)

```bash
# 1. Verify setup
cd /Users/viacheslav.subotskyi/PycharmProjects/Infrastrucutre-accelerator
git checkout infrastructure-testing-20251117
git pull

# 2. Verify credentials in GitHub
gh secret list --env testing

# 3. Run all tests (automated)
./scripts/testing/run_comprehensive_tests.sh

# Or run specific phase
./scripts/testing/run_comprehensive_tests.sh --test-id T1.1
./scripts/testing/run_comprehensive_tests.sh --test-id T1.2
# ... etc
```

**What the script does:**
1. Triggers GitHub Actions workflow for each test
2. Monitors execution in real-time
3. Saves test outputs and artifacts
4. Captures S3 bucket name from T2.1
5. Generates test reports in `reports/` directory
6. Handles failures gracefully with prompts

### Option 2: Manual Execution (via GitHub UI)

For each test, visit:
https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions/workflows/manual-deployment-test.yml

Click **"Run workflow"** and configure:

#### Test T1.1 (VPC Local)
```yaml
Branch: infrastructure-testing-20251117
Project name: test-infra-t1.1
Components: vpc
Environments: dev
Region: us-east-1
AWS Account ID: 123456789012
Backend type: local
State bucket: (leave empty)
Run apply: true
Auto-destroy: true
Availability zones: 3
```

#### Test T1.2 (VPC + RDS Local)
```yaml
Project name: test-infra-t1.2
Components: vpc,rds
(same settings as T1.1)
```

#### Test T1.3 (VPC + EKS Auto Local)
```yaml
Project name: test-infra-t1.3
Components: vpc,eks-auto
(same settings as T1.1)
```

#### Test T1.4 (Full Stack Local)
```yaml
Project name: test-infra-t1.4
Components: vpc,eks-auto,rds
(same settings as T1.1)
```

#### Test T2.1 (Terraform Backend)
```yaml
Project name: test-infra-t2.1
Components: terraform-backend
Backend type: local
(same other settings)

⚠️ IMPORTANT: Note the S3 bucket name from outputs!
```

#### Test T2.2 (VPC S3)
```yaml
Project name: test-infra-t2.2
Components: vpc
Backend type: s3
State bucket: <bucket-from-T2.1>
(same other settings)
```

#### Test T2.3 (VPC + RDS S3)
```yaml
Project name: test-infra-t2.3
Components: vpc,rds
Backend type: s3
State bucket: <bucket-from-T2.1>
(same other settings)
```

#### Test T2.4 (Full Stack S3)
```yaml
Project name: test-infra-t2.4
Components: vpc,eks-auto,rds
Backend type: s3
State bucket: <bucket-from-T2.1>
(same other settings)
```

#### Test T3.1 (PROD Validation)
```yaml
Project name: test-infra-t3.1
Components: vpc,eks-auto,rds
Environments: prod  # ← Changed to prod
Backend type: s3
State bucket: <bucket-from-T2.1>
(same other settings)
```

---

## 🧹 Cleanup Strategy

### Automatic (Built-in)
All tests have `auto_destroy: true` which triggers cleanup after successful apply.

**Workflow**: Generate → Validate → Plan → Apply → **Destroy**

### Manual (If Needed)

```bash
# Preview what would be cleaned up
./scripts/testing/aws_cleanup.py --dry-run

# Clean specific test
./scripts/testing/aws_cleanup.py --test-id T1.2 --force

# Clean all test resources
./scripts/testing/aws_cleanup.py --force

# Verify cleanup
./scripts/testing/aws_cleanup.py --dry-run  # Should show no resources
```

---

## ⚠️ Important Reminders

### Session Token Expiry
- **Issue**: Temporary AWS credentials expire
- **Duration**: Typically 1-12 hours
- **Impact**: Tests will fail if credentials expire mid-run
- **Mitigation**: Monitor total test time (~5 hours max)
- **Refresh** (if needed):
  ```bash
  # Get new credentials, then:
  gh secret set AWS_ACCESS_KEY_ID --env testing --body "NEW_KEY"
  gh secret set AWS_SECRET_ACCESS_KEY --env testing --body "NEW_SECRET"
  gh secret set AWS_SESSION_TOKEN --env testing --body "NEW_TOKEN"
  ```

### EKS Auto Mode Permissions
- **Issue**: May require IAM permissions beyond Contributor role
- **Tests Affected**: T1.3, T1.4, T2.4, T3.1
- **Mitigation**: Using admin credentials
- **Fallback**: Tests will fail gracefully, logs captured for analysis

### S3 Bucket Dependency
- **Issue**: Tests T2.2-T2.4 and T3.1 depend on T2.1's output
- **Solution**: Automated script captures bucket name
- **Manual Fallback**:
  1. Check T2.1 workflow outputs
  2. Or: `aws s3 ls | grep test-infra`
  3. Update subsequent test runs with bucket name

### Cost Control
- **Monitor**: Check AWS Cost Explorer during testing
- **Alert**: Consider setting up billing alert at $50
- **Stop**: Can cancel workflow mid-run if costs spike
- **Cleanup**: Always verify resources destroyed after each test

---

## 📊 Monitoring & Reporting

### Real-Time Monitoring
```bash
# Watch specific workflow run
gh run list --workflow=manual-deployment-test.yml --limit=5
gh run watch <run-id>

# View workflow logs
gh run view <run-id> --log

# Check workflow status
gh run view <run-id>
```

### GitHub Actions UI
- **All Runs**: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions
- **Workflow**: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions/workflows/manual-deployment-test.yml

### Test Reports
Generated in `reports/test-run-YYYYMMDD-HHMMSS/`:
- `SUMMARY.md` - Overall test results
- `orchestrator.log` - Full execution log
- `T*.txt` - Individual test summaries
- `T*-failure.log` - Failure details (if any)
- `T*-artifacts/` - Downloaded artifacts (outputs, plans)

### AWS Cost Tracking
```bash
# Current costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 day ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost

# Resources by tag
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=ManagedBy,Values=AutomatedTesting \
  --region us-east-1
```

---

## 🎯 Success Criteria

### Per-Test Success
- ✅ Workflow triggered successfully
- ✅ Generation phase completes (templates render correctly)
- ✅ Validation phase passes (terraform init/fmt/validate)
- ✅ Plan phase succeeds (no Terraform errors)
- ✅ Apply phase succeeds (infrastructure deployed)
- ✅ Destroy phase succeeds (complete cleanup)
- ✅ No orphaned AWS resources remain

### Overall Success
- ✅ All 9 tests pass
- ✅ Total runtime < 6 hours
- ✅ Total cost < $50 (target: ~$26)
- ✅ Zero manual interventions (after initial setup)
- ✅ Complete cleanup verification
- ✅ Test reports generated

---

## 🔧 Troubleshooting

### Test Fails to Start
```bash
# Check branch
git status

# Verify workflow file
git log --oneline | grep "Configure testing environment"

# Check credentials
gh secret list --env testing
aws sts get-caller-identity
```

### Test Fails During Execution
```bash
# View failure logs
gh run view <run-id> --log > failure.log

# Check specific job
gh run view <run-id> --job <job-id>

# Run cleanup
./scripts/testing/aws_cleanup.py --test-id T1.X --force

# Resume from next test
./scripts/testing/run_comprehensive_tests.sh --test-id T1.Y
```

### Resources Not Cleaned Up
```bash
# Check what remains
./scripts/testing/aws_cleanup.py --dry-run

# Force cleanup
./scripts/testing/aws_cleanup.py --force

# Verify via AWS Console
# VPCs: https://console.aws.amazon.com/vpc/
# S3: https://console.aws.amazon.com/s3/
# CloudFormation: https://console.aws.amazon.com/cloudformation/
```

---

## 📝 Notes

- **Execution Order**: Tests must run sequentially (S3 bucket dependency)
- **Cooldown Period**: 60s between tests (avoid rate limiting)
- **Parallelization**: Workflow uses `max-parallel: 1` for stability
- **Artifacts**: Retained for 7 days on GitHub
- **Logs**: Retained indefinitely in `reports/` directory

---

## 🎬 Ready to Start?

**Automated (Recommended)**:
```bash
./scripts/testing/run_comprehensive_tests.sh
```

**Manual (One by one)**:
Visit: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions/workflows/manual-deployment-test.yml

---

**Good luck with testing! 🚀**

All systems are **GO** for comprehensive infrastructure testing.
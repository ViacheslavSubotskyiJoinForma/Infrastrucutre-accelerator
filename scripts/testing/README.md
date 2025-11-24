# Infrastructure Testing Framework

Comprehensive automated testing suite for infrastructure template generator.

## 📁 Files

### Test Orchestration
- **`run_comprehensive_tests.sh`** - Main test orchestrator
  - Triggers GitHub Actions workflows for all test scenarios
  - Monitors workflow execution
  - Generates test reports
  - Automatic cooldown between tests

### AWS Cleanup
- **`aws_cleanup.py`** - AWS resource cleanup automation
  - Force cleanup of orphaned resources
  - Supports dry-run mode
  - Comprehensive resource coverage
  - Smart dependency resolution

## 🚀 Quick Start

### Prerequisites

```bash
# 1. GitHub CLI installed and authenticated
gh auth status

# 2. AWS credentials configured
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."  # If using temporary credentials
export AWS_ACCOUNT_ID="123456789012"

# 3. Python 3.8+ with boto3
pip install boto3

# 4. On the test branch
git checkout infrastructure-testing-20251117
```

### Run All Tests

```bash
# Run all 9 comprehensive tests
./scripts/testing/run_comprehensive_tests.sh

# Dry run (preview without execution)
./scripts/testing/run_comprehensive_tests.sh --dry-run

# Run specific test only
./scripts/testing/run_comprehensive_tests.sh --test-id T1.1
```

### Manual Cleanup

```bash
# Preview cleanup (dry run)
./scripts/testing/aws_cleanup.py --dry-run

# Cleanup specific test
./scripts/testing/aws_cleanup.py --test-id T1.1 --force

# Cleanup ALL test resources
./scripts/testing/aws_cleanup.py --force
```

## 📋 Test Matrix

### Phase 1: DEV Local Backend (4 tests)
| Test ID | Components | Backend | Duration | Cost |
|---------|-----------|---------|----------|------|
| T1.1 | vpc | local | ~10min | ~$0.50 |
| T1.2 | vpc,rds | local | ~25min | ~$3.00 |
| T1.3 | vpc,eks-auto | local | ~25min | ~$3.50 |
| T1.4 | vpc,eks-auto,rds | local | ~35min | ~$5.00 |

### Phase 2: S3 Backend (4 tests)
| Test ID | Components | Backend | Duration | Cost |
|---------|-----------|---------|----------|------|
| T2.1 | terraform-backend | local | ~8min | ~$0.10 |
| T2.2 | vpc | s3 | ~10min | ~$0.50 |
| T2.3 | vpc,rds | s3 | ~25min | ~$3.00 |
| T2.4 | vpc,eks-auto,rds | s3 | ~35min | ~$5.00 |

### Phase 3: PROD Validation (1 test)
| Test ID | Components | Backend | Duration | Cost |
|---------|-----------|---------|----------|------|
| T3.1 | vpc,eks-auto,rds | s3 | ~35min | ~$5.00 |

**Total**: 9 tests, ~4-5 hours, ~$25-30

## 🔄 Test Workflow

```
For each test:
  1. Trigger GitHub Actions workflow
     ├─ Generate infrastructure from templates
     ├─ Validate Terraform (init/fmt/validate)
     ├─ Plan (create execution plan)
     ├─ Apply (deploy to AWS)
     └─ Destroy (cleanup resources)

  2. Monitor workflow execution
     ├─ Stream live logs
     ├─ Check job status
     └─ Capture run ID

  3. Handle results
     ├─ Success: Save summary, continue
     ├─ Failure: Save logs, prompt to continue
     └─ Capture outputs (S3 bucket for T2.1)

  4. Cooldown period (60s)
     └─ Wait before next test
```

## 📊 Test Reports

Reports are saved to `reports/test-run-YYYYMMDD-HHMMSS/`:

```
reports/test-run-20251117-143022/
├── orchestrator.log              # Full orchestrator log
├── SUMMARY.md                    # Test summary report
├── T1.1-summary.txt             # Per-test GitHub Actions summary
├── T1.1-failure.log             # Failure logs (if any)
├── T2.1-artifacts/              # Downloaded artifacts
│   └── outputs-terraform-backend-dev-*/
│       └── outputs.json         # Terraform outputs
└── state_bucket.txt             # Captured S3 bucket name
```

## 🧹 Cleanup Strategy

### Automatic Cleanup (Primary)
- Terraform destroy runs automatically after apply succeeds
- Configured via `auto_destroy: true` in workflow
- No manual intervention required

### Manual Cleanup (Backup)
Use when automatic cleanup fails or for emergency cleanup:

```bash
# Step 1: Dry run to preview
./scripts/testing/aws_cleanup.py --dry-run --region us-east-1

# Step 2: Cleanup specific test
./scripts/testing/aws_cleanup.py --test-id T1.2 --force

# Step 3: Verify no resources remain
./scripts/testing/aws_cleanup.py --dry-run
```

### Cleanup Order
1. **Load Balancers** - EKS/ELB created ALBs/NLBs
2. **ENIs** - Detach and delete network interfaces
3. **NAT Gateways** - Delete and wait for completion
4. **VPCs** - Delete IGWs, subnets, route tables, security groups, VPCs
5. **S3 Buckets** - Delete all versions, then buckets
6. **CloudFormation Stacks** - EKS-created stacks
7. **CloudWatch Log Groups** - Test-related log groups

## ⚠️ Known Issues & Mitigations

### Issue 1: EKS Auto Mode Permissions
**Problem**: Requires IAM permissions beyond AWS Contributor role
**Mitigation**: Using admin credentials from testing environment
**Fallback**: Tests will fail gracefully, logs captured

### Issue 2: Session Token Expiry
**Problem**: Temporary AWS credentials expire after 1-12 hours
**Mitigation**:
- Monitor test progress (max 5 hours)
- Refresh credentials if needed:
  ```bash
  gh secret set AWS_ACCESS_KEY_ID --env testing --body "NEW_KEY"
  gh secret set AWS_SECRET_ACCESS_KEY --env testing --body "NEW_SECRET"
  gh secret set AWS_SESSION_TOKEN --env testing --body "NEW_TOKEN"
  ```

### Issue 3: S3 Bucket Not Captured
**Problem**: T2.1 outputs not accessible
**Solution**:
```bash
# Manually set bucket name for subsequent tests
echo "your-bucket-name" > reports/test-run-*/state_bucket.txt

# Or skip T2.1 and create bucket manually
aws s3 mb s3://test-infra-terraform-state-123456789012 --region us-east-1
```

### Issue 4: Test Failure Mid-Run
**Problem**: Test fails, workflow stopped
**Recovery**:
```bash
# 1. Check GitHub Actions logs
gh run list --workflow=manual-deployment-test.yml --limit=5

# 2. Run cleanup for failed test
./scripts/testing/aws_cleanup.py --test-id T1.3 --force

# 3. Resume from next test
./scripts/testing/run_comprehensive_tests.sh --test-id T1.4
```

## 🔍 Troubleshooting

### Workflow Not Triggering
```bash
# Check branch exists
git branch

# Verify on correct branch
git checkout infrastructure-testing-20251117

# Check workflow file committed
git log --oneline | head -5

# Manually trigger via UI
# https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions
```

### Credentials Not Working
```bash
# Verify environment secrets set
gh secret list --env testing

# Test AWS credentials
aws sts get-caller-identity

# Check session token validity
aws sts get-session-token --duration-seconds 3600
```

### Cleanup Script Fails
```bash
# Run in dry-run to see what it would do
./scripts/testing/aws_cleanup.py --dry-run

# Check AWS permissions
aws iam get-user

# Manual cleanup via console
# https://console.aws.amazon.com/vpc/
# https://console.aws.amazon.com/s3/
# https://console.aws.amazon.com/cloudformation/
```

## 📈 Cost Management

### Estimated Costs
- **VPC**: ~$0.05/hour (NAT Gateway)
- **EKS Auto**: ~$0.10/hour (cluster)
- **RDS**: ~$0.15/hour (Aurora Serverless v2)
- **S3**: ~$0.01/month (state storage)

### Cost Tracking
```bash
# Check current costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=ManagedBy

# Set billing alert (one-time)
aws cloudwatch put-metric-alarm \
  --alarm-name test-infra-cost-alert \
  --alarm-description "Alert when test costs exceed $50" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold
```

## 🎯 Success Criteria

### Per-Test Success
- ✅ Workflow triggers without errors
- ✅ Generation completes (templates render)
- ✅ Validation passes (init/fmt/validate)
- ✅ Plan succeeds (no Terraform errors)
- ✅ Apply succeeds (infrastructure deployed)
- ✅ Destroy succeeds (complete cleanup)
- ✅ No orphaned AWS resources

### Overall Success
- ✅ All 9 tests pass
- ✅ Total runtime < 6 hours
- ✅ Total cost < $50
- ✅ Zero manual interventions (after initial setup)
- ✅ Complete cleanup verification

## 🔗 Links

- **GitHub Actions**: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions
- **Test Branch**: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/tree/infrastructure-testing-20251117
- **Environment Settings**: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/settings/environments/testing
- **AWS Console**: https://console.aws.amazon.com/

## 📝 Notes

- **Parallelization**: Tests run sequentially due to resource constraints (max-parallel: 1 in workflow)
- **Cooldown**: 60s between tests to avoid rate limiting
- **Monitoring**: GitHub Actions provides real-time logs via `gh run watch`
- **Artifacts**: Downloaded automatically for T2.1 (S3 bucket outputs)
- **Branch Protection**: Test branch configured in environment deployment policy

---

**Last Updated**: 2025-11-17
**Maintainer**: Infrastructure Testing Framework
**Status**: Ready for execution
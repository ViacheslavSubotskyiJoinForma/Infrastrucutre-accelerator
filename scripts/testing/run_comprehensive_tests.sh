#!/bin/bash
# Comprehensive Infrastructure Testing Orchestrator
# Runs all test scenarios via GitHub Actions workflow
#
# Usage: ./scripts/testing/run_comprehensive_tests.sh [--dry-run] [--test-id TEST_ID]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_BASE="test-infra"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-123456789012}"  # Default from credentials
REGION="us-east-1"
BRANCH="infrastructure-testing-20251117"

# Test execution mode
DRY_RUN=false
SPECIFIC_TEST=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --test-id)
      SPECIFIC_TEST="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run] [--test-id TEST_ID]"
      exit 1
      ;;
  esac
done

# Test matrix definition
# Format: TEST_ID|COMPONENTS|BACKEND|ENVIRONMENT|DESCRIPTION
declare -a TEST_MATRIX=(
  # Phase 1: DEV Local Backend Tests
  "T1.1|vpc|local|dev|VPC standalone with local backend"
  "T1.2|vpc,rds|local|dev|VPC + RDS database stack"
  "T1.3|vpc,eks-auto|local|dev|VPC + EKS Auto Mode cluster"
  "T1.4|vpc,eks-auto,rds|local|dev|Full application stack (VPC + EKS + RDS)"

  # Phase 2: S3 Backend Tests
  "T2.1|terraform-backend|local|dev|Deploy S3 backend (prerequisite)"
  "T2.2|vpc|s3|dev|VPC with S3 backend"
  "T2.3|vpc,rds|s3|dev|VPC + RDS with S3 backend"
  "T2.4|vpc,eks-auto,rds|s3|dev|Full stack with S3 backend"

  # Phase 3: PROD Validation
  "T3.1|vpc,eks-auto,rds|s3|prod|Production environment test"
)

# State bucket name (will be captured from T2.1 output)
STATE_BUCKET=""

# Logging
LOG_DIR="reports/test-run-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"

log() {
  echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$LOG_DIR/orchestrator.log"
}

log_success() {
  echo -e "${GREEN}[$(date +%H:%M:%S)] ✅ $1${NC}" | tee -a "$LOG_DIR/orchestrator.log"
}

log_error() {
  echo -e "${RED}[$(date +%H:%M:%S)] ❌ $1${NC}" | tee -a "$LOG_DIR/orchestrator.log"
}

log_warn() {
  echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠️  $1${NC}" | tee -a "$LOG_DIR/orchestrator.log"
}

# Function to trigger GitHub Actions workflow
trigger_workflow() {
  local test_id=$1
  local components=$2
  local backend=$3
  local env=$4
  local description=$5

  local project_name="${PROJECT_BASE}-${test_id,,}"  # lowercase test id
  local state_bucket_arg=""

  # Add state bucket if using S3 backend
  if [ "$backend" = "s3" ]; then
    if [ -z "$STATE_BUCKET" ]; then
      log_error "S3 backend required but STATE_BUCKET not set. Run T2.1 first."
      return 1
    fi
    state_bucket_arg="-f state_bucket=${STATE_BUCKET}"
  fi

  log "Triggering test $test_id: $description"
  log "  Components: $components"
  log "  Backend: $backend"
  log "  Environment: $env"

  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would trigger workflow with:"
    echo "  gh workflow run manual-deployment-test.yml \\"
    echo "    --ref $BRANCH \\"
    echo "    -f project_name=$project_name \\"
    echo "    -f components=$components \\"
    echo "    -f environments=$env \\"
    echo "    -f region=$REGION \\"
    echo "    -f aws_account_id=$AWS_ACCOUNT_ID \\"
    echo "    -f backend_type=$backend \\"
    echo "    $state_bucket_arg \\"
    echo "    -f run_apply=true \\"
    echo "    -f auto_destroy=true"
    return 0
  fi

  # Trigger workflow
  gh workflow run manual-deployment-test.yml \
    --ref "$BRANCH" \
    -f project_name="$project_name" \
    -f components="$components" \
    -f environments="$env" \
    -f region="$REGION" \
    -f aws_account_id="$AWS_ACCOUNT_ID" \
    -f backend_type="$backend" \
    $state_bucket_arg \
    -f run_apply=true \
    -f auto_destroy=true

  if [ $? -ne 0 ]; then
    log_error "Failed to trigger workflow for test $test_id"
    return 1
  fi

  log_success "Workflow triggered for test $test_id"

  # Wait for workflow to start
  sleep 10

  # Get latest run ID
  local run_id=$(gh run list \
    --workflow=manual-deployment-test.yml \
    --branch="$BRANCH" \
    --limit=1 \
    --json databaseId \
    --jq '.[0].databaseId')

  if [ -z "$run_id" ]; then
    log_error "Could not find run ID for test $test_id"
    return 1
  fi

  log "Workflow run ID: $run_id"
  log "Monitoring progress..."

  # Monitor workflow
  gh run watch "$run_id" --exit-status || {
    log_error "Test $test_id FAILED"

    # Save run logs
    gh run view "$run_id" --log > "$LOG_DIR/${test_id}-failure.log" 2>&1

    return 1
  }

  log_success "Test $test_id PASSED"

  # Save run summary
  gh run view "$run_id" > "$LOG_DIR/${test_id}-summary.txt" 2>&1

  # If this was terraform-backend deployment, capture bucket name
  if [ "$test_id" = "T2.1" ]; then
    log "Capturing S3 bucket name from terraform-backend outputs..."

    # Download artifacts
    mkdir -p "$LOG_DIR/${test_id}-artifacts"
    gh run download "$run_id" --dir "$LOG_DIR/${test_id}-artifacts" 2>/dev/null || true

    # Try to extract bucket name from outputs
    if [ -f "$LOG_DIR/${test_id}-artifacts/outputs-terraform-backend-dev-${run_id}/outputs.json" ]; then
      STATE_BUCKET=$(jq -r '.s3_bucket_name.value' "$LOG_DIR/${test_id}-artifacts/outputs-terraform-backend-dev-${run_id}/outputs.json" 2>/dev/null || echo "")

      if [ -n "$STATE_BUCKET" ]; then
        log_success "Captured S3 bucket name: $STATE_BUCKET"
        echo "$STATE_BUCKET" > "$LOG_DIR/state_bucket.txt"
      else
        log_warn "Could not extract bucket name from outputs, will need manual input"
      fi
    else
      log_warn "Output artifacts not found for terraform-backend"
    fi
  fi

  # Cooldown between tests
  log "Cooldown period (60s)..."
  sleep 60

  return 0
}

# Main execution
main() {
  log "========================================="
  log "COMPREHENSIVE INFRASTRUCTURE TESTING"
  log "========================================="
  log "Branch: $BRANCH"
  log "Region: $REGION"
  log "AWS Account: $AWS_ACCOUNT_ID"
  log "Log Directory: $LOG_DIR"

  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN MODE - No workflows will be triggered"
  fi

  if [ -n "$SPECIFIC_TEST" ]; then
    log "Running specific test: $SPECIFIC_TEST"
  else
    log "Running all ${#TEST_MATRIX[@]} tests"
  fi

  log "========================================="
  echo ""

  # Statistics
  local total_tests=0
  local passed_tests=0
  local failed_tests=0
  local start_time=$(date +%s)

  # Execute tests
  for test_def in "${TEST_MATRIX[@]}"; do
    IFS='|' read -r test_id components backend env description <<< "$test_def"

    # Skip if specific test requested and this isn't it
    if [ -n "$SPECIFIC_TEST" ] && [ "$test_id" != "$SPECIFIC_TEST" ]; then
      continue
    fi

    ((total_tests++))

    echo ""
    log "========================================="
    log "TEST $test_id: $description"
    log "========================================="

    if trigger_workflow "$test_id" "$components" "$backend" "$env" "$description"; then
      ((passed_tests++))
    else
      ((failed_tests++))

      # Ask user if they want to continue
      if [ "$DRY_RUN" = false ]; then
        read -p "Test failed. Continue with remaining tests? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
          log_warn "Stopping test execution"
          break
        fi
      fi
    fi
  done

  # Final summary
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  local hours=$((duration / 3600))
  local minutes=$(( (duration % 3600) / 60 ))
  local seconds=$((duration % 60))

  echo ""
  log "========================================="
  log "TEST EXECUTION COMPLETE"
  log "========================================="
  log "Total Tests: $total_tests"
  log_success "Passed: $passed_tests"
  log_error "Failed: $failed_tests"
  log "Duration: ${hours}h ${minutes}m ${seconds}s"
  log "Reports: $LOG_DIR"
  log "========================================="

  # Generate summary report
  cat > "$LOG_DIR/SUMMARY.md" <<EOF
# Infrastructure Testing Summary

**Date**: $(date +%Y-%m-%d)
**Branch**: $BRANCH
**Region**: $REGION
**Duration**: ${hours}h ${minutes}m ${seconds}s

## Results

- **Total Tests**: $total_tests
- **Passed**: $passed_tests ✅
- **Failed**: $failed_tests ❌
- **Success Rate**: $(( passed_tests * 100 / total_tests ))%

## Test Details

EOF

  for test_def in "${TEST_MATRIX[@]}"; do
    IFS='|' read -r test_id components backend env description <<< "$test_def"

    if [ -f "$LOG_DIR/${test_id}-summary.txt" ]; then
      echo "- ✅ **$test_id**: $description" >> "$LOG_DIR/SUMMARY.md"
    elif [ -f "$LOG_DIR/${test_id}-failure.log" ]; then
      echo "- ❌ **$test_id**: $description" >> "$LOG_DIR/SUMMARY.md"
    fi
  done

  cat >> "$LOG_DIR/SUMMARY.md" <<EOF

## Logs

- Orchestrator log: \`orchestrator.log\`
- Individual test summaries: \`T*.txt\`
- Failure logs: \`T*-failure.log\`

## Next Steps

$(if [ $failed_tests -gt 0 ]; then
  echo "- Review failure logs"
  echo "- Check GitHub Actions workflow runs"
  echo "- Verify AWS resources were cleaned up"
  echo "- Investigate root causes"
else
  echo "- All tests passed! 🎉"
  echo "- Review test summaries for insights"
  echo "- Consider running PROD validation"
fi)
EOF

  log "Summary report generated: $LOG_DIR/SUMMARY.md"

  # Exit with appropriate code
  if [ $failed_tests -gt 0 ]; then
    exit 1
  else
    exit 0
  fi
}

# Run main
main
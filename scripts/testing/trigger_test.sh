#!/bin/bash
# Test Workflow Trigger Script
# Usage: ./scripts/testing/trigger_test.sh [project_name] [components] [aws_account_id]
#
# This script triggers the manual-deployment-test.yml workflow with standard parameters

set -e

# Default parameters
PROJECT_NAME="${1:-test-infra}"
COMPONENTS="${2:-terraform-backend,vpc,eks-auto}"
AWS_ACCOUNT_ID="${3:-156041409155}"
ENVIRONMENTS="${4:-dev}"
REGION="${5:-us-east-1}"
BACKEND_TYPE="${6:-local}"
AVAILABILITY_ZONES="${7:-3}"
BRANCH="${8:-infrastructure-testing-20251117}"

echo "========================================="
echo "TRIGGERING TEST WORKFLOW"
echo "========================================="
echo "Project Name: $PROJECT_NAME"
echo "Components: $COMPONENTS"
echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "Environment: $ENVIRONMENTS"
echo "Region: $REGION"
echo "Backend: $BACKEND_TYPE"
echo "AZs: $AVAILABILITY_ZONES"
echo "Branch: $BRANCH"
echo "========================================="

# Trigger workflow
gh workflow run manual-deployment-test.yml \
  --ref "$BRANCH" \
  -f project_name="$PROJECT_NAME" \
  -f components="$COMPONENTS" \
  -f environments="$ENVIRONMENTS" \
  -f region="$REGION" \
  -f aws_account_id="$AWS_ACCOUNT_ID" \
  -f backend_type="$BACKEND_TYPE" \
  -f run_apply=true \
  -f auto_destroy=true \
  -f availability_zones="$AVAILABILITY_ZONES"

echo ""
echo "Workflow triggered. Waiting for run ID..."
sleep 10

# Get latest run ID
RUN_ID=$(gh run list --workflow=manual-deployment-test.yml --limit=1 --json databaseId --jq '.[0].databaseId')

if [ -z "$RUN_ID" ]; then
  echo "ERROR: Could not find run ID"
  exit 1
fi

echo "Run ID: $RUN_ID"
echo "URL: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions/runs/$RUN_ID"
echo ""
echo "Monitoring workflow execution..."
echo "========================================="

# Monitor workflow
gh run watch "$RUN_ID" --exit-status || {
  echo ""
  echo "Workflow failed or was cancelled."
  echo "Check logs: gh run view $RUN_ID --log-failed"
  exit 1
}

echo ""
echo "========================================="
echo "WORKFLOW COMPLETED SUCCESSFULLY"
echo "========================================="

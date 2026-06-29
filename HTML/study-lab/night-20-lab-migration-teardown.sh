#!/usr/bin/env bash
# Night 20 Lab teardown — S3 migration bucket
# Run from repo: bash HTML/study-lab/night-20-lab-migration-teardown.sh

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
BUCKET_NAME="${PREFIX}-migration-${ACCOUNT_ID}"
ROLE_NAME="${PREFIX}-dynamodb-export-role"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-20-migration-result.json"

echo "=== Night 20 teardown — migration staging ==="

if [[ -f "$RESULT_FILE" ]]; then
  SAVED_BUCKET=$(python3 -c "import json; d=json.load(open('$RESULT_FILE')); print(d.get('migrationBucket',''))" 2>/dev/null || true)
  if [[ -n "$SAVED_BUCKET" && "$SAVED_BUCKET" != "None" ]]; then
    BUCKET_NAME="$SAVED_BUCKET"
  fi
fi

if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "Emptying S3 bucket $BUCKET_NAME ..."
  aws s3 rm "s3://${BUCKET_NAME}" --recursive || true
  echo "Deleting S3 bucket $BUCKET_NAME ..."
  aws s3api delete-bucket --bucket "$BUCKET_NAME" --region "$REGION" || true
fi

if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
  echo "Removing legacy export IAM role $ROLE_NAME ..."
  aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name DynamoDbExportToS3 2>/dev/null || true
  aws iam delete-role --role-name "$ROLE_NAME" 2>/dev/null || true
fi

rm -f "$RESULT_FILE"
echo "Night 20 teardown complete. Night 18 DynamoDB table and Night 19 backup unchanged."

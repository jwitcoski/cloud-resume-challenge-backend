#!/usr/bin/env bash
# Night 20 Lab — S3 migration staging + DynamoDB export to S3
# Run from repo: bash HTML/study-lab/night-20-lab-migration-setup.sh
#
# Options:
#   --export-table     start DynamoDB export of wiki-views to S3
#   --verify-export    poll export until COMPLETED (requires --export-table)
#   --skip-bucket      assume bucket exists — export only

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
TABLE_NAME="${PREFIX}-wiki-views"
BUCKET_NAME="${PREFIX}-migration-${ACCOUNT_ID}"
EXPORT_PREFIX=night-20/dynamodb/wiki-views
TAG_KEY=saa-study-migration
TAG_VALUE=night-20

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-20-migration-result.json"

EXPORT_TABLE=false
VERIFY_EXPORT=false
SKIP_BUCKET=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --export-table) EXPORT_TABLE=true; shift ;;
    --verify-export) VERIFY_EXPORT=true; shift ;;
    --skip-bucket) SKIP_BUCKET=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ "$VERIFY_EXPORT" == true && "$EXPORT_TABLE" == false ]]; then
  echo "--verify-export requires --export-table"
  exit 1
fi

echo "=== Night 20 Lab — DMS + S3 migration staging ==="
echo "Table:  $TABLE_NAME"
echo "Bucket: $BUCKET_NAME"
echo ""

TABLE_ARN=$(aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" \
  --query 'Table.TableArn' --output text 2>/dev/null || true)
if [[ -z "$TABLE_ARN" || "$TABLE_ARN" == "None" ]]; then
  echo "ERROR: Table $TABLE_NAME not found. Run Night 18 setup first:"
  echo "  bash HTML/study-lab/night-18-lab-dynamodb-setup.sh"
  exit 1
fi
echo "Study table ARN: $TABLE_ARN"

PITR_STATUS=$(aws dynamodb describe-continuous-backups --table-name "$TABLE_NAME" --region "$REGION" \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' \
  --output text)
if [[ "$PITR_STATUS" != "ENABLED" ]]; then
  echo "ERROR: PITR must be ENABLED for export-to-S3. Night 18 setup enables it."
  echo "Current PITR status: $PITR_STATUS"
  exit 1
fi
echo "PITR: ENABLED (export prerequisite met)"

EXPORT_ARN=""

if [[ "$SKIP_BUCKET" == false ]]; then
  if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "S3 bucket $BUCKET_NAME already exists."
  else
    echo "Creating S3 bucket $BUCKET_NAME ..."
    if [[ "$REGION" == "us-east-1" ]]; then
      aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
    else
      aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
        --create-bucket-configuration "LocationConstraint=$REGION"
    fi
  fi

  echo "Enabling default bucket encryption (SSE-S3) ..."
  ENC_DOC=$(mktemp)
  cat > "$ENC_DOC" <<'EOF'
{
  "Rules": [
    {
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }
  ]
}
EOF
  aws s3api put-bucket-encryption --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration "file://${ENC_DOC}"
  rm -f "$ENC_DOC"

  echo "Tagging bucket ${TAG_KEY}=${TAG_VALUE} ..."
  TAG_DOC=$(mktemp)
  cat > "$TAG_DOC" <<EOF
{
  "TagSet": [
    { "Key": "${TAG_KEY}", "Value": "${TAG_VALUE}" },
    { "Key": "Project", "Value": "${PREFIX}" }
  ]
}
EOF
  aws s3api put-bucket-tagging --bucket "$BUCKET_NAME" --tagging "file://${TAG_DOC}"
  rm -f "$TAG_DOC"
else
  aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null || {
    echo "--skip-bucket set but migration bucket missing — run setup without --skip-bucket first"
    exit 1
  }
fi

if [[ "$EXPORT_TABLE" == true ]]; then
  if [[ -f "$RESULT_FILE" ]]; then
    SAVED_ARN=$(python3 -c "import json; d=json.load(open('$RESULT_FILE')); print(d.get('exportArn') or '')" 2>/dev/null || true)
    if [[ -n "$SAVED_ARN" && "$SAVED_ARN" != "None" ]]; then
      SAVED_STATUS=$(aws dynamodb describe-export --export-arn "$SAVED_ARN" --region "$REGION" \
        --query 'ExportDescription.ExportStatus' --output text 2>/dev/null || true)
      if [[ "$SAVED_STATUS" == "IN_PROGRESS" || "$SAVED_STATUS" == "COMPLETED" ]]; then
        echo "Reusing export from result file ($SAVED_STATUS): $SAVED_ARN"
        EXPORT_ARN="$SAVED_ARN"
      fi
    fi
  fi
  if [[ -z "$EXPORT_ARN" ]]; then
    echo "Starting DynamoDB export to S3 ..."
    EXPORT_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    EXPORT_ARN=$(aws dynamodb export-table-to-point-in-time \
      --table-arn "$TABLE_ARN" \
      --s3-bucket "$BUCKET_NAME" \
      --s3-prefix "$EXPORT_PREFIX" \
      --export-format DYNAMODB_JSON \
      --export-time "$EXPORT_TIME" \
      --region "$REGION" \
      --query 'ExportDescription.ExportArn' --output text)
    echo "Export ARN: $EXPORT_ARN"
  fi

  if [[ "$VERIFY_EXPORT" == true && -n "$EXPORT_ARN" ]]; then
    echo "Polling export until COMPLETED ..."
    DEADLINE=$((SECONDS + 1200))
    while [[ $SECONDS -lt $DEADLINE ]]; do
      STATUS=$(aws dynamodb describe-export --export-arn "$EXPORT_ARN" --region "$REGION" \
        --query 'ExportDescription.ExportStatus' --output text)
      echo "  Export state: $STATUS"
      if [[ "$STATUS" == "COMPLETED" ]]; then
        break
      fi
      if [[ "$STATUS" == "FAILED" ]]; then
        MSG=$(aws dynamodb describe-export --export-arn "$EXPORT_ARN" --region "$REGION" \
          --query 'ExportDescription.FailureMessage' --output text)
        echo "Export failed: $MSG"
        exit 1
      fi
      sleep 20
    done
    if [[ "$STATUS" != "COMPLETED" ]]; then
      echo "Timed out waiting for DynamoDB export."
      exit 1
    fi
    OBJ_COUNT=$(aws s3api list-objects-v2 --bucket "$BUCKET_NAME" --prefix "$EXPORT_PREFIX" \
      --query 'length(Contents)' --output text)
    echo "S3 objects under $EXPORT_PREFIX : $OBJ_COUNT"
  fi
fi

CREATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > "$RESULT_FILE" <<EOF
{
  "lab": "night-20-dms-s3-migration",
  "region": "${REGION}",
  "tableName": "${TABLE_NAME}",
  "tableArn": "${TABLE_ARN}",
  "pitrStatus": "${PITR_STATUS}",
  "migrationBucket": "${BUCKET_NAME}",
  "exportPrefix": "${EXPORT_PREFIX}",
  "tag": "${TAG_KEY}=${TAG_VALUE}",
  "exportArn": "${EXPORT_ARN}",
  "createdAt": "${CREATED_AT}"
}
EOF

echo ""
echo "=== Night 20 setup complete ==="
echo "Result: $RESULT_FILE"
echo "Next: bash HTML/study-lab/night-20-lab-migration-setup.sh --export-table --verify-export"
echo "Teardown: bash HTML/study-lab/night-20-lab-migration-teardown.sh"

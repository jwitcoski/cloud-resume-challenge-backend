#!/usr/bin/env bash
# Night 17 teardown — Lambda stats uploader, IAM role, event source mapping
# Run: bash HTML/study-lab/night-17-lab-lambda-stats-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
FUNCTION_NAME="${PREFIX}-stats-uploader"
ROLE_NAME="${PREFIX}-stats-uploader-role"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-17-lambda-stats-result.json"

echo "=== Night 17 Lambda stats uploader teardown ==="

while IFS= read -r uuid; do
  [[ -z "$uuid" || "$uuid" == "None" ]] && continue
  echo "Deleting event source mapping $uuid ..."
  aws lambda delete-event-source-mapping --uuid "$uuid" --region "$REGION" >/dev/null 2>&1 || true
done < <(aws lambda list-event-source-mappings --function-name "$FUNCTION_NAME" --region "$REGION" \
  --query 'EventSourceMappings[].UUID' --output text 2>/dev/null | tr '\t' '\n')

aws lambda delete-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1 || true
echo "Deleted Lambda function $FUNCTION_NAME (if it existed)."
sleep 5

aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name night-17-stats-uploader >/dev/null 2>&1 || true
aws iam delete-role --role-name "$ROLE_NAME" >/dev/null 2>&1 || true
echo "Deleted IAM role $ROLE_NAME (if it existed)."

aws logs delete-log-group --log-group-name "/aws/lambda/${FUNCTION_NAME}" --region "$REGION" >/dev/null 2>&1 || true

rm -f "$RESULT_FILE"
echo "Night 17 Lambda resources removed. Aurora (Night 16) and SQS (Night 13) unchanged."

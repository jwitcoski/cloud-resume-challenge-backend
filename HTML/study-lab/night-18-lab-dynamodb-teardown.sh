#!/usr/bin/env bash
# Night 18 teardown — DynamoDB stream Lambda, IAM role, study wiki-views table
# Run: bash HTML/study-lab/night-18-lab-dynamodb-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
TABLE_NAME="${PREFIX}-wiki-views"
FUNCTION_NAME="${PREFIX}-wiki-stream-processor"
ROLE_NAME="${PREFIX}-wiki-stream-role"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-18-dynamodb-result.json"

echo '=== Night 18 DynamoDB lab teardown ==='

for uuid in $(aws lambda list-event-source-mappings --function-name "$FUNCTION_NAME" --region "$REGION" \
  --query 'EventSourceMappings[].UUID' --output text 2>/dev/null || true); do
  [[ -z "$uuid" || "$uuid" == "None" ]] && continue
  echo "Deleting event source mapping $uuid ..."
  aws lambda delete-event-source-mapping --uuid "$uuid" --region "$REGION" >/dev/null || true
done

sleep 5
aws lambda delete-function --function-name "$FUNCTION_NAME" --region "$REGION" 2>/dev/null || true
sleep 3
aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name night-18-wiki-stream 2>/dev/null || true
aws iam delete-role --role-name "$ROLE_NAME" 2>/dev/null || true
aws logs delete-log-group --log-group-name "/aws/lambda/$FUNCTION_NAME" --region "$REGION" 2>/dev/null || true
aws dynamodb delete-table --table-name "$TABLE_NAME" --region "$REGION" 2>/dev/null || true
rm -f "$RESULT_FILE"

echo 'Night 18 study resources removed.'

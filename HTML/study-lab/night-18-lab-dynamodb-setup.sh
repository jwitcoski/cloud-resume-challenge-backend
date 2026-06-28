#!/usr/bin/env bash
# Night 18 Lab — DynamoDB wiki views: PITR + Streams + stub stream Lambda
# Run: bash HTML/study-lab/night-18-lab-dynamodb-setup.sh [--bump-view] [--verify-stream] [--skip-stream-mapping]

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
TABLE_NAME="${PREFIX}-wiki-views"
FUNCTION_NAME="${PREFIX}-wiki-stream-processor"
ROLE_NAME="${PREFIX}-wiki-stream-role"
RUNTIME=python3.12
HANDLER=night-18-lab-stream-handler.handler
TIMEOUT_SEC=15
MEMORY_MB=128
TEST_PAGE_ID=wiki/iceland

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HANDLER_FILE="${SCRIPT_DIR}/night-18-lab-stream-handler.py"
TRUST_POLICY_FILE="${SCRIPT_DIR}/night-18-lambda-trust-policy.json"
RESULT_FILE="${SCRIPT_DIR}/night-18-dynamodb-result.json"
PACK_DIR="${TMPDIR:-/tmp}/night18-lambda-pack"
ZIP_FILE="${TMPDIR:-/tmp}/night18-lambda.zip"

BUMP_VIEW=false
VERIFY_STREAM=false
SKIP_STREAM_MAPPING=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --bump-view) BUMP_VIEW=true; shift ;;
    --verify-stream) VERIFY_STREAM=true; shift ;;
    --skip-stream-mapping) SKIP_STREAM_MAPPING=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

ensure_table() {
  if ! aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" &>/dev/null; then
    echo "Creating DynamoDB table $TABLE_NAME ..."
    aws dynamodb create-table \
      --table-name "$TABLE_NAME" \
      --attribute-definitions AttributeName=pageId,AttributeType=S \
      --key-schema AttributeName=pageId,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
      --tags Key=Project,Value="$PREFIX" Key=Night,Value=18 \
      --region "$REGION" >/dev/null
    aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$REGION"
  else
    echo "Table $TABLE_NAME already exists."
    stream_enabled=$(aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" \
      --query 'Table.StreamSpecification.StreamEnabled' --output text)
    if [[ "$stream_enabled" != "True" ]]; then
      echo "Enabling DynamoDB stream ..."
      aws dynamodb update-table --table-name "$TABLE_NAME" --region "$REGION" \
        --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES >/dev/null
      aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$REGION"
    fi
  fi
}

ensure_pitr() {
  pitr=$(aws dynamodb describe-continuous-backups --table-name "$TABLE_NAME" --region "$REGION" \
    --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' --output text)
  if [[ "$pitr" != "ENABLED" ]]; then
    echo "Enabling PITR ..."
    aws dynamodb update-continuous-backups --table-name "$TABLE_NAME" --region "$REGION" \
      --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true >/dev/null
  else
    echo "PITR already enabled."
  fi
}

seed_pages() {
  for row in \
    'wiki/iceland|Iceland resorts guide|0' \
    'wiki/norway|Norway resorts guide|0' \
    'wiki/resume|Cloud Resume Challenge|42'; do
    IFS='|' read -r pid title count <<< "$row"
    aws dynamodb put-item --table-name "$TABLE_NAME" --region "$REGION" \
      --item "{\"pageId\":{\"S\":\"$pid\"},\"title\":{\"S\":\"$title\"},\"viewCount\":{\"N\":\"$count\"}}" \
      --condition-expression 'attribute_not_exists(pageId)' 2>/dev/null || true
  done
  echo "Seed rows ensured."
}

new_lambda_zip() {
  rm -rf "$PACK_DIR"
  mkdir -p "$PACK_DIR"
  cp "$HANDLER_FILE" "$PACK_DIR/"
  rm -f "$ZIP_FILE"
  (cd "$PACK_DIR" && zip -q -r "$ZIP_FILE" .)
  echo "Lambda zip: $ZIP_FILE"
}

ensure_role() {
  local stream_arn=$1
  if ! aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    echo "Creating IAM role $ROLE_NAME ..."
    aws iam create-role --role-name "$ROLE_NAME" \
      --assume-role-policy-document "file://${TRUST_POLICY_FILE}" \
      --description 'Night 18 DynamoDB stream stub processor' >/dev/null
    sleep 8
  fi
  policy_file="${TMPDIR:-/tmp}/night18-lambda-policy.json"
  cat > "$policy_file" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetRecords", "dynamodb:GetShardIterator", "dynamodb:DescribeStream", "dynamodb:ListStreams"
      ],
      "Resource": "$stream_arn"
    }
  ]
}
EOF
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name night-18-wiki-stream \
    --policy-document "file://${policy_file}" >/dev/null
  aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text
}

ensure_mapping() {
  local stream_arn=$1
  existing=$(aws lambda list-event-source-mappings --function-name "$FUNCTION_NAME" --region "$REGION" \
    --query "EventSourceMappings[?EventSourceArn=='${stream_arn}'].UUID" --output text)
  if [[ -n "$existing" && "$existing" != "None" ]]; then
    echo "Stream event source mapping already exists."
    echo "$existing"
    return
  fi
  echo "Creating stream event source mapping ..."
  aws lambda create-event-source-mapping \
    --function-name "$FUNCTION_NAME" \
    --event-source-arn "$stream_arn" \
    --starting-position LATEST \
    --batch-size 10 \
    --enabled \
    --region "$REGION" \
    --query UUID --output text
}

bump_view() {
  echo "Bumping viewCount on $TEST_PAGE_ID ..."
  aws dynamodb update-item --table-name "$TABLE_NAME" --region "$REGION" \
    --key "{\"pageId\":{\"S\":\"$TEST_PAGE_ID\"}}" \
    --update-expression 'ADD viewCount :inc SET updatedAt = :now' \
    --expression-attribute-values '{":inc":{"N":"1"},":now":{"S":"night-18-lab"}}' \
    --return-values ALL_NEW --query 'Attributes.viewCount.N' --output text
}

echo '=== Night 18 Lab — DynamoDB PITR + Streams ==='
ensure_table
ensure_pitr
seed_pages

TABLE_ARN=$(aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" --query 'Table.TableArn' --output text)
STREAM_ARN=$(aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" --query 'Table.LatestStreamArn' --output text)
PITR_STATUS=$(aws dynamodb describe-continuous-backups --table-name "$TABLE_NAME" --region "$REGION" \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' --output text)

new_lambda_zip
ROLE_ARN=$(ensure_role "$STREAM_ARN")
ENV_JSON="{\"Variables\":{\"TABLE_NAME\":\"$TABLE_NAME\"}}"

if ! aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
  echo "Creating Lambda $FUNCTION_NAME ..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --role "$ROLE_ARN" \
    --handler "$HANDLER" \
    --timeout "$TIMEOUT_SEC" \
    --memory-size "$MEMORY_MB" \
    --zip-file "fileb://${ZIP_FILE}" \
    --environment "$ENV_JSON" \
    --region "$REGION" >/dev/null
else
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://${ZIP_FILE}" --region "$REGION" >/dev/null
  sleep 3
  aws lambda update-function-configuration --function-name "$FUNCTION_NAME" \
    --timeout "$TIMEOUT_SEC" --memory-size "$MEMORY_MB" --environment "$ENV_JSON" --region "$REGION" >/dev/null
fi

MAPPING_UUID=""
if [[ "$SKIP_STREAM_MAPPING" != true ]]; then
  MAPPING_UUID=$(ensure_mapping "$STREAM_ARN")
fi

BUMP_RESULT=""
if [[ "$BUMP_VIEW" == true || "$VERIFY_STREAM" == true ]]; then
  BUMP_RESULT=$(bump_view)
  echo "  viewCount is now $BUMP_RESULT"
fi

if [[ "$VERIFY_STREAM" == true ]]; then
  LOG_GROUP="/aws/lambda/$FUNCTION_NAME"
  aws logs create-log-group --log-group-name "$LOG_GROUP" --region "$REGION" 2>/dev/null || true
  sleep 8
  echo "Recent stream processor logs:"
  aws logs filter-log-events --log-group-name "$LOG_GROUP" --region "$REGION" \
    --start-time $(($(date +%s)*1000 - 300000)) --filter-pattern 'wiki/' \
    --query 'events[].message' --output text || echo "(none yet — retry in 10s)"
fi

FN_ARN=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.FunctionArn' --output text)
cat > "$RESULT_FILE" <<EOF
{
  "lab": "night-18-dynamodb-pitr-streams",
  "region": "$REGION",
  "dynamodb": {
    "tableName": "$TABLE_NAME",
    "tableArn": "$TABLE_ARN",
    "streamArn": "$STREAM_ARN",
    "pitrStatus": "$PITR_STATUS"
  },
  "lambda": {
    "functionName": "$FUNCTION_NAME",
    "functionArn": "$FN_ARN",
    "eventSourceMappingUuid": "$MAPPING_UUID"
  }
}
EOF

echo ""
echo "Result saved: $RESULT_FILE"
echo "Next: bash HTML/study-lab/night-18-lab-dynamodb-setup.sh --bump-view --verify-stream"
echo "Teardown: bash HTML/study-lab/night-18-lab-dynamodb-teardown.sh"

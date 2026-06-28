#!/usr/bin/env bash
# Night 17 Lab 2D part 2 — Lambda stats uploader in VPC -> Aurora
# Run: bash HTML/study-lab/night-17-lab-lambda-stats-setup.sh [--test-invoke] [--verify-row] [--skip-sqs-mapping]

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
FUNCTION_NAME="${PREFIX}-stats-uploader"
ROLE_NAME="${PREFIX}-stats-uploader-role"
MAIN_QUEUE="${PREFIX}-iceland-completion"
RUNTIME=python3.12
HANDLER=night-17-lab-lambda-stats-handler.handler
TIMEOUT_SEC=30
MEMORY_MB=256

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HANDLER_FILE="${SCRIPT_DIR}/night-17-lab-lambda-stats-handler.py"
TRUST_POLICY_FILE="${SCRIPT_DIR}/night-17-lambda-trust-policy.json"
AURORA_RESULT_FILE="${SCRIPT_DIR}/night-16-aurora-result.json"
SQS_RESULT_FILE="${SCRIPT_DIR}/night-13-sqs-result.json"
RESULT_FILE="${SCRIPT_DIR}/night-17-lambda-stats-result.json"
PACK_DIR="${TMPDIR:-/tmp}/night17-lambda-pack"
ZIP_FILE="${TMPDIR:-/tmp}/night17-lambda.zip"

TEST_INVOKE=false
VERIFY_ROW=false
SKIP_SQS_MAPPING=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --test-invoke) TEST_INVOKE=true; shift ;;
    --verify-row) VERIFY_ROW=true; shift ;;
    --skip-sqs-mapping) SKIP_SQS_MAPPING=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

load_aurora_config() {
  if [[ -f "$AURORA_RESULT_FILE" ]]; then
    WRITER_ENDPOINT=$(jq -r '.aurora.writerEndpoint' "$AURORA_RESULT_FILE")
    DB_NAME=$(jq -r '.aurora.database' "$AURORA_RESULT_FILE")
    SECRET_ARN=$(jq -r '.aurora.masterUserSecretArn' "$AURORA_RESULT_FILE")
    CLUSTER_ARN=$(jq -r '.aurora.clusterArn' "$AURORA_RESULT_FILE")
    LAMBDA_SG=$(jq -r '.securityGroups.lambdaStats.id' "$AURORA_RESULT_FILE")
    SUBNET_A=$(jq -r '.subnetGroup.subnetIds[0]' "$AURORA_RESULT_FILE")
    SUBNET_B=$(jq -r '.subnetGroup.subnetIds[1]' "$AURORA_RESULT_FILE")
    return
  fi
  local cluster_id="${PREFIX}-aurora"
  WRITER_ENDPOINT=$(aws rds describe-db-clusters --db-cluster-identifier "$cluster_id" --region "$REGION" \
    --query 'DBClusters[0].Endpoint' --output text 2>/dev/null || true)
  if [[ -z "$WRITER_ENDPOINT" || "$WRITER_ENDPOINT" == "None" ]]; then
    echo "Missing $AURORA_RESULT_FILE and cluster $cluster_id not found — run Night 16 setup first."
    exit 1
  fi
  SECRET_ARN=$(aws rds describe-db-clusters --db-cluster-identifier "$cluster_id" --region "$REGION" \
    --query 'DBClusters[0].MasterUserSecret.SecretArn' --output text)
  CLUSTER_ARN=$(aws rds describe-db-clusters --db-cluster-identifier "$cluster_id" --region "$REGION" \
    --query 'DBClusters[0].DBClusterArn' --output text)
  DB_NAME=gsa_stats
  local vpc_file="${SCRIPT_DIR}/night-9-vpc-ids.json"
  local vpc_id lambda_sg_name
  vpc_id=$(jq -r '.vpc.id' "$vpc_file")
  lambda_sg_name="${PREFIX}-lambda-stats-sg"
  LAMBDA_SG=$(aws ec2 describe-security-groups --region "$REGION" \
    --filters "Name=group-name,Values=${lambda_sg_name}" "Name=vpc-id,Values=${vpc_id}" \
    --query 'SecurityGroups[0].GroupId' --output text)
  SUBNET_A=$(jq -r '.subnets.privateA.id' "$vpc_file")
  SUBNET_B=$(jq -r '.subnets.privateB.id' "$vpc_file")
}

get_queue_arn() {
  if [[ -f "$SQS_RESULT_FILE" ]]; then
    jq -r '.queues.main.arn' "$SQS_RESULT_FILE"
    return
  fi
  local url
  url=$(aws sqs get-queue-url --queue-name "$MAIN_QUEUE" --region "$REGION" \
    --query 'QueueUrl' --output text 2>/dev/null || true)
  if [[ -z "$url" || "$url" == "None" ]]; then
    echo ""
    return
  fi
  aws sqs get-queue-attributes --queue-url "$url" --attribute-names QueueArn --region "$REGION" \
    --query 'Attributes.QueueArn' --output text
}

new_lambda_zip() {
  rm -rf "$PACK_DIR"
  mkdir -p "$PACK_DIR"
  cp "$HANDLER_FILE" "$PACK_DIR/"
  echo "Installing pg8000 into deployment package ..."
  python3 -m pip install pg8000 -t "$PACK_DIR" --quiet --disable-pip-version-check
  rm -f "$ZIP_FILE"
  (cd "$PACK_DIR" && zip -rq "$ZIP_FILE" .)
  echo "Lambda zip: $ZIP_FILE"
}

ensure_role() {
  local secret_arn="$1"
  local queue_arn="$2"
  local role_arn policy_file
  role_arn=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || true)
  if [[ -z "$role_arn" || "$role_arn" == "None" ]]; then
    echo "Creating IAM role $ROLE_NAME ..."
    role_arn=$(aws iam create-role --role-name "$ROLE_NAME" \
      --assume-role-policy-document "file://${TRUST_POLICY_FILE}" \
      --description 'Night 17 stats uploader Lambda' \
      --query 'Role.Arn' --output text)
    sleep 10
  else
    echo "IAM role $ROLE_NAME already exists."
  fi

  policy_file="${TMPDIR:-/tmp}/night17-lambda-policy.json"
  if [[ -n "$queue_arn" ]]; then
    jq -n \
      --arg secret "$secret_arn" \
      --arg queue "$queue_arn" \
      '{
        Version: "2012-10-17",
        Statement: [
          { Effect: "Allow", Action: ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"], Resource: "arn:aws:logs:*:*:*" },
          { Effect: "Allow", Action: ["ec2:CreateNetworkInterface","ec2:DescribeNetworkInterfaces","ec2:DeleteNetworkInterface","ec2:AssignPrivateIpAddresses","ec2:UnassignPrivateIpAddresses"], Resource: "*" },
          { Effect: "Allow", Action: ["secretsmanager:GetSecretValue"], Resource: $secret },
          { Effect: "Allow", Action: ["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"], Resource: $queue }
        ]
      }' > "$policy_file"
  else
    jq -n \
      --arg secret "$secret_arn" \
      '{
        Version: "2012-10-17",
        Statement: [
          { Effect: "Allow", Action: ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"], Resource: "arn:aws:logs:*:*:*" },
          { Effect: "Allow", Action: ["ec2:CreateNetworkInterface","ec2:DescribeNetworkInterfaces","ec2:DeleteNetworkInterface","ec2:AssignPrivateIpAddresses","ec2:UnassignPrivateIpAddresses"], Resource: "*" },
          { Effect: "Allow", Action: ["secretsmanager:GetSecretValue"], Resource: $secret }
        ]
      }' > "$policy_file"
  fi
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name night-17-stats-uploader \
    --policy-document "file://${policy_file}" >/dev/null
  echo "$role_arn"
}

ensure_event_source_mapping() {
  local queue_arn="$1"
  local existing
  existing=$(aws lambda list-event-source-mappings --function-name "$FUNCTION_NAME" --region "$REGION" \
    --query "EventSourceMappings[?EventSourceArn=='${queue_arn}'].UUID | [0]" --output text 2>/dev/null || true)
  if [[ -n "$existing" && "$existing" != "None" ]]; then
    echo "SQS event source mapping already exists."
    echo "$existing"
    return
  fi
  echo "Creating SQS event source mapping ..."
  aws lambda create-event-source-mapping \
    --function-name "$FUNCTION_NAME" \
    --event-source-arn "$queue_arn" \
    --batch-size 1 \
    --enabled \
    --region "$REGION" \
    --query 'UUID' --output text
}

echo "=== Night 17 Lab 2D part 2 - Lambda stats uploader ==="
load_aurora_config

if [[ -z "$WRITER_ENDPOINT" || "$WRITER_ENDPOINT" == "None" || -z "$SECRET_ARN" || "$SECRET_ARN" == "None" || -z "$LAMBDA_SG" || "$LAMBDA_SG" == "None" ]]; then
  echo "Aurora result missing writerEndpoint, secret ARN, or lambda-stats-sg — re-run Night 16 setup."
  exit 1
fi

QUEUE_ARN=$(get_queue_arn)
if [[ -z "$QUEUE_ARN" && "$SKIP_SQS_MAPPING" != true ]]; then
  echo "Warning: queue $MAIN_QUEUE not found — use --skip-sqs-mapping or run Night 13 setup."
  SKIP_SQS_MAPPING=true
fi

new_lambda_zip
ROLE_ARN=$(ensure_role "$SECRET_ARN" "$QUEUE_ARN")

ENV_JSON=$(jq -nc \
  --arg host "$WRITER_ENDPOINT" \
  --arg db "$DB_NAME" \
  --arg secret "$SECRET_ARN" \
  '{Variables:{DB_HOST:$host,DB_NAME:$db,DB_SECRET_ARN:$secret}}')

if ! aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "Creating Lambda function $FUNCTION_NAME ..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --role "$ROLE_ARN" \
    --handler "$HANDLER" \
    --timeout "$TIMEOUT_SEC" \
    --memory-size "$MEMORY_MB" \
    --zip-file "fileb://${ZIP_FILE}" \
    --environment "$ENV_JSON" \
    --vpc-config "SubnetIds=${SUBNET_A},${SUBNET_B},SecurityGroupIds=${LAMBDA_SG}" \
    --region "$REGION" >/dev/null
  echo "Waiting for Lambda VPC configuration ..."
  sleep 20
else
  echo "Updating Lambda $FUNCTION_NAME ..."
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://${ZIP_FILE}" --region "$REGION" >/dev/null
  sleep 5
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --timeout "$TIMEOUT_SEC" \
    --memory-size "$MEMORY_MB" \
    --environment "$ENV_JSON" \
    --vpc-config "SubnetIds=${SUBNET_A},${SUBNET_B},SecurityGroupIds=${LAMBDA_SG}" \
    --region "$REGION" >/dev/null
  sleep 15
fi

MAPPING_UUID=""
if [[ "$SKIP_SQS_MAPPING" != true && -n "$QUEUE_ARN" ]]; then
  MAPPING_UUID=$(ensure_event_source_mapping "$QUEUE_ARN")
fi

TEST_PAYLOAD='{"resort_id":"IS-001","resort_name":"Bláfjöll","country_code":"IS"}'
INVOKE_RESULT=""
if [[ "$TEST_INVOKE" == true ]]; then
  echo "Test invoke (cold start may take 15-45s) ..."
  OUT_FILE="${TMPDIR:-/tmp}/night17-lambda-out.json"
  aws lambda invoke --function-name "$FUNCTION_NAME" --payload "$TEST_PAYLOAD" --region "$REGION" "$OUT_FILE" >/dev/null
  INVOKE_RESULT=$(cat "$OUT_FILE")
  echo "Invoke response:"
  echo "$INVOKE_RESULT" | jq .
fi

if [[ "$VERIFY_ROW" == true ]]; then
  if [[ -z "$CLUSTER_ARN" || "$CLUSTER_ARN" == "None" ]]; then
    echo "Warning: clusterArn missing — skip verify or re-run Night 16 setup."
  else
    echo "Verifying resort_stats via RDS Data API ..."
    aws rds-data execute-statement \
      --resource-arn "$CLUSTER_ARN" \
      --secret-arn "$SECRET_ARN" \
      --database "$DB_NAME" \
      --sql "SELECT resort_id, resort_name, monthly_runs FROM resort_stats WHERE resort_id = 'IS-001'" \
      --region "$REGION" | jq -r '.records[0][] | .stringValue // .longValue'
  fi
fi

FN_ARN=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.FunctionArn' --output text)

jq -n \
  --arg completed "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --arg fn "$FUNCTION_NAME" \
  --arg fn_arn "$FN_ARN" \
  --arg role "$ROLE_NAME" \
  --arg lambda_sg "$LAMBDA_SG" \
  --arg subnet_a "$SUBNET_A" \
  --arg subnet_b "$SUBNET_B" \
  --arg writer "$WRITER_ENDPOINT" \
  --arg db "$DB_NAME" \
  --arg secret "$SECRET_ARN" \
  --arg queue "$QUEUE_ARN" \
  --arg mapping "$MAPPING_UUID" \
  --argjson skip_sqs "$([[ "$SKIP_SQS_MAPPING" == true ]] && echo true || echo false)" \
  --argjson test_ran "$([[ "$TEST_INVOKE" == true ]] && echo true || echo false)" \
  '{
    lab: "night-17-lab2d-lambda-stats-part2",
    region: "us-east-1",
    completedAt: $completed,
    lambda: {
      functionName: $fn,
      functionArn: $fn_arn,
      roleName: $role,
      runtime: "python3.12",
      handler: "night-17-lab-lambda-stats-handler.handler",
      timeoutSeconds: 30,
      memoryMb: 256,
      vpcSecurityGroupId: $lambda_sg,
      subnetIds: [$subnet_a, $subnet_b]
    },
    aurora: {
      writerEndpoint: $writer,
      database: $db,
      secretArn: $secret,
      resultFile: "night-16-aurora-result.json"
    },
    sqs: {
      queueName: "saa-study-gsa-iceland-completion",
      queueArn: $queue,
      eventSourceMappingUuid: (if $mapping == "" then null else $mapping end),
      skippedMapping: $skip_sqs
    },
    testInvoke: {
      ran: $test_ran,
      payload: { resort_id: "IS-001", resort_name: "Bláfjöll", country_code: "IS" }
    }
  }' > "$RESULT_FILE"

echo ""
echo "Result saved: $RESULT_FILE"
echo "Teardown: bash HTML/study-lab/night-17-lab-lambda-stats-teardown.sh"

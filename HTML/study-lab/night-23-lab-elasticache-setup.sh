#!/usr/bin/env bash
# Night 23 Lab 3A — ElastiCache Redis + cache-aside Lambda reader
# Run: bash HTML/study-lab/night-23-lab-elasticache-setup.sh [--test-invoke] [--bench-latency]

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
CLUSTER_ID="${PREFIX}-redis"
SUBNET_GROUP="${PREFIX}-redis-subnets"
REDIS_SG_NAME="${PREFIX}-redis-sg"
FUNCTION_NAME="${PREFIX}-cache-reader"
ROLE_NAME="${PREFIX}-cache-reader-role"
RUNTIME=python3.12
HANDLER=night-23-lab-cache-handler.handler
TIMEOUT_SEC=30
MEMORY_MB=256
CACHE_NODE_TYPE=cache.t4g.micro
ENGINE_VERSION=7.1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HANDLER_FILE="${SCRIPT_DIR}/night-23-lab-cache-handler.py"
TRUST_POLICY_FILE="${SCRIPT_DIR}/night-18-lambda-trust-policy.json"
AURORA_RESULT_FILE="${SCRIPT_DIR}/night-16-aurora-result.json"
VPC_IDS_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"
RESULT_FILE="${SCRIPT_DIR}/night-23-elasticache-result.json"
PACK_DIR="${TMPDIR:-/tmp}/night23-lambda-pack"
ZIP_FILE="${TMPDIR:-/tmp}/night23-lambda.zip"

TEST_INVOKE=false
BENCH_LATENCY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --test-invoke) TEST_INVOKE=true; shift ;;
    --bench-latency) BENCH_LATENCY=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

aws_text() {
  local out
  out=$(aws "$@" --output text 2>/dev/null) || return 1
  [[ -z "$out" || "$out" == "None" ]] && return 1
  echo "$out"
}

get_sg_id() {
  local name="$1" vpc="$2"
  aws_text ec2 describe-security-groups --region "$REGION" \
    --filters "Name=group-name,Values=$name" "Name=vpc-id,Values=$vpc" \
    --query 'SecurityGroups[0].GroupId'
}

load_aurora_config() {
  if [[ -f "$AURORA_RESULT_FILE" ]]; then
  python - <<'PY' "$AURORA_RESULT_FILE"
import json, sys
print(json.dumps(json.load(open(sys.argv[1]))))
PY
    return
  fi
  local cluster="${PREFIX}-aurora"
  local writer secret vpc_json lambda_sg_name lambda_sg
  writer=$(aws_text rds describe-db-clusters --db-cluster-identifier "$cluster" --region "$REGION" --query 'DBClusters[0].Endpoint') || {
    echo "Missing $AURORA_RESULT_FILE and cluster $cluster — run Night 16 first." >&2
    exit 1
  }
  secret=$(aws_text rds describe-db-clusters --db-cluster-identifier "$cluster" --region "$REGION" --query 'DBClusters[0].MasterUserSecret.SecretArn')
  vpc_json=$(cat "$VPC_IDS_FILE")
  lambda_sg_name="${PREFIX}-lambda-stats-sg"
  lambda_sg=$(get_sg_id "$lambda_sg_name" "$(echo "$vpc_json" | python -c "import json,sys; print(json.load(sys.stdin)['vpc']['id'])")")
  python - <<PY
import json
vpc = json.loads('''$vpc_json''')
print(json.dumps({
  "aurora": {"writerEndpoint": "$writer", "database": "gsa_stats", "masterUserSecretArn": "$secret"},
  "securityGroups": {"lambdaStats": {"id": "$lambda_sg", "name": "${PREFIX}-lambda-stats-sg"}},
  "subnetGroup": {"subnetIds": [vpc["subnets"]["privateA"]["id"], vpc["subnets"]["privateB"]["id"]]}
}))
PY
}

ensure_subnet_group() {
  local sub_a="$1" sub_b="$2"
  if aws elasticache describe-cache-subnet-groups --cache-subnet-group-name "$SUBNET_GROUP" --region "$REGION" &>/dev/null; then
    echo "Cache subnet group $SUBNET_GROUP already exists."
  else
    echo "Creating cache subnet group $SUBNET_GROUP ..."
    aws elasticache create-cache-subnet-group \
      --cache-subnet-group-name "$SUBNET_GROUP" \
      --cache-subnet-group-description "Night 23 Redis in Night 9 private subnets" \
      --subnet-ids "$sub_a" "$sub_b" \
      --region "$REGION" >/dev/null
  fi
}

ensure_redis_sg() {
  local vpc_id="$1" lambda_sg="$2"
  local sg_id
  sg_id=$(get_sg_id "$REDIS_SG_NAME" "$vpc_id")
  if [[ -z "$sg_id" ]]; then
    echo "Creating security group $REDIS_SG_NAME ..."
    sg_id=$(aws ec2 create-security-group \
      --group-name "$REDIS_SG_NAME" \
      --description "Night 23 ElastiCache Redis - ingress from lambda-stats-sg only" \
      --vpc-id "$vpc_id" \
      --region "$REGION" \
      --query GroupId --output text)
    sleep 3
  else
    echo "Security group $REDIS_SG_NAME already exists ($sg_id)."
  fi
  if ! aws ec2 describe-security-groups --group-ids "$sg_id" --region "$REGION" \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`6379\` && UserIdGroupPairs[?GroupId==\`$lambda_sg\`]]" --output text | grep -q .; then
    echo "Authorizing TCP 6379 on $REDIS_SG_NAME from lambda-stats-sg ..."
    aws ec2 authorize-security-group-ingress \
      --group-id "$sg_id" \
      --protocol tcp \
      --port 6379 \
      --source-group "$lambda_sg" \
      --region "$REGION" >/dev/null
  fi
  echo "$sg_id"
}

wait_cache_available() {
  local deadline=$((SECONDS + 900))
  while [[ $SECONDS -lt $deadline ]]; do
    local status
    status=$(aws_text elasticache describe-cache-clusters --cache-cluster-id "$CLUSTER_ID" --region "$REGION" --query 'CacheClusters[0].CacheClusterStatus' || true)
    echo "  Redis cluster status: ${status:-creating}"
    [[ "$status" == "available" ]] && return 0
    sleep 30
  done
  echo "Redis cluster $CLUSTER_ID not available in time" >&2
  exit 1
}

ensure_redis_cluster() {
  local redis_sg="$1"
  local status
  status=$(aws_text elasticache describe-cache-clusters --cache-cluster-id "$CLUSTER_ID" --region "$REGION" --query 'CacheClusters[0].CacheClusterStatus' || true)
  if [[ -z "$status" ]]; then
    echo "Creating ElastiCache cluster $CLUSTER_ID ($CACHE_NODE_TYPE) — may take 5-10 min ..."
    aws elasticache create-cache-cluster \
      --cache-cluster-id "$CLUSTER_ID" \
      --engine redis \
      --engine-version "$ENGINE_VERSION" \
      --cache-node-type "$CACHE_NODE_TYPE" \
      --num-cache-nodes 1 \
      --cache-subnet-group-name "$SUBNET_GROUP" \
      --security-group-ids "$redis_sg" \
      --tags Key=Project,Value="$PREFIX" Key=Night,Value=23 \
      --region "$REGION" >/dev/null
  else
    echo "ElastiCache cluster $CLUSTER_ID status: $status"
  fi
  aws elasticache wait cache-cluster-available --cache-cluster-id "$CLUSTER_ID" --region "$REGION" 2>/dev/null || wait_cache_available
}

get_redis_endpoint() {
  local addr port
  addr=$(aws_text elasticache describe-cache-clusters --cache-cluster-id "$CLUSTER_ID" --show-cache-node-info --region "$REGION" --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address')
  port=$(aws_text elasticache describe-cache-clusters --cache-cluster-id "$CLUSTER_ID" --show-cache-node-info --region "$REGION" --query 'CacheClusters[0].CacheNodes[0].Endpoint.Port')
  [[ -z "$addr" ]] && { echo "Redis endpoint not found" >&2; exit 1; }
  echo "${addr}|${port:-6379}"
}

new_lambda_zip() {
  rm -rf "$PACK_DIR"
  mkdir -p "$PACK_DIR"
  cp "$HANDLER_FILE" "$PACK_DIR/"
  echo "Installing redis + pg8000 into deployment package ..."
  python -m pip install redis pg8000 -t "$PACK_DIR" --quiet --disable-pip-version-check
  rm -f "$ZIP_FILE"
  (cd "$PACK_DIR" && zip -qr "$ZIP_FILE" .)
  echo "Lambda zip: $ZIP_FILE"
}

ensure_role() {
  local secret_arn="$1"
  local role_arn
  role_arn=$(aws_text iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' || true)
  if [[ -z "$role_arn" ]]; then
    echo "Creating IAM role $ROLE_NAME ..."
    role_arn=$(aws iam create-role --role-name "$ROLE_NAME" \
      --assume-role-policy-document "file://$TRUST_POLICY_FILE" \
      --description "Night 23 cache-aside reader Lambda" \
      --query 'Role.Arn' --output text)
    sleep 10
  else
    echo "IAM role $ROLE_NAME already exists."
  fi
  local policy_file="${TMPDIR:-/tmp}/night23-lambda-policy.json"
  cat >"$policy_file" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect": "Allow", "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"], "Resource": "arn:aws:logs:*:*:*"},
    {"Effect": "Allow", "Action": ["ec2:CreateNetworkInterface", "ec2:DescribeNetworkInterfaces", "ec2:DeleteNetworkInterface", "ec2:AssignPrivateIpAddresses", "ec2:UnassignPrivateIpAddresses"], "Resource": "*"},
    {"Effect": "Allow", "Action": ["secretsmanager:GetSecretValue"], "Resource": "$secret_arn"}
  ]
}
EOF
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name night-23-cache-reader --policy-document "file://$policy_file" >/dev/null
  echo "$role_arn"
}

invoke_lambda() {
  local payload="$1"
  local payload_file="${TMPDIR:-/tmp}/night23-payload.json"
  local out_file="${TMPDIR:-/tmp}/night23-out.json"
  echo "$payload" >"$payload_file"
  echo "Lambda invoke (cold start may take 15-45s) ..."
  aws lambda invoke --function-name "$FUNCTION_NAME" --payload "file://$payload_file" --region "$REGION" "$out_file" >/dev/null
  cat "$out_file"
}

echo "=== Night 23 Lab 3A - ElastiCache Redis cache-aside ==="
[[ -f "$VPC_IDS_FILE" ]] || { echo "Missing $VPC_IDS_FILE — run Night 9 first." >&2; exit 1; }

VPC_ID=$(python -c "import json; print(json.load(open('$VPC_IDS_FILE'))['vpc']['id'])")
SUBNET_A=$(python -c "import json; print(json.load(open('$VPC_IDS_FILE'))['subnets']['privateA']['id'])")
SUBNET_B=$(python -c "import json; print(json.load(open('$VPC_IDS_FILE'))['subnets']['privateB']['id'])")

AURORA_JSON=$(load_aurora_config)
WRITER=$(echo "$AURORA_JSON" | python -c "import json,sys; print(json.load(sys.stdin)['aurora']['writerEndpoint'])")
DB_NAME=$(echo "$AURORA_JSON" | python -c "import json,sys; print(json.load(sys.stdin)['aurora']['database'])")
SECRET_ARN=$(echo "$AURORA_JSON" | python -c "import json,sys; print(json.load(sys.stdin)['aurora']['masterUserSecretArn'])")
LAMBDA_SG=$(echo "$AURORA_JSON" | python -c "import json,sys; print(json.load(sys.stdin)['securityGroups']['lambdaStats']['id'])")

ensure_subnet_group "$SUBNET_A" "$SUBNET_B"
REDIS_SG=$(ensure_redis_sg "$VPC_ID" "$LAMBDA_SG")
ensure_redis_cluster "$REDIS_SG"
IFS='|' read -r REDIS_HOST REDIS_PORT <<< "$(get_redis_endpoint)"

new_lambda_zip
ROLE_ARN=$(ensure_role "$SECRET_ARN")

ENV_JSON=$(python - <<PY
import json
print(json.dumps({"Variables": {
  "REDIS_HOST": "$REDIS_HOST",
  "REDIS_PORT": "$REDIS_PORT",
  "DB_HOST": "$WRITER",
  "DB_NAME": "$DB_NAME",
  "DB_SECRET_ARN": "$SECRET_ARN"
}}))
PY
)

if ! aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
  echo "Creating Lambda function $FUNCTION_NAME ..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --role "$ROLE_ARN" \
    --handler "$HANDLER" \
    --timeout "$TIMEOUT_SEC" \
    --memory-size "$MEMORY_MB" \
    --zip-file "fileb://$ZIP_FILE" \
    --environment "$ENV_JSON" \
    --vpc-config "SubnetIds=$SUBNET_A,$SUBNET_B,SecurityGroupIds=$LAMBDA_SG" \
    --region "$REGION" >/dev/null
  echo "Waiting for Lambda VPC configuration ..."
  sleep 20
else
  echo "Updating Lambda $FUNCTION_NAME ..."
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://$ZIP_FILE" --region "$REGION" >/dev/null
  sleep 5
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --timeout "$TIMEOUT_SEC" \
    --memory-size "$MEMORY_MB" \
    --environment "$ENV_JSON" \
    --vpc-config "SubnetIds=$SUBNET_A,$SUBNET_B,SecurityGroupIds=$LAMBDA_SG" \
    --region "$REGION" >/dev/null
  sleep 15
fi

BENCH_JSON=null
INVOKE_JSON=null
if $BENCH_LATENCY; then
  BENCH_JSON=$(invoke_lambda '{"action":"bench","resort_id":"IS-001"}')
  echo "Bench response:"
  echo "$BENCH_JSON" | python -m json.tool
elif $TEST_INVOKE; then
  INVOKE_JSON=$(invoke_lambda '{"resort_id":"IS-001"}')
  echo "Invoke response:"
  echo "$INVOKE_JSON" | python -m json.tool
fi

FN_ARN=$(aws_text lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.FunctionArn')
COMPLETED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

python - <<PY >"$RESULT_FILE"
import json
print(json.dumps({
  "lab": "night-23-lab3a-elasticache-redis",
  "region": "$REGION",
  "completedAt": "$COMPLETED_AT",
  "elasticache": {
    "clusterId": "$CLUSTER_ID",
    "engine": "redis",
    "cacheNodeType": "$CACHE_NODE_TYPE",
    "subnetGroupName": "$SUBNET_GROUP",
    "endpoint": "$REDIS_HOST",
    "port": int("$REDIS_PORT"),
    "securityGroupId": "$REDIS_SG",
    "securityGroupName": "$REDIS_SG_NAME"
  },
  "lambda": {
    "functionName": "$FUNCTION_NAME",
    "functionArn": "$FN_ARN",
    "roleName": "$ROLE_NAME",
    "runtime": "$RUNTIME",
    "handler": "$HANDLER",
    "vpcSecurityGroupId": "$LAMBDA_SG",
    "subnetIds": ["$SUBNET_A", "$SUBNET_B"],
    "cacheTtlSeconds": 300
  },
  "aurora": {
    "writerEndpoint": "$WRITER",
    "database": "$DB_NAME",
    "secretArn": "$SECRET_ARN"
  },
  "testInvoke": {
    "benchRan": $( $BENCH_LATENCY && echo true || echo false ),
    "singleRan": $( $TEST_INVOKE && echo true || echo false ),
    "benchResponse": json.loads('''${BENCH_JSON:-null}''') if '''${BENCH_JSON:-null}''' != 'null' else None,
    "singleResponse": json.loads('''${INVOKE_JSON:-null}''') if '''${INVOKE_JSON:-null}''' != 'null' else None
  }
}, indent=2))
PY

echo ""
echo "Result saved: $RESULT_FILE"
echo "Teardown: bash HTML/study-lab/night-23-lab-elasticache-teardown.sh"

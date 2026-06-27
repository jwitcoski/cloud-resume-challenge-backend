#!/usr/bin/env bash
# Night 16 Lab 2D part 1 — Aurora Serverless v2 in Night 9 private subnets
# Run: bash HTML/study-lab/night-16-lab-aurora-setup.sh [--init-schema] [--verify-row]

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
CLUSTER_ID="${PREFIX}-aurora"
INSTANCE_ID="${PREFIX}-aurora-instance"
SUBNET_GROUP="${PREFIX}-aurora-subnets"
DB_NAME=gsa_stats
MASTER_USER=gsaadmin
AURORA_SG_NAME="${PREFIX}-aurora-sg"
LAMBDA_SG_NAME="${PREFIX}-lambda-stats-sg"
MIN_ACU=0.5
MAX_ACU=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPC_IDS_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"
SCHEMA_FILE="${SCRIPT_DIR}/night-16-resort-stats-schema.sql"
RESULT_FILE="${SCRIPT_DIR}/night-16-aurora-result.json"
TMP_DIR="${TMPDIR:-/tmp}/night16"
mkdir -p "$TMP_DIR"

INIT_SCHEMA=false
VERIFY_ROW=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --init-schema) INIT_SCHEMA=true; shift ;;
    --verify-row) VERIFY_ROW=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ ! -f "$VPC_IDS_FILE" ]]; then
  echo "Missing $VPC_IDS_FILE — run Night 9 VPC lab first."
  exit 1
fi

VPC_ID=$(jq -r '.vpc.id' "$VPC_IDS_FILE")
PRIVATE_A=$(jq -r '.subnets.privateA.id' "$VPC_IDS_FILE")
PRIVATE_B=$(jq -r '.subnets.privateB.id' "$VPC_IDS_FILE")

get_sg_id() {
  local name="$1"
  aws ec2 describe-security-groups --region "$REGION" \
    --filters "Name=group-name,Values=${name}" "Name=vpc-id,Values=${VPC_ID}" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true
}

wait_cluster() {
  local deadline=$((SECONDS + 1200))
  while (( SECONDS < deadline )); do
    local status
    status=$(aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" --region "$REGION" \
      --query 'DBClusters[0].Status' --output text 2>/dev/null || echo '')
    echo "  Cluster status: ${status:-pending}"
    [[ "$status" == "available" ]] && return 0
    [[ "$status" == "failed" ]] && exit 1
    sleep 30
  done
  echo "Timed out waiting for cluster"; exit 1
}

wait_instance() {
  local deadline=$((SECONDS + 1200))
  while (( SECONDS < deadline )); do
    local status
    status=$(aws rds describe-db-instances --db-instance-identifier "$INSTANCE_ID" --region "$REGION" \
      --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo '')
    echo "  Instance status: ${status:-pending}"
    [[ "$status" == "available" ]] && return 0
    [[ "$status" == "failed" ]] && exit 1
    sleep 30
  done
  echo "Timed out waiting for instance"; exit 1
}

echo "=== Night 16 Lab 2D part 1 — Aurora Serverless v2 ==="
echo "VPC: $VPC_ID"
echo "Private subnets: $PRIVATE_A, $PRIVATE_B"
echo ""

LAMBDA_SG=$(get_sg_id "$LAMBDA_SG_NAME")
if [[ -z "$LAMBDA_SG" || "$LAMBDA_SG" == "None" ]]; then
  echo "Creating security group $LAMBDA_SG_NAME ..."
  LAMBDA_SG=$(aws ec2 create-security-group --group-name "$LAMBDA_SG_NAME" \
    --description "Night 16 stats Lambda" --vpc-id "$VPC_ID" --region "$REGION" \
    --query 'GroupId' --output text)
  aws ec2 create-tags --resources "$LAMBDA_SG" --region "$REGION" \
    --tags "Key=Name,Value=${LAMBDA_SG_NAME}" "Key=lab,Value=night-16" >/dev/null
else
  echo "Security group $LAMBDA_SG_NAME already exists ($LAMBDA_SG)."
fi

AURORA_SG=$(get_sg_id "$AURORA_SG_NAME")
if [[ -z "$AURORA_SG" || "$AURORA_SG" == "None" ]]; then
  echo "Creating security group $AURORA_SG_NAME ..."
  AURORA_SG=$(aws ec2 create-security-group --group-name "$AURORA_SG_NAME" \
    --description "Night 16 Aurora PostgreSQL" --vpc-id "$VPC_ID" --region "$REGION" \
    --query 'GroupId' --output text)
  aws ec2 create-tags --resources "$AURORA_SG" --region "$REGION" \
    --tags "Key=Name,Value=${AURORA_SG_NAME}" "Key=lab,Value=night-16" >/dev/null
else
  echo "Security group $AURORA_SG_NAME already exists ($AURORA_SG)."
fi

if ! aws ec2 describe-security-groups --group-ids "$AURORA_SG" --region "$REGION" \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`5432\`]" --output text 2>/dev/null | grep -q "$LAMBDA_SG"; then
  aws ec2 authorize-security-group-ingress --group-id "$AURORA_SG" --protocol tcp --port 5432 \
    --source-group "$LAMBDA_SG" --region "$REGION" >/dev/null 2>&1 || true
  echo "Aurora SG allows TCP 5432 from lambda-stats-sg."
fi

if ! aws rds describe-db-subnet-groups --db-subnet-group-name "$SUBNET_GROUP" --region "$REGION" \
  --query 'DBSubnetGroups[0].DBSubnetGroupName' --output text 2>/dev/null | grep -q "$SUBNET_GROUP"; then
  echo "Creating DB subnet group $SUBNET_GROUP ..."
  aws rds create-db-subnet-group --db-subnet-group-name "$SUBNET_GROUP" \
    --db-subnet-group-description "Night 16 Aurora private subnets" \
    --subnet-ids "$PRIVATE_A" "$PRIVATE_B" --region "$REGION" >/dev/null
else
  echo "DB subnet group $SUBNET_GROUP already exists."
fi

ENGINE_VERSION=$(aws rds describe-db-engine-versions --engine aurora-postgresql --region "$REGION" \
  --query 'DBEngineVersions[?SupportsServerless==`true`] | sort_by(@, &EngineVersion) | [-1].EngineVersion' \
  --output text 2>/dev/null || echo '15.4')
[[ -z "$ENGINE_VERSION" || "$ENGINE_VERSION" == "None" ]] && ENGINE_VERSION=15.4
echo "Aurora PostgreSQL engine version: $ENGINE_VERSION"

if ! aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" --region "$REGION" \
  --query 'DBClusters[0].DBClusterIdentifier' --output text 2>/dev/null | grep -q "$CLUSTER_ID"; then
  echo "Creating Aurora cluster $CLUSTER_ID ..."
  aws rds create-db-cluster \
    --db-cluster-identifier "$CLUSTER_ID" \
    --engine aurora-postgresql \
    --engine-version "$ENGINE_VERSION" \
    --database-name "$DB_NAME" \
    --master-username "$MASTER_USER" \
    --manage-master-user-password \
    --vpc-security-group-ids "$AURORA_SG" \
    --db-subnet-group-name "$SUBNET_GROUP" \
    --serverless-v2-scaling-configuration "MinCapacity=${MIN_ACU},MaxCapacity=${MAX_ACU}" \
    --enable-http-endpoint \
    --backup-retention-period 1 \
    --region "$REGION" >/dev/null
  wait_cluster
else
  echo "Cluster $CLUSTER_ID already exists."
fi

if ! aws rds describe-db-instances --db-instance-identifier "$INSTANCE_ID" --region "$REGION" \
  --query 'DBInstances[0].DBInstanceIdentifier' --output text 2>/dev/null | grep -q "$INSTANCE_ID"; then
  echo "Creating Aurora instance $INSTANCE_ID ..."
  aws rds create-db-instance \
    --db-instance-identifier "$INSTANCE_ID" \
    --db-cluster-identifier "$CLUSTER_ID" \
    --engine aurora-postgresql \
    --db-instance-class db.serverless \
    --no-publicly-accessible \
    --region "$REGION" >/dev/null
  wait_instance
else
  echo "Instance $INSTANCE_ID already exists."
fi

CLUSTER_ARN=$(aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" --region "$REGION" \
  --query 'DBClusters[0].DBClusterArn' --output text)
WRITER=$(aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" --region "$REGION" \
  --query 'DBClusters[0].Endpoint' --output text)
READER=$(aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" --region "$REGION" \
  --query 'DBClusters[0].ReaderEndpoint' --output text)
SECRET_ARN=$(aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" --region "$REGION" \
  --query 'DBClusters[0].MasterUserSecret.SecretArn' --output text)

echo ""
echo "Writer endpoint: $WRITER"
echo "Secret ARN:      $SECRET_ARN"
echo ""

run_sql() {
  local sql="$1"
  local f="${TMP_DIR}/stmt.sql"
  printf '%s' "$sql" > "$f"
  aws rds-data execute-statement \
    --resource-arn "$CLUSTER_ARN" \
    --secret-arn "$SECRET_ARN" \
    --database "$DB_NAME" \
    --sql "file://${f}" \
    --region "$REGION" >/dev/null
}

if [[ "$INIT_SCHEMA" == true ]]; then
  echo "Applying schema via RDS Data API ..."
  while IFS= read -r stmt || [[ -n "$stmt" ]]; do
    stmt=$(echo "$stmt" | sed '/^\s*--/d' | tr '\n' ' ' | xargs)
    [[ -z "$stmt" ]] && continue
    echo "  SQL: ${stmt:0:60}..."
    run_sql "$stmt"
  done < <(awk 'BEGIN{RS=";"} {gsub(/\n/," "); if(length($0)>1) print $0}' "$SCHEMA_FILE")
  echo "Schema applied."
fi

if [[ "$VERIFY_ROW" == true ]]; then
  aws rds-data execute-statement \
    --resource-arn "$CLUSTER_ARN" \
    --secret-arn "$SECRET_ARN" \
    --database "$DB_NAME" \
    --sql "SELECT resort_id, resort_name, country_code, monthly_runs FROM resort_stats WHERE resort_id = 'IS-001'" \
    --region "$REGION"
fi

cat > "$RESULT_FILE" <<EOF
{
  "lab": "night-16-lab2d-aurora-part1",
  "region": "$REGION",
  "completedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "aurora": {
    "clusterId": "$CLUSTER_ID",
    "instanceId": "$INSTANCE_ID",
    "clusterArn": "$CLUSTER_ARN",
    "database": "$DB_NAME",
    "writerEndpoint": "$WRITER",
    "readerEndpoint": "$READER",
    "masterUserSecretArn": "$SECRET_ARN"
  },
  "securityGroups": {
    "aurora": { "name": "$AURORA_SG_NAME", "id": "$AURORA_SG" },
    "lambdaStats": { "name": "$LAMBDA_SG_NAME", "id": "$LAMBDA_SG" }
  }
}
EOF

echo "Result saved: $RESULT_FILE"

#!/usr/bin/env bash
# Night 16 teardown — Aurora cluster, instance, subnet group, security groups
# Run: bash HTML/study-lab/night-16-lab-aurora-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
CLUSTER_ID="${PREFIX}-aurora"
INSTANCE_ID="${PREFIX}-aurora-instance"
SUBNET_GROUP="${PREFIX}-aurora-subnets"
AURORA_SG_NAME="${PREFIX}-aurora-sg"
LAMBDA_SG_NAME="${PREFIX}-lambda-stats-sg"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPC_IDS_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"
RESULT_FILE="${SCRIPT_DIR}/night-16-aurora-result.json"

echo "=== Night 16 Aurora teardown ==="

if aws rds describe-db-instances --db-instance-identifier "$INSTANCE_ID" --region "$REGION" \
  --query 'DBInstances[0].DBInstanceIdentifier' --output text 2>/dev/null | grep -q "$INSTANCE_ID"; then
  echo "Deleting instance $INSTANCE_ID ..."
  aws rds delete-db-instance --db-instance-identifier "$INSTANCE_ID" \
    --skip-final-snapshot --region "$REGION" >/dev/null 2>&1 || true
  sleep 60
fi

if aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" --region "$REGION" \
  --query 'DBClusters[0].DBClusterIdentifier' --output text 2>/dev/null | grep -q "$CLUSTER_ID"; then
  echo "Deleting cluster $CLUSTER_ID ..."
  aws rds delete-db-cluster --db-cluster-identifier "$CLUSTER_ID" \
    --skip-final-snapshot --region "$REGION" >/dev/null 2>&1 || true
  sleep 60
fi

aws rds delete-db-subnet-group --db-subnet-group-name "$SUBNET_GROUP" --region "$REGION" 2>/dev/null || true

if [[ -f "$VPC_IDS_FILE" ]]; then
  VPC_ID=$(jq -r '.vpc.id' "$VPC_IDS_FILE")
  for SG_NAME in "$AURORA_SG_NAME" "$LAMBDA_SG_NAME"; do
    SG_ID=$(aws ec2 describe-security-groups --region "$REGION" \
      --filters "Name=group-name,Values=${SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
      --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo '')
    if [[ -n "$SG_ID" && "$SG_ID" != "None" ]]; then
      aws ec2 delete-security-group --group-id "$SG_ID" --region "$REGION" 2>/dev/null || true
      echo "Deleted security group $SG_NAME"
    fi
  done
fi

rm -f "$RESULT_FILE"
echo "Night 16 Aurora resources removed."

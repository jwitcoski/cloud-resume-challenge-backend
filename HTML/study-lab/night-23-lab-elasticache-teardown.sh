#!/usr/bin/env bash
# Night 23 teardown — ElastiCache Redis, cache-reader Lambda, redis-sg, subnet group
# Run: bash HTML/study-lab/night-23-lab-elasticache-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
CLUSTER_ID="${PREFIX}-redis"
SUBNET_GROUP="${PREFIX}-redis-subnets"
REDIS_SG_NAME="${PREFIX}-redis-sg"
FUNCTION_NAME="${PREFIX}-cache-reader"
ROLE_NAME="${PREFIX}-cache-reader-role"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-23-elasticache-result.json"
VPC_IDS_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"

echo "=== Night 23 ElastiCache lab teardown ==="

aws lambda delete-function --function-name "$FUNCTION_NAME" --region "$REGION" 2>/dev/null || true
echo "Deleted Lambda function $FUNCTION_NAME (if it existed)."
sleep 3

aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name night-23-cache-reader 2>/dev/null || true
aws iam delete-role --role-name "$ROLE_NAME" 2>/dev/null || true
echo "Deleted IAM role $ROLE_NAME (if it existed)."

aws logs delete-log-group --log-group-name "/aws/lambda/$FUNCTION_NAME" --region "$REGION" 2>/dev/null || true

aws elasticache delete-cache-cluster --cache-cluster-id "$CLUSTER_ID" --region "$REGION" 2>/dev/null || true
echo "Delete requested for ElastiCache cluster $CLUSTER_ID (if it existed)."

deadline=$((SECONDS + 600))
while [[ $SECONDS -lt $deadline ]]; do
  status=$(aws elasticache describe-cache-clusters --cache-cluster-id "$CLUSTER_ID" --region "$REGION" \
    --query 'CacheClusters[0].CacheClusterStatus' --output text 2>/dev/null || true)
  [[ -z "$status" || "$status" == "None" ]] && break
  echo "  Waiting for cluster removal: $status"
  sleep 20
done

aws elasticache delete-cache-subnet-group --cache-subnet-group-name "$SUBNET_GROUP" --region "$REGION" 2>/dev/null || true
echo "Deleted cache subnet group $SUBNET_GROUP (if it existed)."

if [[ -f "$VPC_IDS_FILE" ]]; then
  vpc_id=$(python -c "import json; print(json.load(open('$VPC_IDS_FILE'))['vpc']['id'])")
  sg_id=$(aws ec2 describe-security-groups --region "$REGION" \
    --filters "Name=group-name,Values=$REDIS_SG_NAME" "Name=vpc-id,Values=$vpc_id" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)
  if [[ -n "$sg_id" && "$sg_id" != "None" ]]; then
    aws ec2 delete-security-group --group-id "$sg_id" --region "$REGION" 2>/dev/null || true
    echo "Deleted security group $REDIS_SG_NAME ($sg_id) if unused."
  fi
fi

rm -f "$RESULT_FILE"
echo "Night 23 study resources removed. Night 9 VPC, Night 16 Aurora, Night 17 stats uploader unchanged."

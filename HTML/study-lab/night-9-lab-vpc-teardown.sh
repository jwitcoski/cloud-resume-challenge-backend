#!/usr/bin/env bash
# Night 9 Lab 2A teardown — delete VPC stack (run after Night 10 or to save NAT costs).
# Run from repo: bash HTML/study-lab/night-9-lab-vpc-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa

VPC_ID=$(aws ec2 describe-vpcs --region "$REGION" \
  --filters "Name=tag:Name,Values=${PREFIX}-vpc" \
  --query "Vpcs[0].VpcId" --output text 2>/dev/null || true)
if [[ "$VPC_ID" == "None" || -z "$VPC_ID" ]]; then
  echo "No ${PREFIX}-vpc found — nothing to tear down."
  exit 0
fi

echo "Tearing down VPC $VPC_ID ..."

# NAT first (blocks subnet delete)
NAT_IDS=$(aws ec2 describe-nat-gateways --region "$REGION" \
  --filter "Name=vpc-id,Values=$VPC_ID" \
  --query "NatGateways[?State!='deleted'].NatGatewayId" --output text 2>/dev/null || true)
for nat in $NAT_IDS; do
  [[ -z "$nat" || "$nat" == "None" ]] && continue
  echo "Deleting NAT $nat ..."
  aws ec2 delete-nat-gateway --nat-gateway-id "$nat" --region "$REGION"
  aws ec2 wait nat-gateway-deleted --nat-gateway-ids "$nat" --region "$REGION" 2>/dev/null || sleep 60
done

# Detach + delete IGW
IGW_ID=$(aws ec2 describe-internet-gateways --region "$REGION" \
  --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
  --query "InternetGateways[0].InternetGatewayId" --output text 2>/dev/null || true)
if [[ -n "$IGW_ID" && "$IGW_ID" != "None" ]]; then
  aws ec2 detach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$REGION" 2>/dev/null || true
  aws ec2 delete-internet-gateway --internet-gateway-id "$IGW_ID" --region "$REGION" 2>/dev/null || true
fi

# Delete non-default route tables, subnets, SGs, release EIP
for rt in $(aws ec2 describe-route-tables --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "RouteTables[?Associations[0].Main!=\`true\`].RouteTableId" --output text); do
  aws ec2 delete-route-table --route-table-id "$rt" --region "$REGION" 2>/dev/null || true
done

for sub in $(aws ec2 describe-subnets --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[].SubnetId" --output text); do
  aws ec2 delete-subnet --subnet-id "$sub" --region "$REGION" 2>/dev/null || true
done

for sg in $(aws ec2 describe-security-groups --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "SecurityGroups[?GroupName!='default'].GroupId" --output text); do
  aws ec2 delete-security-group --group-id "$sg" --region "$REGION" 2>/dev/null || true
done

EIP_ALLOC=$(aws ec2 describe-addresses --region "$REGION" \
  --filters "Name=tag:Name,Values=${PREFIX}-nat-eip" \
  --query "Addresses[0].AllocationId" --output text 2>/dev/null || true)
if [[ -n "$EIP_ALLOC" && "$EIP_ALLOC" != "None" ]]; then
  aws ec2 release-address --allocation-id "$EIP_ALLOC" --region "$REGION" 2>/dev/null || true
fi

aws ec2 delete-vpc --vpc-id "$VPC_ID" --region "$REGION"
echo "VPC $VPC_ID deleted."

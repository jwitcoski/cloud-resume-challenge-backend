#!/usr/bin/env bash
# Night 9 Lab 2A — VPC build (part 1)
# Run from repo: bash HTML/study-lab/night-9-lab-vpc-build.sh
#
# Architecture: week2-vpc-plan.md (2-AZ, us-east-1)
#   VPC 10.0.0.0/16
#   Public:  10.0.1.0/24 (us-east-1a), 10.0.2.0/24 (us-east-1b)
#   Private: 10.0.11.0/24 (us-east-1a), 10.0.12.0/24 (us-east-1b)
#   IGW + single NAT Gateway in public-a
#
# Output: night-9-vpc-ids.json (copy IDs to globalskiatlas backend AWS_ECS_DEPLOYMENT.md)

set -euo pipefail
REGION=us-east-1
AZ_A=us-east-1a
AZ_B=us-east-1b
PREFIX=saa-study-gsa
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IDS_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"

tag() { echo "Key=Name,Value=$1 Key=Project,Value=saa-study Key=Lab,Value=night-9-lab2a"; }

echo "=== Night 9 Lab 2A — VPC build ==="

# Idempotent: reuse VPC if already tagged
VPC_ID=$(aws ec2 describe-vpcs --region "$REGION" \
  --filters "Name=tag:Name,Values=${PREFIX}-vpc" \
  --query "Vpcs[0].VpcId" --output text 2>/dev/null || true)
if [[ "$VPC_ID" == "None" || -z "$VPC_ID" ]]; then
  VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region "$REGION" \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PREFIX}-vpc},{Key=Project,Value=saa-study},{Key=Lab,Value=night-9-lab2a}]" \
    --query Vpc.VpcId --output text)
  echo "Created VPC $VPC_ID"
else
  echo "Reusing VPC $VPC_ID"
fi

aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames --region "$REGION"
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support --region "$REGION"

# Internet Gateway
IGW_ID=$(aws ec2 describe-internet-gateways --region "$REGION" \
  --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
  --query "InternetGateways[0].InternetGatewayId" --output text 2>/dev/null || true)
if [[ "$IGW_ID" == "None" || -z "$IGW_ID" ]]; then
  IGW_ID=$(aws ec2 create-internet-gateway --region "$REGION" \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PREFIX}-igw},{Key=Project,Value=saa-study},{Key=Lab,Value=night-9-lab2a}]" \
    --query InternetGateway.InternetGatewayId --output text)
  aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$REGION"
  echo "Created and attached IGW $IGW_ID"
else
  echo "Reusing IGW $IGW_ID"
fi

create_subnet() {
  local name=$1 cidr=$2 az=$3 public=$4
  local sid
  sid=$(aws ec2 describe-subnets --region "$REGION" \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=$name" \
    --query "Subnets[0].SubnetId" --output text 2>/dev/null || true)
  if [[ "$sid" == "None" || -z "$sid" ]]; then
    sid=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$cidr" --availability-zone "$az" --region "$REGION" \
      --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$name},{Key=Project,Value=saa-study},{Key=Lab,Value=night-9-lab2a}]" \
      --query Subnet.SubnetId --output text)
    echo "Created subnet $name ($sid)"
  else
    echo "Reusing subnet $name ($sid)"
  fi
  if [[ "$public" == "true" ]]; then
    aws ec2 modify-subnet-attribute --subnet-id "$sid" --map-public-ip-on-launch --region "$REGION"
  fi
  echo "$sid"
}

PUB_A=$(create_subnet "${PREFIX}-public-a" "10.0.1.0/24" "$AZ_A" true)
PUB_B=$(create_subnet "${PREFIX}-public-b" "10.0.2.0/24" "$AZ_B" true)
PRIV_A=$(create_subnet "${PREFIX}-private-a" "10.0.11.0/24" "$AZ_A" false)
PRIV_B=$(create_subnet "${PREFIX}-private-b" "10.0.12.0/24" "$AZ_B" false)

create_rt() {
  local name=$1
  local rtid
  rtid=$(aws ec2 describe-route-tables --region "$REGION" \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=$name" \
    --query "RouteTables[0].RouteTableId" --output text 2>/dev/null || true)
  if [[ "$rtid" == "None" || -z "$rtid" ]]; then
    rtid=$(aws ec2 create-route-table --vpc-id "$VPC_ID" --region "$REGION" \
      --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$name},{Key=Project,Value=saa-study},{Key=Lab,Value=night-9-lab2a}]" \
      --query RouteTable.RouteTableId --output text)
    echo "Created route table $name ($rtid)"
  else
    echo "Reusing route table $name ($rtid)"
  fi
  echo "$rtid"
}

RT_PUBLIC=$(create_rt "${PREFIX}-rt-public")
RT_PRIVATE=$(create_rt "${PREFIX}-rt-private")

# Public route → IGW (idempotent replace)
aws ec2 create-route --route-table-id "$RT_PUBLIC" --destination-cidr-block 0.0.0.0/0 \
  --gateway-id "$IGW_ID" --region "$REGION" 2>/dev/null \
  || aws ec2 replace-route --route-table-id "$RT_PUBLIC" --destination-cidr-block 0.0.0.0/0 \
  --gateway-id "$IGW_ID" --region "$REGION"

associate_rt() {
  local subnet=$1 rt=$2
  local assoc
  assoc=$(aws ec2 describe-route-tables --region "$REGION" \
    --filters "Name=association.subnet-id,Values=$subnet" \
    --query "RouteTables[0].Associations[?SubnetId=='$subnet'].RouteTableAssociationId" --output text 2>/dev/null || true)
  if [[ -z "$assoc" || "$assoc" == "None" ]]; then
    aws ec2 associate-route-table --subnet-id "$subnet" --route-table-id "$rt" --region "$REGION" >/dev/null
  fi
}

associate_rt "$PUB_A" "$RT_PUBLIC"
associate_rt "$PUB_B" "$RT_PUBLIC"
associate_rt "$PRIV_A" "$RT_PRIVATE"
associate_rt "$PRIV_B" "$RT_PRIVATE"

# NAT Gateway (needs EIP in public-a)
EIP_ALLOC=$(aws ec2 describe-addresses --region "$REGION" \
  --filters "Name=tag:Name,Values=${PREFIX}-nat-eip" \
  --query "Addresses[0].AllocationId" --output text 2>/dev/null || true)
if [[ "$EIP_ALLOC" == "None" || -z "$EIP_ALLOC" ]]; then
  EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --region "$REGION" \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${PREFIX}-nat-eip},{Key=Project,Value=saa-study},{Key=Lab,Value=night-9-lab2a}]" \
    --query AllocationId --output text)
  echo "Allocated EIP $EIP_ALLOC"
else
  echo "Reusing EIP $EIP_ALLOC"
fi

NAT_ID=$(aws ec2 describe-nat-gateways --region "$REGION" \
  --filter "Name=vpc-id,Values=$VPC_ID" "Name=state,Values=available,pending" \
  --query "NatGateways[?Tags[?Key=='Name' && Value=='${PREFIX}-nat-a']].NatGatewayId | [0]" --output text 2>/dev/null || true)
if [[ "$NAT_ID" == "None" || -z "$NAT_ID" ]]; then
  NAT_ID=$(aws ec2 create-nat-gateway --subnet-id "$PUB_A" --allocation-id "$EIP_ALLOC" --region "$REGION" \
    --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=${PREFIX}-nat-a},{Key=Project,Value=saa-study},{Key=Lab,Value=night-9-lab2a}]" \
    --query NatGateway.NatGatewayId --output text)
  echo "Creating NAT Gateway $NAT_ID (waiting for available...)"
  aws ec2 wait nat-gateway-available --nat-gateway-ids "$NAT_ID" --region "$REGION"
else
  echo "Reusing NAT Gateway $NAT_ID"
fi

aws ec2 create-route --route-table-id "$RT_PRIVATE" --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id "$NAT_ID" --region "$REGION" 2>/dev/null \
  || aws ec2 replace-route --route-table-id "$RT_PRIVATE" --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id "$NAT_ID" --region "$REGION"

# Fargate security group (prep for Night 10)
SG_ID=$(aws ec2 describe-security-groups --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=${PREFIX}-fargate-sg" \
  --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || true)
if [[ "$SG_ID" == "None" || -z "$SG_ID" ]]; then
  SG_ID=$(aws ec2 create-security-group --group-name "${PREFIX}-fargate-sg" \
    --description "SAA study — Fargate pipeline tasks (outbound only)" \
    --vpc-id "$VPC_ID" --region "$REGION" \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PREFIX}-fargate-sg},{Key=Project,Value=saa-study},{Key=Lab,Value=night-9-lab2a}]" \
    --query GroupId --output text)
  aws ec2 authorize-security-group-egress --group-id "$SG_ID" --ip-permissions \
    IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{CidrIp=0.0.0.0/0,Description=HTTPS}]' \
    --region "$REGION" 2>/dev/null || true
  echo "Created Fargate SG $SG_ID (egress 443 only, no inbound)"
else
  echo "Reusing Fargate SG $SG_ID"
fi

BUILT_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > "$IDS_FILE" <<EOF
{
  "lab": "night-9-lab2a-vpc-build",
  "region": "$REGION",
  "builtAt": "$BUILT_AT",
  "vpc": {
    "id": "$VPC_ID",
    "cidr": "10.0.0.0/16"
  },
  "internetGateway": "$IGW_ID",
  "subnets": {
    "publicA": { "id": "$PUB_A", "cidr": "10.0.1.0/24", "az": "$AZ_A" },
    "publicB": { "id": "$PUB_B", "cidr": "10.0.2.0/24", "az": "$AZ_B" },
    "privateA": { "id": "$PRIV_A", "cidr": "10.0.11.0/24", "az": "$AZ_A" },
    "privateB": { "id": "$PRIV_B", "cidr": "10.0.12.0/24", "az": "$AZ_B" }
  },
  "routeTables": {
    "public": "$RT_PUBLIC",
    "private": "$RT_PRIVATE"
  },
  "natGateway": {
    "id": "$NAT_ID",
    "subnet": "$PUB_A",
    "eipAllocation": "$EIP_ALLOC"
  },
  "securityGroups": {
    "fargate": "$SG_ID"
  },
  "night10": {
    "ecsSubnets": ["$PRIV_A", "$PRIV_B"],
    "assignPublicIp": "DISABLED",
    "note": "Run Iceland task with these private subnets + fargate SG"
  },
  "teardown": "bash HTML/study-lab/night-9-lab-vpc-teardown.sh"
}
EOF

echo ""
echo "=== Build complete ==="
cat "$IDS_FILE"
echo ""
echo "IDs written to $IDS_FILE"
echo "Next: Night 10 — run Iceland ECS task in private subnets using night10 block above."

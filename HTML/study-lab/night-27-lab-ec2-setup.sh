#!/usr/bin/env bash
# Night 27 Lab — EBS gp3 demo, Iceland cost table, optional Spot demo
# Run: bash HTML/study-lab/night-27-lab-ec2-setup.sh [--check-spot-prices] [--create-spot-demo]
set -euo pipefail

REGION=us-east-1
AZ="${REGION}a"
VOLUME_NAME=saa-study-night27-gp3-demo
SPOT_NAME=saa-study-night27-spot-demo
TASK_FAMILY=globalskiatlas-backend-k8s-iceland
TAG_LAB=night-27
FARGATE_VCPU_HR=0.04048
FARGATE_GB_HR=0.004445
RUN_HOURS=2

CHECK_SPOT=false
CREATE_SPOT=false
for arg in "$@"; do
  case "$arg" in
    --check-spot-prices) CHECK_SPOT=true ;;
    --create-spot-demo) CREATE_SPOT=true ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-27-ec2-result.json"
IDS_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"

aws_text() {
  aws "$@" --output text 2>/dev/null | head -1 || true
}

get_iceland_sizing() {
  CPU=2048
  MEMORY=4096
  if TD_JSON="$(aws ecs describe-task-definition --task-definition "$TASK_FAMILY" --region "$REGION" --output json 2>/dev/null)"; then
    CPU="$(echo "$TD_JSON" | jq -r '.taskDefinition.cpu // "2048"')"
    MEMORY="$(echo "$TD_JSON" | jq -r '.taskDefinition.memory // "4096"')"
  fi
  VCPU="$(awk "BEGIN {printf \"%.2f\", $CPU/1024}")"
  GB="$(awk "BEGIN {printf \"%.2f\", $MEMORY/1024}")"
}

print_cost_table() {
  get_iceland_sizing
  FARGATE_HR="$(awk "BEGIN {printf \"%.4f\", $VCPU*$FARGATE_VCPU_HR + $GB*$FARGATE_GB_HR}")"
  FARGATE_RUN="$(awk "BEGIN {printf \"%.3f\", $FARGATE_HR*$RUN_HOURS}")"
  FARGATE_SPOT="$(awk "BEGIN {printf \"%.3f\", $FARGATE_RUN*0.35}")"
  EC2_OD="$(awk "BEGIN {printf \"%.3f\", 0.096*$RUN_HOURS}")"
  EC2_SPOT="$(awk "BEGIN {printf \"%.3f\", $EC2_OD*0.25}")"

  echo ""
  echo "=== Iceland pipeline cost estimate (one run) ==="
  echo "Task sizing: ${CPU} CPU units (${VCPU} vCPU), ${MEMORY} MiB (${GB} GiB)"
  echo "Assumed wall clock: ${RUN_HOURS} hr"
  echo ""
  printf '| %-19s | %-13s |\n' 'Option' '~Cost per run'
  printf '|%-21s|%-15s|\n' '---------------------' '---------------'
  printf '| %-19s | $%-12s |\n' 'Fargate On-Demand' "$FARGATE_RUN"
  printf '| %-19s | $%-12s |\n' 'Fargate Spot (~65%)' "$FARGATE_SPOT"
  printf '| %-19s | $%-12s |\n' 'EC2 m6i.large OD' "$EC2_OD"
  printf '| %-19s | $%-12s |\n' 'EC2 Spot (~75% off)' "$EC2_SPOT"
  echo ""
}

get_or_create_gp3_volume() {
  EXISTING="$(aws_text ec2 describe-volumes --region "$REGION" \
    --filters "Name=tag:Name,Values=${VOLUME_NAME}" \
    --query 'Volumes[0].VolumeId')"
  if [[ -n "$EXISTING" && "$EXISTING" != "None" ]]; then
    echo "Reusing volume ${EXISTING} (${VOLUME_NAME})" >&2
    echo "$EXISTING"
    return
  fi

  echo "Creating gp3 volume ${VOLUME_NAME} in ${AZ} ..." >&2
  VOL_ID="$(aws ec2 create-volume --region "$REGION" \
    --availability-zone "$AZ" \
    --size 8 \
    --volume-type gp3 \
    --iops 3000 \
    --throughput 125 \
    --encrypted \
    --tag-specifications "ResourceType=volume,Tags=[{Key=Name,Value=${VOLUME_NAME}},{Key=Lab,Value=${TAG_LAB}}]" \
    --query VolumeId --output text)"

  aws ec2 wait volume-available --region "$REGION" --volume-ids "$VOL_ID"
  aws ec2 modify-volume --region "$REGION" --volume-id "$VOL_ID" --iops 4000 --throughput 250 >/dev/null
  sleep 5
  echo "$VOL_ID"
}

show_spot_prices() {
  echo ""
  echo "=== Recent Spot prices (us-east-1, Linux) ==="
  for ITYPE in m6i.large m7i.large c6i.large; do
  case "$ITYPE" in
    m6i.large) OD=0.096 ;;
    m7i.large) OD=0.1008 ;;
    *) OD=0.085 ;;
  esac
    PRICE="$(aws_text ec2 describe-spot-price-history --region "$REGION" \
      --instance-types "$ITYPE" \
      --product-descriptions 'Linux/UNIX' \
      --max-items 1 \
      --query 'SpotPriceHistory[0].SpotPrice')"
    if [[ -n "$PRICE" ]]; then
      PCT="$(awk "BEGIN {printf \"%.0f\", (1-$PRICE/$OD)*100}")"
      echo "${ITYPE}: Spot \$${PRICE}/hr (~${PCT}% off On-Demand \$${OD})"
    else
      echo "${ITYPE}: Spot n/a"
    fi
  done
}

create_spot_demo() {
  if [[ ! -f "$IDS_FILE" ]]; then
    echo "Skipping Spot demo — missing ${IDS_FILE}" >&2
    return 0
  fi
  SUBNET="$(jq -r '.subnets.publicA.id // .subnets.privateA.id' "$IDS_FILE")"
  AMI="$(aws_text ec2 describe-images --region "$REGION" --owners amazon \
    --filters 'Name=name,Values=al2023-ami-2023*' 'Name=architecture,Values=x86_64' \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId')"
  USER_DATA_B64="$(printf '%s' '#!/bin/bash
echo Night 27 Spot demo
sleep 180
shutdown -h now' | base64 -w0 2>/dev/null || base64)"

  echo "Requesting Spot t3.micro (${SPOT_NAME}) ..." >&2
  REQ_JSON="$(aws ec2 request-spot-instances --region "$REGION" --output json \
    --spot-price 0.02 \
    --instance-count 1 \
    --type one-time \
    --launch-specification "ImageId=${AMI},InstanceType=t3.micro,SubnetId=${SUBNET},UserData=${USER_DATA_B64}" \
    --tag-specifications "ResourceType=spot-instances-request,Tags=[{Key=Name,Value=${SPOT_NAME}},{Key=Lab,Value=${TAG_LAB}}]")"
  echo "$REQ_JSON" | jq -r '.SpotInstanceRequests[0].SpotInstanceRequestId'
}

echo "=== Night 27 EC2 + EBS + Spot lab ==="
print_cost_table

VOLUME_ID="$(get_or_create_gp3_volume)"
VOL_JSON="$(aws ec2 describe-volumes --region "$REGION" --volume-ids "$VOLUME_ID" --output json)"
echo ""
echo "Volume ${VOLUME_ID}: type=$(echo "$VOL_JSON" | jq -r '.Volumes[0].VolumeType') size=$(echo "$VOL_JSON" | jq -r '.Volumes[0].Size')GiB"

SPOT_REQ_ID=""
if [[ "$CHECK_SPOT" == "true" ]]; then show_spot_prices; fi
if [[ "$CREATE_SPOT" == "true" ]]; then SPOT_REQ_ID="$(create_spot_demo)"; fi

get_iceland_sizing
jq -n \
  --arg region "$REGION" \
  --arg lab "$TAG_LAB" \
  --arg volumeId "$VOLUME_ID" \
  --arg volumeName "$VOLUME_NAME" \
  --arg taskFamily "$TASK_FAMILY" \
  --argjson taskCpu "$CPU" \
  --argjson taskMemoryMiB "$MEMORY" \
  --argjson assumedRunHours "$RUN_HOURS" \
  --arg spotRequestId "${SPOT_REQ_ID:-}" \
  '{
    region: $region,
    lab: $lab,
    volumeId: $volumeId,
    volumeName: $volumeName,
    taskFamily: $taskFamily,
    taskCpu: $taskCpu,
    taskMemoryMiB: $taskMemoryMiB,
    assumedRunHours: $assumedRunHours,
    spotRequestId: (if $spotRequestId == "" then null else $spotRequestId end),
    createdAt: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }' >"$RESULT_FILE"

echo ""
echo "Wrote ${RESULT_FILE}"
echo "Teardown: bash HTML/study-lab/night-27-lab-ec2-teardown.sh"

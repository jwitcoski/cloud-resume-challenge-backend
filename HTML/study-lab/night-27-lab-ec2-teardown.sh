#!/usr/bin/env bash
# Night 27 teardown — gp3 study volume + Spot demo
# Run: bash HTML/study-lab/night-27-lab-ec2-teardown.sh
set -euo pipefail

REGION=us-east-1
VOLUME_NAME=saa-study-night27-gp3-demo
SPOT_NAME=saa-study-night27-spot-demo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-27-ec2-result.json"

aws_text() {
  aws "$@" --output text 2>/dev/null | head -1 || true
}

VOLUME_ID=""
SPOT_REQ_ID=""
if [[ -f "$RESULT_FILE" ]]; then
  VOLUME_ID="$(jq -r '.volumeId // empty' "$RESULT_FILE")"
  SPOT_REQ_ID="$(jq -r '.spotRequestId // empty' "$RESULT_FILE")"
fi

echo "=== Night 27 EC2 lab teardown ==="

INST_IDS="$(aws_text ec2 describe-instances --region "$REGION" \
  --filters "Name=tag:Name,Values=${SPOT_NAME}" "Name=instance-state-name,Values=pending,running,stopping" \
  --query 'Reservations[].Instances[].InstanceId')"
if [[ -n "$INST_IDS" && "$INST_IDS" != "None" ]]; then
  echo "Terminating Spot demo instances: ${INST_IDS}"
  aws ec2 terminate-instances --region "$REGION" --instance-ids $INST_IDS >/dev/null || true
fi

if [[ -z "$SPOT_REQ_ID" ]]; then
  SPOT_REQ_ID="$(aws_text ec2 describe-spot-instance-requests --region "$REGION" \
    --filters "Name=tag:Name,Values=${SPOT_NAME}" "Name=state,Values=open,active" \
    --query 'SpotInstanceRequests[0].SpotInstanceRequestId')"
fi
if [[ -n "$SPOT_REQ_ID" && "$SPOT_REQ_ID" != "None" ]]; then
  echo "Cancelling Spot request ${SPOT_REQ_ID} ..."
  aws ec2 cancel-spot-instance-requests --region "$REGION" --spot-instance-request-ids "$SPOT_REQ_ID" >/dev/null || true
fi

if [[ -z "$VOLUME_ID" ]]; then
  VOLUME_ID="$(aws_text ec2 describe-volumes --region "$REGION" \
    --filters "Name=tag:Name,Values=${VOLUME_NAME}" \
    --query 'Volumes[0].VolumeId')"
fi
if [[ -n "$VOLUME_ID" && "$VOLUME_ID" != "None" ]]; then
  STATE="$(aws_text ec2 describe-volumes --region "$REGION" --volume-ids "$VOLUME_ID" --query 'Volumes[0].State')"
  if [[ "$STATE" == "in-use" ]]; then
    echo "Detaching ${VOLUME_ID} ..."
    aws ec2 detach-volume --region "$REGION" --volume-id "$VOLUME_ID" --force >/dev/null || true
    aws ec2 wait volume-available --region "$REGION" --volume-ids "$VOLUME_ID" || true
  fi
  echo "Deleting volume ${VOLUME_ID} ..."
  aws ec2 delete-volume --region "$REGION" --volume-id "$VOLUME_ID" >/dev/null || true
fi

rm -f "$RESULT_FILE"
echo "Done. Iceland ECS task definitions and Night 9 VPC unchanged."

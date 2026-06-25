#!/usr/bin/env bash
# Night 13 Lab 2C teardown — SQS queues + EventBridge completion rule
# Run: bash HTML/study-lab/night-13-lab-sqs-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
MAIN_QUEUE="${PREFIX}-iceland-completion"
DLQ_QUEUE="${PREFIX}-iceland-completion-dlq"
RULE_NAME="${PREFIX}-iceland-success-to-sqs"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-13-sqs-result.json"

echo "=== Night 13 teardown ==="

TARGETS=$(aws events list-targets-by-rule --rule "$RULE_NAME" --region "$REGION" \
  --query 'Targets[*].Id' --output text 2>/dev/null || true)
if [[ -n "$TARGETS" && "$TARGETS" != "None" ]]; then
  IDS=()
  for id in $TARGETS; do IDS+=("$id"); done
  aws events remove-targets --rule "$RULE_NAME" --ids "${IDS[@]}" --region "$REGION" 2>/dev/null || true
fi

aws events delete-rule --name "$RULE_NAME" --region "$REGION" 2>/dev/null \
  && echo "Deleted rule $RULE_NAME" \
  || echo "Rule $RULE_NAME not found (skipped)"

purge_and_delete() {
  local name="$1"
  local url
  url=$(aws sqs get-queue-url --queue-name "$name" --region "$REGION" \
    --query 'QueueUrl' --output text 2>/dev/null || true)
  if [[ -z "$url" ]]; then
    echo "Queue $name not found (skipped)"
    return
  fi
  aws sqs purge-queue --queue-url "$url" --region "$REGION" 2>/dev/null || true
  sleep 2
  aws sqs delete-queue --queue-url "$url" --region "$REGION" 2>/dev/null \
    && echo "Deleted queue $name" \
    || echo "Could not delete $name (may still be purging — retry in 60s)"
}

purge_and_delete "$MAIN_QUEUE"
purge_and_delete "$DLQ_QUEUE"

[[ -f "$RESULT_FILE" ]] && rm -f "$RESULT_FILE"

echo "Night 13 SQS resources removed. Night 12 schedule and Night 9 VPC unchanged."

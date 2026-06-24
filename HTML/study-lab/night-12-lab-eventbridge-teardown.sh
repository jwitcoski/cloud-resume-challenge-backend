#!/usr/bin/env bash
# Night 12 Lab 2B teardown — EventBridge rule, IAM role, failure alarm.
# Run from repo: bash HTML/study-lab/night-12-lab-eventbridge-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
RULE_NAME="${PREFIX}-iceland-monthly"
ROLE_NAME="${PREFIX}-eventbridge-ecs"
ALARM_NAME="${PREFIX}-iceland-task-failed"

echo "=== Night 12 teardown ==="

# Remove targets before deleting rule
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

aws cloudwatch delete-alarms --alarm-names "$ALARM_NAME" --region "$REGION" 2>/dev/null \
  && echo "Deleted alarm $ALARM_NAME" \
  || echo "Alarm $ALARM_NAME not found (skipped)"

POLICY_ARN="arn:aws:iam::298043721974:policy/${ROLE_NAME}"
aws iam detach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN" 2>/dev/null || true
aws iam delete-role --role-name "$ROLE_NAME" 2>/dev/null \
  && echo "Deleted role $ROLE_NAME" \
  || echo "Role $ROLE_NAME not found (skipped)"
aws iam delete-policy --policy-arn "$POLICY_ARN" 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-12-eventbridge-result.json"
[[ -f "$RESULT_FILE" ]] && rm -f "$RESULT_FILE"

echo "Night 12 EventBridge resources removed. VPC from Night 9 is unchanged."

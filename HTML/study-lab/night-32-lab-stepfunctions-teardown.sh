#!/usr/bin/env bash
# Night 32 teardown — delete SAM stack, re-enable legacy schedule, remove result file
# Run: bash HTML/study-lab/night-32-lab-stepfunctions-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
STACK_NAME=sam-pipeline-orchestrator
LEGACY_RULE="${PREFIX}-iceland-monthly"
SUCCESS_RULE="${PREFIX}-iceland-success-to-sqs"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-32-stepfunctions-result.json"

aws_text() {
  local out
  out=$(aws "$@" --output text 2>/dev/null) || return 1
  [[ -z "$out" || "$out" == "None" ]] && return 1
  echo "$out"
}

echo "=== Night 32 Step Functions lab teardown ==="

LEGACY_DISABLED=false
SUCCESS_DISABLED=false
if [[ -f "$RESULT_FILE" ]]; then
  read -r LEGACY_DISABLED SUCCESS_DISABLED < <(
    python - "$RESULT_FILE" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
print("true" if d.get("legacyRuleDisabled") else "false", "true" if d.get("successRuleDisabled") else "false")
PY
  )
fi

if aws_text cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' >/dev/null; then
  echo "Deleting stack $STACK_NAME ..."
  if command -v sam >/dev/null; then
    sam delete --stack-name "$STACK_NAME" --region "$REGION" --no-prompts || true
  fi
  if aws_text cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' >/dev/null; then
    aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"
    aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION" || true
  fi
else
  echo "Stack $STACK_NAME not found"
fi

if [[ "$LEGACY_DISABLED" == true ]]; then
  if aws_text events describe-rule --name "$LEGACY_RULE" --region "$REGION" --query Name >/dev/null; then
    aws events enable-rule --name "$LEGACY_RULE" --region "$REGION" >/dev/null
    echo "Re-enabled legacy rule $LEGACY_RULE"
  fi
fi

if [[ "$SUCCESS_DISABLED" == true ]]; then
  if aws_text events describe-rule --name "$SUCCESS_RULE" --region "$REGION" --query Name >/dev/null; then
    aws events enable-rule --name "$SUCCESS_RULE" --region "$REGION" >/dev/null
    echo "Re-enabled success rule $SUCCESS_RULE"
  fi
fi

if [[ -f "$RESULT_FILE" ]]; then
  rm -f "$RESULT_FILE"
  echo "Removed $RESULT_FILE"
fi

echo "Teardown complete. Nights 12–17 SQS/SNS/Lambda resources were NOT deleted."

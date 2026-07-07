#!/usr/bin/env bash
# Night 30 teardown — remove study lifecycle rule, demo objects, budget
# Run: bash HTML/study-lab/night-30-lab-s3-lifecycle-teardown.sh

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
BUCKET=globalskiatlas-backend-k8s-output
RULE_ID=saa-study-night30-iceland-archive
BUDGET_NAME=saa-study-night30-monthly
DEMO_PREFIX=saa-study-night30/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-30-s3-lifecycle-result.json"
MERGED_FILE="${SCRIPT_DIR}/night-30-lifecycle-merged.json"
LC_TMP=$(mktemp)

aws_text() {
  local out
  out=$(aws "$@" --output text 2>/dev/null) || return 1
  [[ -z "$out" || "$out" == "None" ]] && return 1
  echo "$out"
}

echo '=== Night 30 S3 lifecycle lab teardown ==='

IDENTITY=$(aws_text sts get-caller-identity --query Account) && ACCOUNT_ID="$IDENTITY"

if aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET" --region "$REGION" --output json >"$LC_TMP" 2>/dev/null; then
  KEEP=$(python - "$RULE_ID" "$MERGED_FILE" "$LC_TMP" <<'PY'
import json, sys
rule_id, merged_file, src = sys.argv[1:4]
cfg = json.load(open(src, encoding="utf-8"))
remaining = [r for r in cfg.get("Rules", []) if r.get("ID") != rule_id]
json.dump({"Rules": remaining}, open(merged_file, "w"), indent=2)
print(len(remaining))
PY
)
  if [[ "$KEEP" -eq 0 ]]; then
    echo 'Removing entire lifecycle configuration (only study rule existed) ...'
    aws s3api delete-bucket-lifecycle --bucket "$BUCKET" --region "$REGION" 2>/dev/null || true
  else
    echo "Removing rule $RULE_ID (keeping $KEEP other rule(s)) ..."
    aws s3api put-bucket-lifecycle-configuration \
      --bucket "$BUCKET" \
      --region "$REGION" \
      --lifecycle-configuration "file://${MERGED_FILE//\\/\/}"
  fi
else
  echo 'No lifecycle configuration on bucket — nothing to remove.'
fi
rm -f "$LC_TMP"

echo "Deleting demo prefix s3://${BUCKET}/${DEMO_PREFIX} ..."
aws s3 rm "s3://${BUCKET}/${DEMO_PREFIX}" --recursive --region "$REGION" 2>/dev/null || true

echo "Deleting budget $BUDGET_NAME ..."
aws budgets delete-budget --account-id "$ACCOUNT_ID" --budget-name "$BUDGET_NAME" 2>/dev/null || true

rm -f "$RESULT_FILE" "$MERGED_FILE"
echo 'Teardown complete. Iceland pipeline output under iceland/ was NOT deleted.'

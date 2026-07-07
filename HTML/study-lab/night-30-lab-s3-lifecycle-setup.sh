#!/usr/bin/env bash
# Night 30 Lab — S3 lifecycle on Iceland prefixes + Cost Explorer + optional Budget
# Run: bash HTML/study-lab/night-30-lab-s3-lifecycle-setup.sh [--upload-demo] [--create-budget --budget-email you@example.com]

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
BUCKET=globalskiatlas-backend-k8s-output
RULE_ID=saa-study-night30-iceland-archive
BUDGET_NAME=saa-study-night30-monthly
DEMO_PREFIX=saa-study-night30/demo/
TAG_LAB=night-30
BUDGET_LIMIT_USD=25

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULE_FILE="${SCRIPT_DIR}/night-30-lifecycle-rule.json"
RESULT_FILE="${SCRIPT_DIR}/night-30-s3-lifecycle-result.json"
MERGED_FILE="${SCRIPT_DIR}/night-30-lifecycle-merged.json"

UPLOAD_DEMO=false
CREATE_BUDGET=false
BUDGET_EMAIL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --upload-demo) UPLOAD_DEMO=true; shift ;;
    --create-budget) CREATE_BUDGET=true; shift ;;
    --budget-email) BUDGET_EMAIL="${2:-}"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

aws_text() {
  local out
  out=$(aws "$@" --output text 2>/dev/null) || return 1
  [[ -z "$out" || "$out" == "None" ]] && return 1
  echo "$out"
}

date_range_last_30() {
  python - <<'PY'
from datetime import date, timedelta
end = date.today()
start = end - timedelta(days=30)
print(start.isoformat(), end.isoformat())
PY
}

merge_lifecycle() {
  python - "$BUCKET" "$REGION" "$RULE_ID" "$RULE_FILE" "$MERGED_FILE" <<'PY'
import json, subprocess, sys
bucket, region, rule_id, rule_file, out_file = sys.argv[1:6]
new_rule = json.load(open(rule_file, encoding="utf-8"))
rules = []
try:
    raw = subprocess.check_output(
        ["aws", "s3api", "get-bucket-lifecycle-configuration", "--bucket", bucket, "--region", region, "--output", "json"],
        stderr=subprocess.DEVNULL,
    )
    cfg = json.loads(raw)
    rules = [r for r in cfg.get("Rules", []) if r.get("ID") != rule_id]
except subprocess.CalledProcessError:
    pass
rules.append(new_rule)
json.dump({"Rules": rules}, open(out_file, "w", encoding="utf-8"), indent=2)
PY
}

top_services_json() {
  read -r START END < <(date_range_last_30)
  local raw
  raw=$(aws ce get-cost-and-usage \
    --time-period "Start=${START},End=${END}" \
    --granularity MONTHLY \
    --metrics UnblendedCost \
    --group-by Type=DIMENSION,Key=SERVICE \
    --region us-east-1 \
    --output json 2>/dev/null) || { echo '[]'; return; }
  python -c "
import json, sys
data = json.loads(sys.stdin.read())
rows = []
for bucket in data.get('ResultsByTime', []):
    for g in bucket.get('Groups', []):
        amt = float(g['Metrics']['UnblendedCost']['Amount'])
        if amt > 0:
            rows.append({'service': g['Keys'][0], 'amountUsd': round(amt, 2)})
rows.sort(key=lambda r: r['amountUsd'], reverse=True)
print(json.dumps(rows[:8]))
" <<<"$raw"
}

echo '=== Night 30 Lab — S3 lifecycle + cost ==='
echo "Bucket: $BUCKET"
echo "Rule:   $RULE_ID"
echo ''

IDENTITY=$(aws_text sts get-caller-identity --query Account) && ACCOUNT_ID="$IDENTITY"

aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" >/dev/null 2>&1 || {
  echo "ERROR: Cannot access bucket $BUCKET"
  exit 1
}
echo 'Bucket: accessible'

VERSIONING=$(aws_text s3api get-bucket-versioning --bucket "$BUCKET" --region "$REGION" --query Status || true)
echo "Versioning: ${VERSIONING:-Disabled}"

merge_lifecycle
echo 'Applying merged lifecycle configuration ...'
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --lifecycle-configuration "file://${MERGED_FILE//\\/\/}"
echo 'Lifecycle rule applied.'

ICELAND_SAMPLE=$(aws_text s3api list-objects-v2 --bucket "$BUCKET" --prefix iceland/ --delimiter / --region "$REGION" --query 'CommonPrefixes[].Prefix' --output text || true)
if [[ -n "${ICELAND_SAMPLE:-}" ]]; then
  echo ''
  echo 'Iceland monthly prefixes (sample):'
  for p in $ICELAND_SAMPLE; do echo "  $p"; done | head -6
else
  echo 'WARN: No iceland/ prefixes listed yet.'
fi

DEMO_KEYS_JSON='[]'
if [[ "$UPLOAD_DEMO" == true ]]; then
  echo ''
  echo "Uploading demo objects under $DEMO_PREFIX ..."
  KEY1="${DEMO_PREFIX}lifecycle-readme.txt"
  KEY2="${DEMO_PREFIX}cost-check-$(date +%Y%m%d).txt"
  TMP1=$(mktemp)
  TMP2=$(mktemp)
  echo 'Night 30 lifecycle lab demo — safe to delete.' >"$TMP1"
  date -Iseconds >"$TMP2"
  aws s3 cp "$TMP1" "s3://${BUCKET}/${KEY1}" --region "$REGION" --metadata "Lab=${TAG_LAB}"
  aws s3 cp "$TMP2" "s3://${BUCKET}/${KEY2}" --region "$REGION" --metadata "Lab=${TAG_LAB}"
  rm -f "$TMP1" "$TMP2"
  DEMO_KEYS_JSON=$(python -c "import json; print(json.dumps(['$KEY1','$KEY2']))")
fi

echo ''
echo '=== Cost Explorer — top services (last 30 days) ==='
TOP_JSON=$(top_services_json)
if [[ "$TOP_JSON" == "[]" ]]; then
  echo 'No cost data returned (new account or permissions). Open Billing console manually.'
else
  python -c "
import json
rows = json.loads('''$TOP_JSON''')
print('| Service | ~USD |')
print('|---------|------|')
for r in rows:
    print(f\"| {r['service']} | \${r['amountUsd']} |\")
"
fi

if [[ "$CREATE_BUDGET" == true ]]; then
  [[ -n "$BUDGET_EMAIL" ]] || { echo 'ERROR: --create-budget requires --budget-email'; exit 1; }
  echo ''
  echo "Creating budget $BUDGET_NAME (limit \$${BUDGET_LIMIT_USD}/month) ..."
  BUDGET_FILE=$(mktemp)
  NOTIF_FILE=$(mktemp)
  python - "$BUDGET_NAME" "$BUDGET_LIMIT_USD" "$BUDGET_EMAIL" "$BUDGET_FILE" "$NOTIF_FILE" <<'PY'
import json, sys
name, limit_usd, email, budget_file, notif_file = sys.argv[1:6]
json.dump({
    "BudgetName": name,
    "BudgetLimit": {"Amount": limit_usd, "Unit": "USD"},
    "BudgetType": "COST",
    "TimeUnit": "MONTHLY",
    "CostTypes": {"IncludeTax": True, "IncludeSubscription": True, "UseBlended": False},
}, open(budget_file, "w"), indent=2)
json.dump({
    "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE",
    },
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": email}],
}, open(notif_file, "w"), indent=2)
PY
  if ! aws budgets create-budget --account-id "$ACCOUNT_ID" \
    --budget "file://${BUDGET_FILE//\\/\/}" \
    --notifications-with-subscribers "file://${NOTIF_FILE//\\/\/}" 2>/dev/null; then
    aws budgets update-budget --account-id "$ACCOUNT_ID" \
      --new-budget "file://${BUDGET_FILE//\\/\/}" 2>/dev/null || true
  fi
  rm -f "$BUDGET_FILE" "$NOTIF_FILE"
  echo 'Budget configured. Confirm the email subscription if this is the first time.'
fi

read -r COST_START COST_END < <(date_range_last_30)
ICELAND_JSON=$(python -c "import json; print(json.dumps([p for p in '''${ICELAND_SAMPLE:-}'''.split() if p][:6]))")
python - "$RESULT_FILE" <<PY
import json
result = {
    "night": 30,
    "region": "$REGION",
    "accountId": "$ACCOUNT_ID",
    "bucket": "$BUCKET",
    "lifecycleRuleId": "$RULE_ID",
    "lifecycleTransitions": [
        {"days": 90, "storageClass": "STANDARD_IA"},
        {"days": 365, "storageClass": "GLACIER"},
    ],
    "versioning": "${VERSIONING:-Disabled}",
    "icelandPrefixSample": json.loads('''$ICELAND_JSON'''),
    "demoObjectKeys": json.loads('''$DEMO_KEYS_JSON'''),
    "costExplorer": {
        "start": "$COST_START",
        "end": "$COST_END",
        "topServices": json.loads('''$TOP_JSON'''),
    },
    "budgetName": "$BUDGET_NAME" if "$CREATE_BUDGET" == "true" else None,
    "budgetEmail": "$BUDGET_EMAIL" if "$CREATE_BUDGET" == "true" else None,
    "budgetLimitUsd": $BUDGET_LIMIT_USD if "$CREATE_BUDGET" == "true" else None,
    "tagLab": "$TAG_LAB",
}
json.dump(result, open("$RESULT_FILE", "w"), indent=2)
PY

echo ''
echo "Wrote $RESULT_FILE"
echo 'Next: S3 console -> Management -> Lifecycle rules; Billing -> Cost Explorer.'
echo 'Teardown: bash HTML/study-lab/night-30-lab-s3-lifecycle-teardown.sh'

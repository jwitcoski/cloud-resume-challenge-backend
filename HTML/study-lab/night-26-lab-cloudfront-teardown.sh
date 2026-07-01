#!/usr/bin/env bash
# Night 26 teardown — dashboard, cache policy, throttle demo, revert iceberg behavior
# Run: bash HTML/study-lab/night-26-lab-cloudfront-teardown.sh
set -euo pipefail

REGION=us-east-1
DOMAIN=globalskiatlas.com
DASHBOARD_NAME=saa-study-night26-api-perf
CACHE_POLICY_NAME=saa-study-night26-wiki-get
THROTTLE_API_NAME=saa-study-night26-throttle
CACHING_DISABLED_POLICY_ID=4135ea2d-6df8-44a3-9df3-4b5a84be39ad
WIKI_PATH_PATTERN='api/wiki*'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-26-cloudfront-result.json"

aws_text() {
  aws "$@" --output text 2>/dev/null | head -1 || true
}

DIST_ID=""
CACHE_POLICY_ID=""
WIKI_APPLIED=false
if [[ -f "$RESULT_FILE" ]]; then
  DIST_ID="$(python3 -c "import json; d=json.load(open('$RESULT_FILE')); print(d.get('distributionId',''))" 2>/dev/null || true)"
  CACHE_POLICY_ID="$(python3 -c "import json; d=json.load(open('$RESULT_FILE')); print(d.get('cachePolicyId',''))" 2>/dev/null || true)"
  WIKI_APPLIED="$(python3 -c "import json; d=json.load(open('$RESULT_FILE')); print('true' if d.get('wikiCacheApplied') or d.get('icebergCacheApplied') else 'false')" 2>/dev/null || echo false)"
fi

echo "=== Night 26 CloudFront lab teardown ==="

aws cloudwatch delete-dashboards --dashboard-names "$DASHBOARD_NAME" --region "$REGION" 2>/dev/null || true

API_ID="$(aws_text apigateway get-rest-apis --region "$REGION" \
  --query "items[?name=='${THROTTLE_API_NAME}'].id | [0]")"
if [[ -n "$API_ID" && "$API_ID" != "None" ]]; then
  aws apigateway delete-rest-api --region "$REGION" --rest-api-id "$API_ID" 2>/dev/null || true
fi

KEY_ID="$(aws_text apigateway get-api-keys --region "$REGION" \
  --query "items[?name=='${THROTTLE_API_NAME}-key'].id | [0]")"
if [[ -n "$KEY_ID" && "$KEY_ID" != "None" ]]; then
  aws apigateway delete-api-key --region "$REGION" --api-key "$KEY_ID" 2>/dev/null || true
fi

PLAN_ID="$(aws_text apigateway get-usage-plans --region "$REGION" \
  --query "items[?name=='${THROTTLE_API_NAME}-plan'].id | [0]")"
if [[ -n "$PLAN_ID" && "$PLAN_ID" != "None" ]]; then
  aws apigateway delete-usage-plan --region "$REGION" --usage-plan-id "$PLAN_ID" 2>/dev/null || true
fi

if [[ -z "$DIST_ID" || "$DIST_ID" == "None" ]]; then
  DIST_ID="$(aws_text cloudfront list-distributions \
    --query "DistributionList.Items[?contains(join(',', Aliases.Items || \`['\`']), '${DOMAIN}')].Id | [0]")"
fi

if [[ "$WIKI_APPLIED" == true && -n "$DIST_ID" && "$DIST_ID" != "None" ]]; then
  ETAG="$(aws_text cloudfront get-distribution-config --id "$DIST_ID" --query ETag)"
  CFG_TMP="$(mktemp)"
  aws cloudfront get-distribution-config --id "$DIST_ID" --output json >"$CFG_TMP"
  python3 - "$CFG_TMP" "$CACHING_DISABLED_POLICY_ID" "$WIKI_PATH_PATTERN" <<'PY'
import json, sys
path, policy_id, pattern = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(path))
cfg = data["DistributionConfig"]
for b in cfg.get("CacheBehaviors", {}).get("Items", []):
    if b.get("PathPattern") == pattern:
        b["CachePolicyId"] = policy_id
        break
json.dump(cfg, open(path, "w"))
PY
  aws cloudfront update-distribution --id "$DIST_ID" --if-match "$ETAG" --distribution-config "file://${CFG_TMP}" 2>/dev/null || true
  rm -f "$CFG_TMP"
  echo "CloudFront revert submitted for ${WIKI_PATH_PATTERN}"
fi

if [[ -z "$CACHE_POLICY_ID" || "$CACHE_POLICY_ID" == "None" ]]; then
  CACHE_POLICY_ID="$(aws_text cloudfront list-cache-policies --type custom \
    --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='${CACHE_POLICY_NAME}'].CachePolicy.Id | [0]")"
fi

if [[ -n "$CACHE_POLICY_ID" && "$CACHE_POLICY_ID" != "None" ]]; then
  ETAG="$(aws_text cloudfront get-cache-policy --id "$CACHE_POLICY_ID" --query ETag)"
  if [[ -n "$ETAG" ]]; then
    aws cloudfront delete-cache-policy --id "$CACHE_POLICY_ID" --if-match "$ETAG" 2>/dev/null || true
  fi
fi

rm -f "$RESULT_FILE"
echo "Done."

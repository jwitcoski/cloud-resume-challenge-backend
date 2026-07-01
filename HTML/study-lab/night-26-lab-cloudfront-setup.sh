#!/usr/bin/env bash
# Night 26 — CloudFront API perf lab: dashboard, cache policy, optional throttle demo
# Run: bash HTML/study-lab/night-26-lab-cloudfront-setup.sh [--test-cache] [--create-throttle-demo] [--apply-wiki-cache]
set -euo pipefail

REGION=us-east-1
DOMAIN=globalskiatlas.com
DASHBOARD_NAME=saa-study-night26-api-perf
CACHE_POLICY_NAME=saa-study-night26-wiki-get
THROTTLE_API_NAME=saa-study-night26-throttle
CACHING_DISABLED_POLICY_ID=4135ea2d-6df8-44a3-9df3-4b5a84be39ad
WIKI_PATH_PATTERN='api/wiki*'
PROBE_URL="https://${DOMAIN}/api/wiki/pages"

TEST_CACHE=false
CREATE_THROTTLE_DEMO=false
APPLY_WIKI_CACHE=false

for arg in "$@"; do
  case "$arg" in
    --test-cache) TEST_CACHE=true ;;
    --create-throttle-demo) CREATE_THROTTLE_DEMO=true ;;
    --apply-wiki-cache|--apply-iceberg-cache) APPLY_WIKI_CACHE=true ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-26-cloudfront-result.json"

aws_text() {
  aws "$@" --output text 2>/dev/null | head -1 || true
}

echo "=== Night 26 CloudFront API performance lab ==="

DIST_ID="$(aws_text cloudfront list-distributions \
  --query "DistributionList.Items[?contains(join(',', Aliases.Items || \`['\`']), '${DOMAIN}')].Id | [0]")"
DIST_DOMAIN="$(aws_text cloudfront list-distributions \
  --query "DistributionList.Items[?contains(join(',', Aliases.Items || \`['\`']), '${DOMAIN}')].DomainName | [0]")"
if [[ -z "$DIST_ID" || "$DIST_ID" == "None" ]]; then
  echo "No CloudFront distribution with alias ${DOMAIN} found." >&2
  exit 1
fi
echo "Distribution: ${DIST_ID} (${DIST_DOMAIN})"

CACHE_POLICY_ID="$(aws_text cloudfront list-cache-policies --type custom \
  --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='${CACHE_POLICY_NAME}'].CachePolicy.Id | [0]")"

if [[ -z "$CACHE_POLICY_ID" || "$CACHE_POLICY_ID" == "None" ]]; then
  POLICY_TMP="$(mktemp)"
  cat >"$POLICY_TMP" <<'EOF'
{
  "Name": "saa-study-night26-wiki-get",
  "Comment": "Night 26 study — short TTL wiki/JSON GET; respects origin Cache-Control",
  "DefaultTTL": 60,
  "MaxTTL": 300,
  "MinTTL": 0,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "HeadersConfig": {
      "HeaderBehavior": "whitelist",
      "Headers": { "Quantity": 1, "Items": ["Cache-Control"] }
    },
    "CookiesConfig": { "CookieBehavior": "none" },
    "QueryStringsConfig": { "QueryStringBehavior": "none" }
  }
}
EOF
  CACHE_POLICY_ID="$(aws cloudfront create-cache-policy --cache-policy-config "file://${POLICY_TMP}" \
    --query 'CachePolicy.Id' --output text)"
  rm -f "$POLICY_TMP"
  echo "Created cache policy ${CACHE_POLICY_ID}"
else
  echo "Reusing cache policy ${CACHE_POLICY_ID}"
fi

DASH_BODY="$(mktemp)"
cat >"$DASH_BODY" <<EOF
{
  "widgets": [
    {
      "type": "metric",
      "x": 0, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "CloudFront Cache Hit Rate (%)",
        "view": "timeSeries",
        "region": "${REGION}",
        "period": 300,
        "stat": "Average",
        "metrics": [["AWS/CloudFront", "CacheHitRate", "DistributionId", "${DIST_ID}", "Region", "Global"]]
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "CloudFront Requests",
        "view": "timeSeries",
        "region": "${REGION}",
        "period": 300,
        "stat": "Sum",
        "metrics": [["AWS/CloudFront", "Requests", "DistributionId", "${DIST_ID}", "Region", "Global"]]
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 6, "width": 12, "height": 6,
      "properties": {
        "title": "CloudFront Origin Latency (ms)",
        "view": "timeSeries",
        "region": "${REGION}",
        "period": 300,
        "stat": "Average",
        "metrics": [["AWS/CloudFront", "OriginLatency", "DistributionId", "${DIST_ID}", "Region", "Global"]]
      }
    },
    {
      "type": "text",
      "x": 12, "y": 6, "width": 12, "height": 6,
      "properties": {
        "markdown": "## Night 26 API perf\\n- Distribution: \`${DIST_ID}\`\\n- Probe: \`${PROBE_URL}\`\\n- Teardown: night-26-lab-cloudfront-teardown.sh"
      }
    }
  ]
}
EOF
aws cloudwatch put-dashboard --dashboard-name "$DASHBOARD_NAME" --dashboard-body "file://${DASH_BODY}" --region "$REGION"
rm -f "$DASH_BODY"
echo "Dashboard ${DASHBOARD_NAME} created/updated"

APPLIED_WIKI=false
if [[ "$APPLY_WIKI_CACHE" == true ]]; then
  echo "WARNING: Applying study cache policy to prod ${WIKI_PATH_PATTERN} behavior."
  ETAG="$(aws_text cloudfront get-distribution-config --id "$DIST_ID" --query ETag)"
  CFG_TMP="$(mktemp)"
  aws cloudfront get-distribution-config --id "$DIST_ID" --output json >"$CFG_TMP"
  python3 - "$CFG_TMP" "$CACHE_POLICY_ID" "$WIKI_PATH_PATTERN" <<'PY'
import json, sys
path, policy_id, pattern = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(path))
cfg = data["DistributionConfig"]
for b in cfg.get("CacheBehaviors", {}).get("Items", []):
    if b.get("PathPattern") == pattern:
        b["CachePolicyId"] = policy_id
        break
else:
    raise SystemExit(f"behavior {pattern} not found")
json.dump(cfg, open(path, "w"))
PY
  aws cloudfront update-distribution --id "$DIST_ID" --if-match "$ETAG" --distribution-config "file://${CFG_TMP}"
  rm -f "$CFG_TMP"
  APPLIED_WIKI=true
  echo "CloudFront update submitted — allow 5-15 min for Deployed status"
fi

THROTTLE_JSON="null"
if [[ "$CREATE_THROTTLE_DEMO" == true ]]; then
  API_ID="$(aws_text apigateway get-rest-apis --region "$REGION" \
    --query "items[?name=='${THROTTLE_API_NAME}'].id | [0]")"
  if [[ -z "$API_ID" || "$API_ID" == "None" ]]; then
    API_ID="$(aws apigateway create-rest-api --region "$REGION" --name "$THROTTLE_API_NAME" \
      --endpoint-configuration types=REGIONAL --query id --output text)"
    ROOT_ID="$(aws apigateway get-resources --region "$REGION" --rest-api-id "$API_ID" \
      --query "items[?path=='/'].id | [0]" --output text)"
    aws apigateway put-method --region "$REGION" --rest-api-id "$API_ID" --resource-id "$ROOT_ID" \
      --http-method GET --authorization-type NONE
    aws apigateway put-integration --region "$REGION" --rest-api-id "$API_ID" --resource-id "$ROOT_ID" \
      --http-method GET --type MOCK --request-templates '{"application/json":"{\"statusCode\":200}"}'
    aws apigateway put-method-response --region "$REGION" --rest-api-id "$API_ID" --resource-id "$ROOT_ID" \
      --http-method GET --status-code 200
    aws apigateway put-integration-response --region "$REGION" --rest-api-id "$API_ID" --resource-id "$ROOT_ID" \
      --http-method GET --status-code 200 \
      --response-templates '{"application/json":"{\"ok\":true,\"lab\":\"night-26-throttle\"}"}'
    aws apigateway create-deployment --region "$REGION" --rest-api-id "$API_ID" --stage-name prod
    aws apigateway update-stage --region "$REGION" --rest-api-id "$API_ID" --stage-name prod \
      --patch-operations \
      op=replace,path=/*/*/throttling/burstLimit,value=5 \
      op=replace,path=/*/*/throttling/rateLimit,value=2
    PLAN_ID="$(aws apigateway create-usage-plan --region "$REGION" --name "${THROTTLE_API_NAME}-plan" \
      --api-stages "apiId=${API_ID},stage=prod" --throttle burstLimit=5,rateLimit=2 --query id --output text)"
    KEY_ID="$(aws apigateway create-api-key --region "$REGION" --name "${THROTTLE_API_NAME}-key" --enabled --query id --output text)"
    KEY_VAL="$(aws apigateway get-api-key --region "$REGION" --api-key "$KEY_ID" --include-value --query value --output text)"
    aws apigateway create-usage-plan-key --region "$REGION" --usage-plan-id "$PLAN_ID" --key-id "$KEY_ID" --key-type API_KEY
  else
    KEY_ID="$(aws_text apigateway get-api-keys --region "$REGION" \
      --query "items[?name=='${THROTTLE_API_NAME}-key'].id | [0]")"
    KEY_VAL="$(aws_text apigateway get-api-key --region "$REGION" --api-key "$KEY_ID" --include-value --query value)"
    PLAN_ID="$(aws_text apigateway get-usage-plans --region "$REGION" \
      --query "items[?name=='${THROTTLE_API_NAME}-plan'].id | [0]")"
  fi
  INVOKE_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"
  echo "Throttle demo URL: ${INVOKE_URL}"
  echo "API key (x-api-key): ${KEY_VAL}"
  THROTTLE_JSON="{\"apiId\":\"${API_ID}\",\"invokeUrl\":\"${INVOKE_URL}\",\"apiKeyId\":\"${KEY_ID}\",\"apiKey\":\"${KEY_VAL}\",\"usagePlan\":\"${PLAN_ID}\"}"
fi

if [[ "$TEST_CACHE" == true ]]; then
  echo ""
  echo "--- Cache probe: ${PROBE_URL} ---"
  for i in 1 2; do
    echo "Request ${i}:"
    curl -sI "$PROBE_URL" | grep -iE 'HTTP/|x-cache|age:|cache-control' || true
    sleep 1
  done
fi

CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat >"$RESULT_FILE" <<EOF
{
  "lab": "night-26-cloudfront-api-caching",
  "region": "${REGION}",
  "domain": "${DOMAIN}",
  "distributionId": "${DIST_ID}",
  "distributionDomain": "${DIST_DOMAIN}",
  "dashboardName": "${DASHBOARD_NAME}",
  "cachePolicyId": "${CACHE_POLICY_ID}",
  "cachePolicyName": "${CACHE_POLICY_NAME}",
  "cachingDisabledPolicy": "${CACHING_DISABLED_POLICY_ID}",
  "wikiPathPattern": "${WIKI_PATH_PATTERN}",
  "wikiCacheApplied": ${APPLIED_WIKI},
  "probeUrl": "${PROBE_URL}",
  "throttleDemo": ${THROTTLE_JSON},
  "tag": "saa-study-lab=night-26",
  "createdAt": "${CREATED_AT}"
}
EOF
echo ""
echo "Wrote ${RESULT_FILE}"
echo "Teardown: bash HTML/study-lab/night-26-lab-cloudfront-teardown.sh"

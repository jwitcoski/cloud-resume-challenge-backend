#!/usr/bin/env bash
# Night 25 teardown — night25-* Route 53 records + night-25 health check
# Run: bash HTML/study-lab/night-25-lab-route53-teardown.sh
set -euo pipefail

DOMAIN=witcoskitech.com
LAB_PREFIX=night25
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-25-route53-result.json"

aws_text() {
  aws "$@" --output text 2>/dev/null | head -1 || true
}

ZONE_ID=""
HEALTH_CHECK_ID=""
if [[ -f "$RESULT_FILE" ]]; then
  ZONE_ID="$(python3 -c "import json; print(json.load(open('$RESULT_FILE')).get('hostedZoneId',''))" 2>/dev/null || true)"
  HEALTH_CHECK_ID="$(python3 -c "import json; print(json.load(open('$RESULT_FILE')).get('healthCheckId',''))" 2>/dev/null || true)"
fi

if [[ -z "$ZONE_ID" ]]; then
  ZONE_ID="$(aws_text route53 list-hosted-zones-by-name --dns-name "$DOMAIN" \
    --query "HostedZones[?Name=='${DOMAIN}.'].Id | [0]")"
  ZONE_ID="${ZONE_ID#/hostedzone/}"
fi

if [[ -z "$ZONE_ID" || "$ZONE_ID" == "None" ]]; then
  echo "No hosted zone for ${DOMAIN} — nothing to tear down."
  exit 0
fi

echo "Listing night25-* records in zone $ZONE_ID ..."
TMP_LIST="$(mktemp)"
aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" --output json >"$TMP_LIST"

DELETE_BATCH="$(python3 - "$TMP_LIST" "$DOMAIN" "$LAB_PREFIX" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
domain = sys.argv[2]
prefix = sys.argv[3]
suffix = f"{prefix}-"
changes = []
for rr in data.get("ResourceRecordSets", []):
    name = rr.get("Name", "")
    if suffix in name and name.endswith(f"{domain}."):
        changes.append({"Action": "DELETE", "ResourceRecordSet": rr})
print(json.dumps({"Changes": changes}))
PY
)"

COUNT="$(python3 -c "import json,sys; print(len(json.loads(sys.argv[1]).get('Changes',[])))" "$DELETE_BATCH")"
rm -f "$TMP_LIST"

if [[ "$COUNT" -eq 0 ]]; then
  echo "No night25-* records found."
else
  BATCH_FILE="$(mktemp)"
  echo "$DELETE_BATCH" >"$BATCH_FILE"
  echo "Deleting $COUNT record set(s) ..."
  aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch "file://${BATCH_FILE}" >/dev/null
  rm -f "$BATCH_FILE"
fi

if [[ -z "$HEALTH_CHECK_ID" || "$HEALTH_CHECK_ID" == "None" ]]; then
  HEALTH_CHECK_ID="$(aws_text route53 list-health-checks \
    --query "HealthChecks[?HealthCheckConfig.FullyQualifiedDomainName=='${DOMAIN}' && HealthCheckConfig.Type=='HTTPS'].Id | [0]")"
fi

if [[ -n "$HEALTH_CHECK_ID" && "$HEALTH_CHECK_ID" != "None" ]]; then
  TAG="$(aws_text route53 list-tags-for-resource --resource-type healthcheck --resource-id "$HEALTH_CHECK_ID" \
    --query "ResourceTagSet.Tags[?Key=='saa-study-lab' && Value=='night-25'].Value | [0]")"
  if [[ -n "$TAG" && "$TAG" != "None" ]]; then
    echo "Deleting health check $HEALTH_CHECK_ID ..."
    aws route53 delete-health-check --health-check-id "$HEALTH_CHECK_ID"
  else
    echo "Health check $HEALTH_CHECK_ID not tagged night-25 — skipping delete."
  fi
fi

rm -f "$RESULT_FILE"
echo "Removed $RESULT_FILE (if present)"
echo "Done. Apex ${DOMAIN} and www records unchanged."

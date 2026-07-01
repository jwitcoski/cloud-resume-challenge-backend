#!/usr/bin/env bash
# Night 25 Lab 3C - Route 53 routing policies on witcoskitech.com lab subdomains
# Run: bash HTML/study-lab/night-25-lab-route53-setup.sh [--test-dns] [--skip-health-check]
set -euo pipefail

REGION=us-east-1
DOMAIN=witcoskitech.com
CF_ALIAS_ZONE_ID=Z2FDTNDATAQYW2
HEALTH_CHECK_NAME=saa-study-night25-witco-https
LAB_PREFIX=night25
TEST_DNS=false
SKIP_HEALTH_CHECK=false

for arg in "$@"; do
  case "$arg" in
    --test-dns) TEST_DNS=true ;;
    --skip-health-check) SKIP_HEALTH_CHECK=true ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-25-route53-result.json"

aws_text() {
  aws "$@" --output text 2>/dev/null | head -1 || true
}

echo "=== Night 25 Route 53 lab setup ==="

CF_DOMAIN="$(aws_text cloudfront list-distributions --region "$REGION" \
  --query "DistributionList.Items[?contains(join(',', Aliases.Items || \`['\`']), '${DOMAIN}')].DomainName | [0]")"
if [[ -z "$CF_DOMAIN" || "$CF_DOMAIN" == "None" ]]; then
  echo "No CloudFront distribution with alias ${DOMAIN} found." >&2
  exit 1
fi
[[ "$CF_DOMAIN" == *\. ]] || CF_DOMAIN="${CF_DOMAIN}."

ZONE_ID="$(aws_text route53 list-hosted-zones-by-name --dns-name "$DOMAIN" \
  --query "HostedZones[?Name=='${DOMAIN}.'].Id | [0]")"
ZONE_ID="${ZONE_ID#/hostedzone/}"
if [[ -z "$ZONE_ID" || "$ZONE_ID" == "None" ]]; then
  echo "Hosted zone for ${DOMAIN} not found." >&2
  exit 1
fi

echo "Hosted zone: $ZONE_ID"
echo "CloudFront alias target: $CF_DOMAIN"

HEALTH_CHECK_ID=""
if [[ "$SKIP_HEALTH_CHECK" != true ]]; then
  HEALTH_CHECK_ID="$(aws_text route53 list-health-checks \
    --query "HealthChecks[?HealthCheckConfig.FullyQualifiedDomainName=='${DOMAIN}' && HealthCheckConfig.Type=='HTTPS'].Id | [0]")"
  if [[ -n "$HEALTH_CHECK_ID" && "$HEALTH_CHECK_ID" != "None" ]]; then
    TAG="$(aws_text route53 list-tags-for-resource --resource-type healthcheck --resource-id "$HEALTH_CHECK_ID" \
      --query "ResourceTagSet.Tags[?Key=='saa-study-lab' && Value=='night-25'].Value | [0]")"
    if [[ -z "$TAG" || "$TAG" == "None" ]]; then
      HEALTH_CHECK_ID=""
    else
      echo "Reusing health check $HEALTH_CHECK_ID"
    fi
  fi

  if [[ -z "$HEALTH_CHECK_ID" || "$HEALTH_CHECK_ID" == "None" ]]; then
    CALLER="night25-$(date +%Y%m%d%H%M%S)"
    HC_CONFIG="$(mktemp)"
    cat >"$HC_CONFIG" <<EOF
{
  "Type": "HTTPS",
  "ResourcePath": "/HTML/index.html",
  "FullyQualifiedDomainName": "${DOMAIN}",
  "Port": 443,
  "RequestInterval": 30,
  "FailureThreshold": 3,
  "EnableSNI": true
}
EOF
    echo "Creating HTTPS health check on https://${DOMAIN}/HTML/index.html ..."
    HEALTH_CHECK_ID="$(aws route53 create-health-check \
      --caller-reference "$CALLER" \
      --health-check-config "file://${HC_CONFIG}" \
      --query 'HealthCheck.Id' --output text)"
    rm -f "$HC_CONFIG"
    TAG_FILE="$(mktemp)"
    cat >"$TAG_FILE" <<EOF
{"Tags":[{"Key":"saa-study-lab","Value":"night-25"},{"Key":"Name","Value":"${HEALTH_CHECK_NAME}"}]}
EOF
    aws route53 change-tags-for-resource --resource-type healthcheck --resource-id "$HEALTH_CHECK_ID" \
      --add-tags "file://${TAG_FILE}" >/dev/null
    rm -f "$TAG_FILE"
    echo "Health check: $HEALTH_CHECK_ID (wait 1-2 min for Healthy)"
  fi
else
  echo "Skipping health check (--skip-health-check)."
fi

BATCH="$(mktemp)"
HC_JSON=""
if [[ -n "$HEALTH_CHECK_ID" && "$HEALTH_CHECK_ID" != "None" ]]; then
  HC_JSON=",\"HealthCheckId\":\"${HEALTH_CHECK_ID}\""
fi

cat >"$BATCH" <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${LAB_PREFIX}-simple.${DOMAIN}",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "${CF_ALIAS_ZONE_ID}",
          "DNSName": "${CF_DOMAIN}",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${LAB_PREFIX}-weighted.${DOMAIN}",
        "Type": "A",
        "SetIdentifier": "weighted-primary-80",
        "Weight": 80,
        "AliasTarget": {
          "HostedZoneId": "${CF_ALIAS_ZONE_ID}",
          "DNSName": "${CF_DOMAIN}",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${LAB_PREFIX}-weighted.${DOMAIN}",
        "Type": "A",
        "SetIdentifier": "weighted-canary-20",
        "Weight": 20,
        "AliasTarget": {
          "HostedZoneId": "${CF_ALIAS_ZONE_ID}",
          "DNSName": "${CF_DOMAIN}",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${LAB_PREFIX}-failover.${DOMAIN}",
        "Type": "A",
        "SetIdentifier": "failover-primary",
        "Failover": "PRIMARY"${HC_JSON},
        "AliasTarget": {
          "HostedZoneId": "${CF_ALIAS_ZONE_ID}",
          "DNSName": "${CF_DOMAIN}",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${LAB_PREFIX}-failover.${DOMAIN}",
        "Type": "A",
        "SetIdentifier": "failover-secondary-www",
        "Failover": "SECONDARY",
        "AliasTarget": {
          "HostedZoneId": "${CF_ALIAS_ZONE_ID}",
          "DNSName": "${CF_DOMAIN}",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${LAB_PREFIX}-latency.${DOMAIN}",
        "Type": "A",
        "SetIdentifier": "latency-use1",
        "Region": "us-east-1",
        "AliasTarget": {
          "HostedZoneId": "${CF_ALIAS_ZONE_ID}",
          "DNSName": "${CF_DOMAIN}",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${LAB_PREFIX}-geo.${DOMAIN}",
        "Type": "A",
        "SetIdentifier": "geo-us",
        "GeoLocation": { "CountryCode": "US" },
        "AliasTarget": {
          "HostedZoneId": "${CF_ALIAS_ZONE_ID}",
          "DNSName": "${CF_DOMAIN}",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${LAB_PREFIX}-geo.${DOMAIN}",
        "Type": "A",
        "SetIdentifier": "geo-default",
        "GeoLocation": { "CountryCode": "*" },
        "AliasTarget": {
          "HostedZoneId": "${CF_ALIAS_ZONE_ID}",
          "DNSName": "${CF_DOMAIN}",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

echo "UPSERTing night25-* record sets ..."
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch "file://${BATCH}" >/dev/null
rm -f "$BATCH"

cat >"$RESULT_FILE" <<EOF
{
  "lab": "night-25-lab3c-route53",
  "region": "${REGION}",
  "domain": "${DOMAIN}",
  "hostedZoneId": "${ZONE_ID}",
  "cloudFrontDomain": "${CF_DOMAIN%.}",
  "cloudFrontAliasZoneId": "${CF_ALIAS_ZONE_ID}",
  "healthCheckId": "${HEALTH_CHECK_ID}",
  "recordNames": [
    "${LAB_PREFIX}-simple.${DOMAIN}",
    "${LAB_PREFIX}-weighted.${DOMAIN}",
    "${LAB_PREFIX}-failover.${DOMAIN}",
    "${LAB_PREFIX}-latency.${DOMAIN}",
    "${LAB_PREFIX}-geo.${DOMAIN}"
  ],
  "policies": ["simple", "weighted", "failover", "latency", "geolocation"],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "Wrote $RESULT_FILE"

if [[ "$TEST_DNS" == true ]]; then
  echo ""
  echo "--- DNS lookups ---"
  for name in "${LAB_PREFIX}-simple.${DOMAIN}" "${LAB_PREFIX}-weighted.${DOMAIN}" \
    "${LAB_PREFIX}-failover.${DOMAIN}" "${LAB_PREFIX}-latency.${DOMAIN}" "${LAB_PREFIX}-geo.${DOMAIN}"; do
    echo "nslookup $name"
    nslookup "$name" || true
  done
fi

echo ""
echo "Teardown: bash HTML/study-lab/night-25-lab-route53-teardown.sh"

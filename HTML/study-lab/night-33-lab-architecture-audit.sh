#!/usr/bin/env bash
# Night 33 Lab — Read-only GSA full-stack architecture audit
# Run: bash HTML/study-lab/night-33-lab-architecture-audit.sh
# Options: --print-pillar-map

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
CLUSTER="globalskiatlas-backend-k8s"
TASK_FAMILY="globalskiatlas-backend-k8s-iceland"
WIKI_LAMBDA="wiki-api"
STATS_LAMBDA="saa-study-gsa-stats-uploader"
GLUE_DB="saa_study_gsa_night24"
ATHENA_WG="saa-study-night24"
STATE_MACHINE="saa-study-gsa-iceland-pipeline"
SFN_RULE="saa-study-gsa-iceland-monthly-sfn"
LEGACY_RULE="saa-study-gsa-iceland-monthly"
AURORA_CLUSTER="saa-study-gsa-aurora"
REDIS_CLUSTER="saa-study-gsa-redis"
PRINT_MAP=0

if [[ "${1:-}" == "--print-pillar-map" ]]; then PRINT_MAP=1; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPC_IDS_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"
RESULT_FILE="${SCRIPT_DIR}/night-33-architecture-result.json"

aws_text() {
  aws "$@" --output text 2>/dev/null || true
}

print_pillar_map() {
  echo ""
  echo "=== Well-Architected pillar -> GSA nights (Night 33) ==="
  echo "Operational Excellence : 26 (dashboards), 28 (audit), 32 (Step Functions history)"
  echo "Security             : 1-7 (KMS, Cognito, IAM), 17 (Lambda roles)"
  echo "Reliability          : 14-19 (SQS DLQ, Backup, Multi-AZ), 25 (Route 53 failover)"
  echo "Performance          : 23 (Redis), 24 (Athena partitions), 26 (CloudFront)"
  echo "Cost Optimization    : 27, 30 (lifecycle), 31 (Fargate right-sizing)"
  echo "Sustainability       : 30-31 awareness (scheduled batch, right-sized tasks)"
  echo ""
  echo "See gsa-architecture-map.md for tier wins matrix."
}

echo "Night 33 architecture audit — region ${REGION} (read-only)"
ACCOUNT="$(aws_text sts get-caller-identity --query Account)"
if [[ -z "${ACCOUNT}" ]]; then
  echo "aws sts get-caller-identity failed — configure AWS CLI" >&2
  exit 1
fi
echo "Account: ${ACCOUNT}"

# Edge
CF_ID=""
CF_DOMAIN=""
CF_ALIASES=""
CF_ORIGINS="0"
CF_FOUND=false
CF_DATA="$(aws cloudfront list-distributions --output json 2>/dev/null || echo '{}')"
if command -v jq >/dev/null 2>&1; then
  CF_MATCH="$(echo "${CF_DATA}" | jq -r '.DistributionList.Items[]? | select((.Aliases.Items // []) | map(test("globalskiatlas")) | any) | .Id' | head -n1)"
  if [[ -n "${CF_MATCH}" ]]; then
    CF_FOUND=true
    CF_ID="${CF_MATCH}"
    CF_DOMAIN="$(echo "${CF_DATA}" | jq -r --arg id "${CF_ID}" '.DistributionList.Items[] | select(.Id==$id) | .DomainName')"
    CF_ALIASES="$(echo "${CF_DATA}" | jq -r --arg id "${CF_ID}" '.DistributionList.Items[] | select(.Id==$id) | (.Aliases.Items // []) | join(",")')"
    CF_ORIGINS="$(echo "${CF_DATA}" | jq -r --arg id "${CF_ID}" '.DistributionList.Items[] | select(.Id==$id) | .Origins.Items | length')"
  elif echo "${CF_DATA}" | jq -e '.DistributionList.Items[0]' >/dev/null 2>&1; then
    CF_FOUND=true
    CF_ID="$(echo "${CF_DATA}" | jq -r '.DistributionList.Items[0].Id')"
    CF_DOMAIN="$(echo "${CF_DATA}" | jq -r '.DistributionList.Items[0].DomainName')"
    CF_ALIASES="$(echo "${CF_DATA}" | jq -r '.DistributionList.Items[0].Aliases.Items // [] | join(",")')"
    CF_ORIGINS="$(echo "${CF_DATA}" | jq -r '.DistributionList.Items[0].Origins.Items | length')"
  fi
fi

echo ""
echo "=== Edge / Frontend ==="
if [[ "${CF_FOUND}" == true ]]; then
  echo "[FOUND] CloudFront ${CF_ID} — ${CF_DOMAIN}"
else
  echo "[MISSING] CloudFront distribution"
fi

# Application
WIKI_ARN="$(aws_text lambda get-function --function-name "${WIKI_LAMBDA}" --region "${REGION}" --query 'Configuration.FunctionArn')"
WIKI_RT="$(aws_text lambda get-function --function-name "${WIKI_LAMBDA}" --region "${REGION}" --query 'Configuration.Runtime')"
APP_FOUND=false
[[ -n "${WIKI_ARN}" ]] && APP_FOUND=true
DDB_TABLES="$(aws_text dynamodb list-tables --region "${REGION}" --query 'TableNames' --output text | tr '\t' ',' || true)"

echo ""
echo "=== Application ==="
if [[ "${APP_FOUND}" == true ]]; then
  echo "[FOUND] Lambda ${WIKI_LAMBDA}"
else
  echo "[MISSING] Lambda ${WIKI_LAMBDA}"
fi
[[ -n "${DDB_TABLES}" && "${DDB_TABLES}" != "None" ]] && echo "  DynamoDB tables: ${DDB_TABLES}"

# Data
AURORA_FOUND=false
AURORA_STATUS=""
if aws rds describe-db-clusters --db-cluster-identifier "${AURORA_CLUSTER}" --region "${REGION}" >/dev/null 2>&1; then
  AURORA_FOUND=true
  AURORA_STATUS="$(aws_text rds describe-db-clusters --db-cluster-identifier "${AURORA_CLUSTER}" --region "${REGION}" --query 'DBClusters[0].Status')"
fi
REDIS_FOUND=false
if aws elasticache describe-cache-clusters --cache-cluster-id "${REDIS_CLUSTER}" --region "${REGION}" >/dev/null 2>&1; then
  REDIS_FOUND=true
fi
DATA_FOUND=false
[[ "${AURORA_FOUND}" == true || "${REDIS_FOUND}" == true ]] && DATA_FOUND=true

echo ""
echo "=== Data / OLTP ==="
if [[ "${AURORA_FOUND}" == true ]]; then echo "[FOUND] Aurora ${AURORA_CLUSTER}"; else echo "[MISSING] Aurora cluster (OK if Night 16 torn down)"; fi
if [[ "${REDIS_FOUND}" == true ]]; then echo "[FOUND] ElastiCache ${REDIS_CLUSTER}"; else echo "[MISSING] ElastiCache (OK if Night 23 torn down)"; fi

# Analytics
GLUE_FOUND=false
if aws glue get-database --name "${GLUE_DB}" --region "${REGION}" >/dev/null 2>&1; then GLUE_FOUND=true; fi
WG_FOUND=false
if aws athena get-work-group --work-group "${ATHENA_WG}" --region "${REGION}" >/dev/null 2>&1; then WG_FOUND=true; fi
ANALYTICS_FOUND=false
[[ "${GLUE_FOUND}" == true || "${WG_FOUND}" == true ]] && ANALYTICS_FOUND=true

echo ""
echo "=== Analytics ==="
if [[ "${GLUE_FOUND}" == true ]]; then echo "[FOUND] Glue DB ${GLUE_DB}"; else echo "[MISSING] Glue database"; fi
if [[ "${WG_FOUND}" == true ]]; then echo "[FOUND] Athena WG ${ATHENA_WG}"; else echo "[MISSING] Athena workgroup"; fi

# Pipeline
TASK_FOUND=false
TASK_CPU=""
TASK_MEM=""
if aws ecs describe-task-definition --task-definition "${TASK_FAMILY}" --region "${REGION}" >/dev/null 2>&1; then
  TASK_FOUND=true
  TASK_CPU="$(aws_text ecs describe-task-definition --task-definition "${TASK_FAMILY}" --region "${REGION}" --query 'taskDefinition.cpu')"
  TASK_MEM="$(aws_text ecs describe-task-definition --task-definition "${TASK_FAMILY}" --region "${REGION}" --query 'taskDefinition.memory')"
fi
CLUSTER_STATUS="$(aws_text ecs describe-clusters --clusters "${CLUSTER}" --region "${REGION}" --query 'clusters[0].status')"
SFN_ARN="$(aws_text stepfunctions list-state-machines --region "${REGION}" --query "stateMachines[?name=='${STATE_MACHINE}'].stateMachineArn | [0]")"
SFN_FOUND=false
[[ -n "${SFN_ARN}" && "${SFN_ARN}" != "None" ]] && SFN_FOUND=true
SFN_RULE_ARN="$(aws_text events describe-rule --name "${SFN_RULE}" --region "${REGION}" --query Arn)"
LEGACY_ARN="$(aws_text events describe-rule --name "${LEGACY_RULE}" --region "${REGION}" --query Arn)"
STATS_ARN="$(aws_text lambda get-function --function-name "${STATS_LAMBDA}" --region "${REGION}" --query 'Configuration.FunctionArn')"
PIPELINE_FOUND=false
[[ "${TASK_FOUND}" == true || "${SFN_FOUND}" == true || -n "${LEGACY_ARN}" ]] && PIPELINE_FOUND=true

echo ""
echo "=== Pipeline / Compute ==="
if [[ "${TASK_FOUND}" == true ]]; then echo "[FOUND] ECS task def ${TASK_FAMILY} (${TASK_CPU} CPU / ${TASK_MEM} MiB)"; else echo "[MISSING] ECS task definition"; fi
if [[ "${SFN_FOUND}" == true ]]; then echo "[FOUND] Step Functions ${STATE_MACHINE}"; else echo "[MISSING] Step Functions (run Night 32 deploy)"; fi
if [[ -n "${LEGACY_ARN}" ]]; then echo "[FOUND] Legacy schedule ${LEGACY_RULE}"; else echo "[MISSING] Legacy EventBridge schedule"; fi

# Network
VPC_ID=""
VPC_CIDR=""
NAT_COUNT=0
NET_FOUND=false
if [[ -f "${VPC_IDS_FILE}" ]] && command -v jq >/dev/null 2>&1; then
  VPC_ID="$(jq -r '.vpcId // .vpc.id // empty' "${VPC_IDS_FILE}")"
fi
if [[ -n "${VPC_ID}" ]]; then
  NET_FOUND=true
  VPC_CIDR="$(aws_text ec2 describe-vpcs --vpc-ids "${VPC_ID}" --region "${REGION}" --query 'Vpcs[0].CidrBlock')"
  NAT_COUNT="$(aws_text ec2 describe-nat-gateways --region "${REGION}" --filter "Name=vpc-id,Values=${VPC_ID}" "Name=state,Values=available" --query 'length(NatGateways)')"
fi

echo ""
echo "=== Network ==="
if [[ "${NET_FOUND}" == true ]]; then
  echo "[FOUND] VPC ${VPC_ID} ${VPC_CIDR} — NAT count: ${NAT_COUNT}"
else
  echo "[MISSING] night-9-vpc-ids.json or VPC"
fi

FOUND_COUNT=0
TOTAL_COUNT=6
[[ "${CF_FOUND}" == true ]] && FOUND_COUNT=$((FOUND_COUNT + 1))
[[ "${APP_FOUND}" == true ]] && FOUND_COUNT=$((FOUND_COUNT + 1))
[[ "${DATA_FOUND}" == true ]] && FOUND_COUNT=$((FOUND_COUNT + 1))
[[ "${ANALYTICS_FOUND}" == true ]] && FOUND_COUNT=$((FOUND_COUNT + 1))
[[ "${PIPELINE_FOUND}" == true ]] && FOUND_COUNT=$((FOUND_COUNT + 1))
[[ "${NET_FOUND}" == true ]] && FOUND_COUNT=$((FOUND_COUNT + 1))

echo ""
echo "Tiers with live resources: ${FOUND_COUNT}/${TOTAL_COUNT}"

AUDITED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if command -v jq >/dev/null 2>&1; then
  jq -n \
    --arg lab "night-33-architecture-audit" \
    --arg region "${REGION}" \
    --arg account "${ACCOUNT}" \
    --arg auditedAt "${AUDITED_AT}" \
    --argjson tiersFound "${FOUND_COUNT}" \
    --argjson tiersTotal "${TOTAL_COUNT}" \
    --arg cfId "${CF_ID}" \
    --arg cfDomain "${CF_DOMAIN}" \
    --arg cfAliases "${CF_ALIASES}" \
    --argjson cfFound "${CF_FOUND}" \
    --argjson cfOrigins "${CF_ORIGINS:-0}" \
    --arg wikiArn "${WIKI_ARN}" \
    --arg wikiRt "${WIKI_RT}" \
    --argjson appFound "${APP_FOUND}" \
    --arg ddbTables "${DDB_TABLES}" \
    --argjson auroraFound "${AURORA_FOUND}" \
    --arg auroraCluster "${AURORA_CLUSTER}" \
    --arg auroraStatus "${AURORA_STATUS}" \
    --argjson redisFound "${REDIS_FOUND}" \
    --arg redisCluster "${REDIS_CLUSTER}" \
    --argjson dataFound "${DATA_FOUND}" \
    --argjson glueFound "${GLUE_FOUND}" \
    --arg glueDb "${GLUE_DB}" \
    --argjson wgFound "${WG_FOUND}" \
    --arg athenaWg "${ATHENA_WG}" \
    --argjson analyticsFound "${ANALYTICS_FOUND}" \
    --argjson taskFound "${TASK_FOUND}" \
    --arg taskCpu "${TASK_CPU}" \
    --arg taskMem "${TASK_MEM}" \
    --arg clusterStatus "${CLUSTER_STATUS}" \
    --argjson sfnFound "${SFN_FOUND}" \
    --arg sfnArn "${SFN_ARN}" \
    --arg sfnRule "${SFN_RULE}" \
    --arg legacyArn "${LEGACY_ARN}" \
    --arg statsArn "${STATS_ARN}" \
    --argjson pipelineFound "${PIPELINE_FOUND}" \
    --arg vpcId "${VPC_ID}" \
    --arg vpcCidr "${VPC_CIDR}" \
    --argjson natCount "${NAT_COUNT}" \
    --argjson netFound "${NET_FOUND}" \
    '{
      lab: $lab,
      region: $region,
      account: $account,
      auditedAt: $auditedAt,
      tiersFound: $tiersFound,
      tiersTotal: $tiersTotal,
      tiers: {
        edge: { tier: "edge", found: $cfFound, distributionId: $cfId, domainName: $cfDomain, aliases: ($cfAliases | split(",") | map(select(. != ""))), originsCount: $cfOrigins },
        application: { tier: "application", found: $appFound, wikiLambda: { name: "wiki-api", arn: $wikiArn, runtime: $wikiRt }, dynamoDbWikiTables: ($ddbTables | split(",") | map(select(. != ""))) },
        data: { tier: "data", found: $dataFound, aurora: { clusterId: $auroraCluster, found: $auroraFound, status: $auroraStatus }, elasticache: { clusterId: $redisCluster, found: $redisFound } },
        analytics: { tier: "analytics", found: $analyticsFound, glueDatabase: { name: $glueDb, found: $glueFound }, athenaWorkgroup: { name: $athenaWg, found: $wgFound } },
        pipeline: { tier: "pipeline", found: $pipelineFound, ecs: { cluster: "globalskiatlas-backend-k8s", clusterStatus: $clusterStatus, taskFamily: "globalskiatlas-backend-k8s-iceland", taskDefFound: $taskFound, cpu: $taskCpu, memoryMiB: $taskMem }, stepFunctions: { name: "saa-study-gsa-iceland-pipeline", found: $sfnFound, arn: $sfnArn, scheduleRule: $sfnRule }, legacyEventBridgeRule: { name: "saa-study-gsa-iceland-monthly", found: ($legacyArn != ""), arn: $legacyArn }, statsUploaderLambda: { name: "saa-study-gsa-stats-uploader", found: ($statsArn != ""), arn: $statsArn } },
        network: { tier: "network", found: $netFound, vpcId: $vpcId, cidr: $vpcCidr, natGatewayCount: $natCount }
      },
      tierWinsScaffold: {
        edge: { security: "Cognito JWT on wiki writes; TLS at CloudFront", resilience: "Route 53 failover + health check on PRIMARY", cost: "CachingOptimized static; CachingDisabled on /api/wiki*" },
        application: { security: "Secrets Manager + KMS for Cognito secret", resilience: "Idempotent SQS handlers", cost: "Right-size Lambda memory; usage plans for partners" },
        data: { security: "Private subnets; SG from Lambda SG only", resilience: "Aurora Multi-AZ; PITR + Backup", cost: "Redis cache-aside cuts Aurora reads" },
        analytics: { security: "S3 policies; Athena workgroup IAM", resilience: "Iceberg snapshots", cost: "Partitions + lifecycle on exports" },
        pipeline: { security: "ECS execution vs task role; PassRole scoped", resilience: "SQS DLQ; SNS failure; SFN Catch", cost: "Scheduled Fargate; lifecycle iceland/" },
        network: { security: "Private subnets for ENIs", resilience: "2-AZ; single-NAT AZ risk", cost: "VPC endpoints vs NAT GB" }
      }
    }' > "${RESULT_FILE}"
else
  echo '{"lab":"night-33-architecture-audit","note":"install jq for full result JSON"}' > "${RESULT_FILE}"
fi

echo ""
echo "Wrote ${RESULT_FILE}"

if [[ "${PRINT_MAP}" -eq 1 ]]; then print_pillar_map; fi

echo ""
echo "Next: complete Block 2 write-up in night-33-architecture-writeup.md, then quiz 33."

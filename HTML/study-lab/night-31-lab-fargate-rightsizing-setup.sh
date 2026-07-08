#!/usr/bin/env bash
# Night 31 Lab — Fargate right-sizing audit (read-only)
# Run: bash HTML/study-lab/night-31-lab-fargate-rightsizing-setup.sh [--print-decision-tree]

set -euo pipefail
REGION=us-east-1
CLUSTER=globalskiatlas-backend-k8s
TASK_FAMILY=globalskiatlas-backend-k8s-iceland
LOG_GROUP=/ecs/globalskiatlas-backend-k8s-iceland
TAG_LAB=night-31
FARGATE_VCPU_HR=0.04048
FARGATE_GB_HR=0.004445
RUN_HOURS=2.0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIZING_FILE="${SCRIPT_DIR}/ecs-task-pipeline-sizing.json"
RESULT_FILE="${SCRIPT_DIR}/night-31-fargate-rightsizing-result.json"
PRINT_TREE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --print-decision-tree) PRINT_TREE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

aws_text() {
  local out
  out=$(aws "$@" --output text 2>/dev/null) || return 1
  [[ -z "$out" || "$out" == "None" ]] && return 1
  echo "$out"
}

print_decision_tree() {
  echo ""
  echo "=== Purchase model decision tree (Night 31) ==="
  echo "Steady Fargate/Lambda/EC2 hours? -> Compute Savings Plan (1-3 yr)"
  echo "Retryable batch (Iceland monthly)? -> Fargate Spot capacity provider"
  echo "Hard deadline, first-run proof? -> Fargate On-Demand (Night 10)"
  echo "NAT dominates bill? -> S3 gateway + ECR endpoints (Night 9)"
  echo ""
}

fargate_hourly() {
  python - "$1" "$2" "$FARGATE_VCPU_HR" "$FARGATE_GB_HR" <<'PY'
import sys
vcpu, gb, vhr, ghr = map(float, sys.argv[1:5])
print(vcpu * vhr + gb * ghr)
PY
}

echo "=== Night 31 Lab — Fargate right-sizing (read-only) ==="
echo "Cluster:     $CLUSTER"
echo "Task family: $TASK_FAMILY"
echo ""

[[ "$PRINT_TREE" == true ]] && print_decision_tree

LIVE_JSON=$(aws ecs describe-task-definition --task-definition "$TASK_FAMILY" --region "$REGION" --output json 2>/dev/null || true)
if [[ -n "$LIVE_JSON" ]]; then
  python - "$LIVE_JSON" <<'PY'
import json, sys
td = json.loads(sys.argv[1])["taskDefinition"]
cpu = int(td["cpu"])
mem = int(td["memory"])
vcpu = round(cpu/1024, 2)
gib = round(mem/1024, 2)
ephem = td.get("ephemeralStorage", {}).get("sizeInGiB", 20)
print(f"Live task definition:")
print(f"  {td['taskDefinitionArn']} (rev {td['revision']})")
print(f"  CPU {cpu} units ({vcpu} vCPU), Memory {mem} MiB ({gib} GiB)")
print(f"  Ephemeral storage: {ephem} GiB")
PY
else
  echo "WARN: Could not describe task definition — using ecs-task-pipeline-sizing.json defaults."
fi

echo ""
echo "=== Cost comparison (~${RUN_HOURS} hr wall clock, us-east-1 Linux x86) ==="
echo "| Scenario | vCPU | GiB | OD/run | Spot/run | OD x12/mo |"
echo "|----------|------|-----|--------|----------|-----------|"
python - "$SIZING_FILE" "$RUN_HOURS" "$FARGATE_VCPU_HR" "$FARGATE_GB_HR" <<'PY'
import json, sys
path, hours, vhr, ghr = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
data = json.load(open(path))
for s in data["scenarios"]:
    hr = s["vcpu"] * vhr + s["memoryGiB"] * ghr
    od = round(hr * hours, 4)
    spot = round(od * 0.35, 4)
    monthly = round(od * 12, 3)
    print(f"| {s['id']} | {s['vcpu']} | {s['memoryGiB']} | ${od} | ${spot} | ${monthly} |")
PY

TASK_ARN=$(aws_text ecs list-tasks --cluster "$CLUSTER" --region "$REGION" --desired-status STOPPED --family "$TASK_FAMILY" --max-items 1 --query 'taskArns[0]' || true)
if [[ -n "$TASK_ARN" ]]; then
  echo ""
  echo "Most recent stopped Iceland task:"
  aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" --region "$REGION" \
    --query 'tasks[0].{arn:taskArn,duration:startedAt,stop:stoppedAt,exit:containers[0].exitCode}' --output table
else
  echo ""
  echo "No recent stopped Iceland tasks in cluster — run Night 10 or wait for schedule."
fi

echo ""
echo "Compute Optimizer (ECS services):"
OPT_JSON=$(aws compute-optimizer get-ecs-service-recommendations --region "$REGION" --output json 2>/dev/null || true)
if [[ -z "$OPT_JSON" ]]; then
  echo "  No response — enroll Compute Optimizer in Billing console"
else
  python - "$OPT_JSON" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
recs = data.get("ecsServiceRecommendations") or []
print(f"  Recommendations returned: {len(recs)}")
if not recs:
    print("  RunTask-only Iceland may not appear until exposed as an ECS service")
PY
fi

python - "$RESULT_FILE" "$REGION" "$CLUSTER" "$TASK_FAMILY" "$LOG_GROUP" "$TAG_LAB" "$RUN_HOURS" "$SIZING_FILE" "$LIVE_JSON" "$TASK_ARN" <<'PY'
import json, sys, datetime
out, region, cluster, family, log_group, lab, hours = sys.argv[1:8]
sizing_path, live_json, task_arn = sys.argv[8:11]
scenarios = json.load(open(sizing_path))["scenarios"]
vhr, ghr = 0.04048, 0.004445
rows = []
for s in scenarios:
    hr = s["vcpu"] * vhr + s["memoryGiB"] * ghr
    od = round(hr * float(hours), 4)
    rows.append({
        "id": s["id"], "vcpu": s["vcpu"], "memoryGiB": s["memoryGiB"],
        "onDemandRunUsd": od, "fargateSpotRunUsd": round(od * 0.35, 4),
        "monthlyOnDemandUsd": round(od * 12, 3)
    })
live = None
if live_json:
    td = json.loads(live_json)["taskDefinition"]
    live = {"arn": td["taskDefinitionArn"], "revision": td["revision"],
            "cpu": int(td["cpu"]), "memoryMiB": int(td["memory"])}
result = {
    "night": 31, "region": region, "lab": lab, "cluster": cluster,
    "taskFamily": family, "logGroup": log_group,
    "liveTaskDefinition": live, "sizingScenarios": rows,
    "recentStoppedTaskArn": task_arn or None,
    "assumedRunHours": float(hours),
    "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
}
with open(out, "w") as f:
    json.dump(result, f, indent=2)
PY

echo ""
echo "Wrote $RESULT_FILE"
echo "Next: ECS console task def + CloudWatch metrics; take night-31-quiz.json."
echo "Teardown: bash HTML/study-lab/night-31-lab-fargate-rightsizing-teardown.sh"

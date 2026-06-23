#!/usr/bin/env bash
# Night 10 Lab 2A — private Fargate (part 2)
# Run from repo: bash HTML/study-lab/night-10-lab-fargate-run.sh
#
# Prerequisites: night-9-vpc-ids.json (VPC + private subnets + Fargate SG)
# Runs globalskiatlas-backend-k8s-iceland in private subnets, assignPublicIp DISABLED.
# Verifies: task reaches RUNNING, exits cleanly, CloudWatch logs, S3 output prefix.

set -euo pipefail
REGION=us-east-1
CLUSTER=globalskiatlas-backend-k8s
TASK_FAMILY=globalskiatlas-backend-k8s-iceland
S3_BUCKET=globalskiatlas-backend-k8s-output
LOG_GROUP=/ecs/globalskiatlas-backend-k8s-iceland
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IDS_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"
RESULT_FILE="${SCRIPT_DIR}/night-10-task-result.json"

if [[ ! -f "$IDS_FILE" ]]; then
  echo "Missing $IDS_FILE — run night-9-lab-vpc-build.sh first."
  exit 1
fi

SUBNET_A=$(jq -r '.subnets.privateA.id' "$IDS_FILE")
SUBNET_B=$(jq -r '.subnets.privateB.id' "$IDS_FILE")
FARGATE_SG=$(jq -r '.securityGroups.fargate' "$IDS_FILE")
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition "$TASK_FAMILY" --region "$REGION" \
  --query 'taskDefinition.taskDefinitionArn' --output text)

echo "=== Night 10 Lab 2A — Iceland Fargate in private subnets ==="
echo "Cluster:     $CLUSTER"
echo "Task def:    $TASK_DEF"
echo "Subnets:     $SUBNET_A, $SUBNET_B"
echo "Security GP: $FARGATE_SG"
echo "assignPublicIp: DISABLED"
echo ""

TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEF" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_A,$SUBNET_B],securityGroups=[$FARGATE_SG],assignPublicIp=DISABLED}" \
  --region "$REGION" \
  --query 'tasks[0].taskArn' --output text)

if [[ -z "$TASK_ARN" || "$TASK_ARN" == "None" ]]; then
  echo "ecs:RunTask failed — check IAM PassRole, subnets, and cluster."
  exit 1
fi

echo "Task started: $TASK_ARN"
echo "Waiting for RUNNING (up to 5 min)..."
aws ecs wait tasks-running --cluster "$CLUSTER" --tasks "$TASK_ARN" --region "$REGION" || true

LAST_STATUS=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" --region "$REGION" \
  --query 'tasks[0].lastStatus' --output text)
STOP_REASON=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" --region "$REGION" \
  --query 'tasks[0].stoppedReason' --output text 2>/dev/null || echo "")
echo "Status: $LAST_STATUS ${STOP_REASON:+(stopped: $STOP_REASON)}"

if [[ "$LAST_STATUS" == "PROVISIONING" || "$LAST_STATUS" == "PENDING" ]]; then
  echo ""
  echo "Troubleshoot checklist (Night 10 quiz topics):"
  echo "  1. Private route table → NAT Gateway (night-9-vpc-ids.json natGateway.id)"
  echo "  2. Fargate SG egress TCP 443 (not inbound)"
  echo "  3. Execution role: globalskiatlas-backend-k8s-ecs-execution (ECR + logs)"
  echo "  4. NAT available in public-a subnet"
  aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" --region "$REGION" \
    --query 'tasks[0].{status:lastStatus,reason:stoppedReason,containers:containers[*].{name:name,reason:reason,exit:exitCode}}' \
    --output json
  exit 1
fi

echo "Waiting for task to stop (Iceland pipeline may take several minutes)..."
aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$TASK_ARN" --region "$REGION"

DESCRIBE=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" --region "$REGION" --output json)
EXIT_CODE=$(echo "$DESCRIBE" | jq -r '.tasks[0].containers[0].exitCode // "null"')
STOPPED_REASON=$(echo "$DESCRIBE" | jq -r '.tasks[0].stoppedReason // ""')
STOPPED_AT=$(echo "$DESCRIBE" | jq -r '.tasks[0].stoppedAt // ""')

echo ""
echo "=== Task finished ==="
echo "Exit code: $EXIT_CODE"
echo "Stopped reason: $STOPPED_REASON"

echo ""
echo "=== Recent CloudWatch logs ==="
STREAM=$(aws logs describe-log-streams --log-group-name "$LOG_GROUP" --region "$REGION" \
  --order-by LastEventTime --descending --max-items 1 \
  --query 'logStreams[0].logStreamName' --output text 2>/dev/null || true)
if [[ -n "$STREAM" && "$STREAM" != "None" ]]; then
  aws logs get-log-events --log-group-name "$LOG_GROUP" --log-stream-name "$STREAM" \
    --region "$REGION" --limit 20 --query 'events[*].message' --output text 2>/dev/null | tail -5 || true
else
  echo "(no log stream yet — check execution role + awslogs driver)"
fi

echo ""
echo "=== S3 output (recent objects in $S3_BUCKET) ==="
aws s3 ls "s3://${S3_BUCKET}/" --recursive --human-readable --summarize 2>/dev/null \
  | tail -8 || echo "(list failed — check task role S3WriteGlobalskiatlasOutput)"

STARTED_AT=$(echo "$DESCRIBE" | jq -r '.tasks[0].createdAt // ""')
cat > "$RESULT_FILE" <<EOF
{
  "lab": "night-10-lab2a-fargate-private",
  "region": "$REGION",
  "completedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "cluster": "$CLUSTER",
  "taskDefinition": "$TASK_DEF",
  "taskArn": "$TASK_ARN",
  "network": {
    "subnets": ["$SUBNET_A", "$SUBNET_B"],
    "securityGroups": ["$FARGATE_SG"],
    "assignPublicIp": "DISABLED"
  },
  "result": {
    "exitCode": $EXIT_CODE,
    "stoppedReason": $(jq -n --arg r "$STOPPED_REASON" '$r'),
    "startedAt": $(jq -n --arg s "$STARTED_AT" '$s'),
    "stoppedAt": $(jq -n --arg s "$STOPPED_AT" '$s')
  },
  "verify": {
    "logGroup": "$LOG_GROUP",
    "s3Bucket": "$S3_BUCKET"
  }
}
EOF

echo ""
echo "Result written to $RESULT_FILE"
if [[ "$EXIT_CODE" == "0" ]]; then
  echo "Night 10 lab PASSED — Iceland task completed in private subnets."
else
  echo "Night 10 lab FAILED — exit $EXIT_CODE. Review stoppedReason and quiz night-10-quiz.json Q6–Q8."
  exit 1
fi

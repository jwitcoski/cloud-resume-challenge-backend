#!/usr/bin/env bash
# Night 12 Lab 2B — EventBridge schedule → ecs:RunTask (Iceland pipeline)
# Run from repo: bash HTML/study-lab/night-12-lab-eventbridge-schedule.sh
#
# Prerequisites: night-9-vpc-ids.json, Night 10 task run succeeded once
# Options:
#   --schedule monthly   cron(0 6 1 * ? *) — production default (1st of month 06:00 UTC)
#   --schedule test      rate(30 minutes) — shorter window to see a scheduled fire
#   --test-fire          temporarily rate(1 minute), wait for ECS task, restore monthly cron
#   --skip-alarm         do not create CloudWatch alarm on task failure

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
CLUSTER=globalskiatlas-backend-k8s
TASK_FAMILY=globalskiatlas-backend-k8s-iceland
RULE_NAME="${PREFIX}-iceland-monthly"
ROLE_NAME="${PREFIX}-eventbridge-ecs"
ALARM_NAME="${PREFIX}-iceland-task-failed"
SNS_TOPIC=""  # optional: set to SNS ARN for alarm notifications

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IDS_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"
RESULT_FILE="${SCRIPT_DIR}/night-12-eventbridge-result.json"
TRUST_POLICY="${SCRIPT_DIR}/eventbridge-ecs-trust-policy.json"
RUN_POLICY="${SCRIPT_DIR}/eventbridge-ecs-run-policy.json"

SCHEDULE_MODE="monthly"
TEST_FIRE=false
SKIP_ALARM=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --schedule)
      SCHEDULE_MODE="${2:-monthly}"
      shift 2
      ;;
    --schedule=*)
      SCHEDULE_MODE="${1#*=}"
      shift
      ;;
    --test-fire) TEST_FIRE=true; shift ;;
    --skip-alarm) SKIP_ALARM=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

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

case "$SCHEDULE_MODE" in
  monthly) SCHEDULE_EXPR='cron(0 6 1 * ? *)' ;;
  test)    SCHEDULE_EXPR='rate(30 minutes)' ;;
  *) echo "Unknown schedule mode: $SCHEDULE_MODE (use monthly or test)"; exit 1 ;;
esac

echo "=== Night 12 Lab 2B — EventBridge → ECS RunTask ==="
echo "Cluster:      $CLUSTER"
echo "Task def:     $TASK_DEF"
echo "Rule:         $RULE_NAME"
echo "Schedule:     $SCHEDULE_EXPR"
echo "Network:      subnets [$SUBNET_A, $SUBNET_B], SG $FARGATE_SG, assignPublicIp DISABLED"
echo ""

# --- IAM role for EventBridge ECS target ---
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${ROLE_NAME}"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

if ! aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
  echo "Creating IAM role $ROLE_NAME ..."
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://${TRUST_POLICY}" \
    --description "Night 12 study lab — EventBridge invokes Iceland ecs:RunTask" \
    --tags Key=Lab,Value=night-12 Key=Project,Value=saa-study-gsa
else
  echo "IAM role $ROLE_NAME already exists."
fi

if ! aws iam get-policy --policy-arn "$POLICY_ARN" &>/dev/null; then
  echo "Creating IAM policy ${ROLE_NAME} ..."
  aws iam create-policy \
    --policy-name "$ROLE_NAME" \
    --policy-document "file://${RUN_POLICY}" \
    --description "Scoped ecs:RunTask + PassRole for Iceland scheduled runs"
fi

aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN" 2>/dev/null || true
echo "Role ARN: $ROLE_ARN"
sleep 5

# --- EventBridge rule ---
if aws events describe-rule --name "$RULE_NAME" --region "$REGION" &>/dev/null; then
  echo "Updating existing rule $RULE_NAME ..."
  aws events put-rule \
    --name "$RULE_NAME" \
    --schedule-expression "$SCHEDULE_EXPR" \
    --state ENABLED \
    --description "Monthly Iceland OSM pipeline (study lab)" \
    --region "$REGION" >/dev/null
else
  echo "Creating rule $RULE_NAME ..."
  aws events put-rule \
    --name "$RULE_NAME" \
    --schedule-expression "$SCHEDULE_EXPR" \
    --state ENABLED \
    --description "Monthly Iceland OSM pipeline (study lab)" \
    --region "$REGION" >/dev/null
fi

TARGETS_FILE=$(mktemp)
trap 'rm -f "$TARGETS_FILE"' EXIT
jq -n \
  --arg id "iceland-fargate" \
  --arg arn "arn:aws:ecs:${REGION}:${ACCOUNT_ID}:cluster/${CLUSTER}" \
  --arg role "$ROLE_ARN" \
  --arg task "$TASK_DEF" \
  --arg a "$SUBNET_A" --arg b "$SUBNET_B" --arg sg "$FARGATE_SG" \
  '[{
    Id: $id,
    Arn: $arn,
    RoleArn: $role,
    EcsParameters: {
      TaskDefinitionArn: $task,
      LaunchType: "FARGATE",
      PlatformVersion: "LATEST",
      TaskCount: 1,
      NetworkConfiguration: {
        awsvpcConfiguration: {
          Subnets: [$a, $b],
          SecurityGroups: [$sg],
          AssignPublicIp: "DISABLED"
        }
      }
    }
  }]' > "$TARGETS_FILE"

echo "Attaching ECS target ..."
aws events put-targets \
  --rule "$RULE_NAME" \
  --region "$REGION" \
  --targets "file://${TARGETS_FILE}" \
  >/dev/null

# --- Optional: CloudWatch alarm on failed ECS tasks (EventBridge → metric filter pattern simplified) ---
# Uses ECS service metric TasksStopped with exit code via EventBridge rule on task state change is heavier;
# for study lab we alarm on RunningTaskCount = 0 after schedule window OR use Events rule for failures.
if [[ "$SKIP_ALARM" == "false" ]]; then
  # Alarm when EventBridge failed invocations for the schedule rule spike
  aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "Night 12 — EventBridge failed invocations for Iceland schedule" \
    --metric-name FailedInvocations \
    --namespace AWS/Events \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions "Name=RuleName,Value=${RULE_NAME}" \
    --treat-missing-data notBreaching \
    --region "$REGION" >/dev/null
  echo "CloudWatch alarm: $ALARM_NAME (FailedInvocations on rule $RULE_NAME)"
fi

# --- Optional immediate validation ---
if [[ "$TEST_FIRE" == "true" ]]; then
  echo ""
  echo "=== Test fire: temporary rate(1 minute) schedule ==="
  aws events put-rule --name "$RULE_NAME" --schedule-expression "rate(1 minute)" \
    --state ENABLED --region "$REGION" >/dev/null
  echo "Waiting up to 3 minutes for scheduled RunTask ..."
  sleep 150
  RECENT=$(aws ecs list-tasks --cluster "$CLUSTER" --region "$REGION" \
    --desired-status STOPPED --max-items 3 --query 'taskArns' --output text 2>/dev/null || true)
  echo "Recent stopped tasks: ${RECENT:-none}"
  aws events put-rule --name "$RULE_NAME" --schedule-expression "$SCHEDULE_EXPR" \
    --state ENABLED --region "$REGION" >/dev/null
  echo "Schedule restored to: $SCHEDULE_EXPR"
fi

cat > "$RESULT_FILE" <<EOF
{
  "lab": "night-12-lab2b-eventbridge-schedule",
  "region": "$REGION",
  "completedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "rule": {
    "name": "$RULE_NAME",
    "scheduleExpression": "$SCHEDULE_EXPR",
    "enabled": true
  },
  "target": {
    "cluster": "$CLUSTER",
    "taskDefinition": "$TASK_DEF",
    "launchType": "FARGATE",
    "network": {
      "subnets": ["$SUBNET_A", "$SUBNET_B"],
      "securityGroups": ["$FARGATE_SG"],
      "assignPublicIp": "DISABLED"
    }
  },
  "iam": {
    "roleName": "$ROLE_NAME",
    "roleArn": "$ROLE_ARN",
    "trustPolicy": "eventbridge-ecs-trust-policy.json",
    "runPolicy": "eventbridge-ecs-run-policy.json"
  },
  "alarm": $( [[ "$SKIP_ALARM" == "false" ]] && echo "\"$ALARM_NAME\"" || echo "null" ),
  "verify": {
    "listTargets": "aws events list-targets-by-rule --rule $RULE_NAME --region $REGION",
    "metrics": "CloudWatch → AWS/Events → Invocations + FailedInvocations for $RULE_NAME",
    "ecsTasks": "aws ecs list-tasks --cluster $CLUSTER --region $REGION",
    "teardown": "bash HTML/study-lab/night-12-lab-eventbridge-teardown.sh"
  }
}
EOF

echo ""
echo "Result written to $RESULT_FILE"
echo ""
echo "=== Night 12 lab setup complete ==="
echo "Verify:"
echo "  aws events describe-rule --name $RULE_NAME --region $REGION"
echo "  aws events list-targets-by-rule --rule $RULE_NAME --region $REGION"
echo ""
echo "To see a fire without waiting for the 1st of the month:"
echo "  bash HTML/study-lab/night-12-lab-eventbridge-schedule.sh --schedule test"
echo "  bash HTML/study-lab/night-12-lab-eventbridge-schedule.sh --test-fire"
echo ""
echo "Teardown (keeps VPC): bash HTML/study-lab/night-12-lab-eventbridge-teardown.sh"

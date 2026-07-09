#!/usr/bin/env bash
# Night 32 Lab — Step Functions capstone (sam-pipeline-orchestrator)
# Run: bash HTML/study-lab/night-32-lab-stepfunctions-setup.sh [--test-start] [--keep-legacy-schedule] [--disable-success-rule]

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
CLUSTER=globalskiatlas-backend-k8s
TASK_FAMILY=globalskiatlas-backend-k8s-iceland
STACK_NAME=sam-pipeline-orchestrator
LEGACY_RULE="${PREFIX}-iceland-monthly"
SUCCESS_RULE="${PREFIX}-iceland-success-to-sqs"
STATE_MACHINE_NAME="${PREFIX}-iceland-pipeline"
SCHEDULE_RULE="${PREFIX}-iceland-monthly-sfn"
STATS_FUNCTION="${PREFIX}-stats-uploader"
COMPLETION_QUEUE="${PREFIX}-iceland-completion"
ALERTS_TOPIC="${PREFIX}-iceland-alerts"
ECS_EXEC_ROLE=globalskiatlas-backend-k8s-ecs-execution
ECS_TASK_ROLE=globalskiatlas-backend-k8s-ecs-task
TAG_LAB=night-32

TEST_START=false
KEEP_LEGACY=false
DISABLE_SUCCESS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --test-start) TEST_START=true; shift ;;
    --keep-legacy-schedule) KEEP_LEGACY=true; shift ;;
    --disable-success-rule) DISABLE_SUCCESS=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAM_DIR="${SCRIPT_DIR}/sam-pipeline-orchestrator"
VPC_FILE="${SCRIPT_DIR}/night-9-vpc-ids.json"
SQS_RESULT="${SCRIPT_DIR}/night-13-sqs-result.json"
SNS_RESULT="${SCRIPT_DIR}/night-14-sns-result.json"
RESULT_FILE="${SCRIPT_DIR}/night-32-stepfunctions-result.json"

aws_text() {
  local out
  out=$(aws "$@" --output text 2>/dev/null) || return 1
  [[ -z "$out" || "$out" == "None" ]] && return 1
  echo "$out"
}

set_rule_enabled() {
  local rule="$1" enabled="$2"
  if ! aws_text events describe-rule --name "$rule" --region "$REGION" --query Name >/dev/null; then
    echo "Rule $rule not found — skip"
    return 1
  fi
  if [[ "$enabled" == true ]]; then
    aws events enable-rule --name "$rule" --region "$REGION" >/dev/null
    echo "Enabled $rule"
  else
    aws events disable-rule --name "$rule" --region "$REGION" >/dev/null
    echo "Disabled $rule"
  fi
  return 0
}

command -v aws >/dev/null || { echo "Missing aws CLI"; exit 1; }
command -v sam >/dev/null || { echo "Missing sam CLI"; exit 1; }
[[ -f "$VPC_FILE" ]] || { echo "Missing $VPC_FILE"; exit 1; }
[[ -f "${SAM_DIR}/template.yaml" ]] || { echo "Missing SAM template"; exit 1; }

IDENTITY=$(aws_text sts get-caller-identity --query Account) && ACCOUNT_ID="$IDENTITY"

read -r SUBNET_A SUBNET_B FARGATE_SG < <(
  python - "$VPC_FILE" <<'PY'
import json, sys
vpc = json.load(open(sys.argv[1], encoding="utf-8"))
print(vpc["subnets"]["privateA"]["id"], vpc["subnets"]["privateB"]["id"], vpc["securityGroups"]["fargate"])
PY
)

QUEUE_URL=""
if [[ -f "$SQS_RESULT" ]]; then
  QUEUE_URL=$(python - "$SQS_RESULT" <<'PY'
import json, sys
print(json.load(open(sys.argv[1], encoding="utf-8"))["completionQueue"]["queueUrl"])
PY
)
fi
if [[ -z "$QUEUE_URL" ]]; then
  QUEUE_URL=$(aws_text sqs get-queue-url --queue-name "$COMPLETION_QUEUE" --region "$REGION" --query QueueUrl) || true
fi
[[ -n "$QUEUE_URL" ]] || { echo "Completion queue not found — run Night 13"; exit 1; }

TOPIC_ARN=""
if [[ -f "$SNS_RESULT" ]]; then
  TOPIC_ARN=$(python - "$SNS_RESULT" <<'PY'
import json, sys
print(json.load(open(sys.argv[1], encoding="utf-8"))["snsTopic"]["topicArn"])
PY
)
fi
if [[ -z "$TOPIC_ARN" ]]; then
  TOPIC_ARN="arn:aws:sns:${REGION}:${ACCOUNT_ID}:${ALERTS_TOPIC}"
  aws_text sns get-topic-attributes --topic-arn "$TOPIC_ARN" --region "$REGION" --query 'Attributes.TopicArn' >/dev/null || {
    echo "SNS topic not found — run Night 14"; exit 1
  }
fi

STATS_ARN=$(aws_text lambda get-function --function-name "$STATS_FUNCTION" --region "$REGION" --query 'Configuration.FunctionArn') || {
  echo "WARN: Lambda $STATS_FUNCTION not found — Night 17 required for invoke step"
  STATS_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${STATS_FUNCTION}"
}

EXEC_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ECS_EXEC_ROLE}"
TASK_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ECS_TASK_ROLE}"
for ROLE_ARN in "$EXEC_ROLE_ARN" "$TASK_ROLE_ARN"; do
  ROLE_NAME="${ROLE_ARN##*/}"
  aws_text iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' >/dev/null || {
    echo "IAM role $ROLE_NAME not found"; exit 1
  }
done

echo "=== Night 32 Lab 4C — Step Functions capstone ==="
echo "SAM directory: $SAM_DIR"

# Remove failed stack from prior attempt if present
if aws_text cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' 2>/dev/null | grep -q ROLLBACK; then
  echo "Deleting rolled-back stack $STACK_NAME ..."
  aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION" || true
fi

pushd "$SAM_DIR" >/dev/null
sam build
sam deploy --no-confirm-changeset --no-fail-on-empty-changeset \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    "StudyPrefix=${PREFIX}" \
    "ClusterName=${CLUSTER}" \
    "TaskDefinitionFamily=${TASK_FAMILY}" \
    "PrivateSubnetA=${SUBNET_A}" \
    "PrivateSubnetB=${SUBNET_B}" \
    "FargateSecurityGroupId=${FARGATE_SG}" \
    "CompletionQueueUrl=${QUEUE_URL}" \
    "AlertsTopicArn=${TOPIC_ARN}" \
    "StatsUploaderFunctionArn=${STATS_ARN}" \
    "EcsExecutionRoleArn=${EXEC_ROLE_ARN}" \
    "EcsTaskRoleArn=${TASK_ROLE_ARN}"
popd >/dev/null

SM_ARN=$(aws_text stepfunctions describe-state-machine \
  --state-machine-arn "arn:aws:states:${REGION}:${ACCOUNT_ID}:stateMachine:${STATE_MACHINE_NAME}" \
  --region "$REGION" --query stateMachineArn) || true
if [[ -z "$SM_ARN" ]]; then
  SM_ARN=$(aws_text cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue")
fi

LEGACY_DISABLED=false
if [[ "$KEEP_LEGACY" == false ]]; then
  set_rule_enabled "$LEGACY_RULE" false && LEGACY_DISABLED=true
else
  echo "Keeping legacy rule $LEGACY_RULE unchanged"
fi

SUCCESS_DISABLED=false
if [[ "$DISABLE_SUCCESS" == true ]]; then
  set_rule_enabled "$SUCCESS_RULE" false && SUCCESS_DISABLED=true
fi

EXECUTION_ARN=""
EXECUTION_STATUS=""
if [[ "$TEST_START" == true ]]; then
  [[ -n "$SM_ARN" ]] || { echo "State machine ARN missing"; exit 1; }
  echo "WARNING: Starting execution — runs real Iceland Fargate task"
  NAME="night32-test-$(date +%s)"
  EXECUTION_ARN=$(aws stepfunctions start-execution --state-machine-arn "$SM_ARN" --name "$NAME" --region "$REGION" --query executionArn --output text)
  EXECUTION_STATUS=STARTED
  echo "Started execution: $EXECUTION_ARN"
fi

python - "$RESULT_FILE" <<PY
import json
from datetime import datetime, timezone
data = {
    "night": 32,
    "region": "$REGION",
    "lab": "$TAG_LAB",
    "stackName": "$STACK_NAME",
    "stateMachineName": "$STATE_MACHINE_NAME",
    "stateMachineArn": "$SM_ARN",
    "scheduleRule": "$SCHEDULE_RULE",
    "legacyRule": "$LEGACY_RULE",
    "legacyRuleDisabled": $( [[ "$LEGACY_DISABLED" == true ]] && echo true || echo false ),
    "successRule": "$SUCCESS_RULE",
    "successRuleDisabled": $( [[ "$SUCCESS_DISABLED" == true ]] && echo true || echo false ),
    "completionQueueUrl": "$QUEUE_URL",
    "alertsTopicArn": "$TOPIC_ARN",
    "statsUploaderArn": "$STATS_ARN",
    "ecsExecutionRoleArn": "$EXEC_ROLE_ARN",
    "ecsTaskRoleArn": "$TASK_ROLE_ARN",
    "subnets": ["$SUBNET_A", "$SUBNET_B"],
    "fargateSecurityGroupId": "$FARGATE_SG",
    "testExecutionArn": "$EXECUTION_ARN",
    "testExecutionStatus": "$EXECUTION_STATUS",
    "createdAt": datetime.now(timezone.utc).isoformat(),
}
with open("$RESULT_FILE", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY

echo "Wrote $RESULT_FILE"
echo "Teardown: bash HTML/study-lab/night-32-lab-stepfunctions-teardown.sh"

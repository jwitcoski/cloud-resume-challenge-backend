#!/usr/bin/env bash
# Night 13 Lab 2C — SQS completion queue + DLQ + EventBridge ECS success → SQS
# Run from repo: bash HTML/study-lab/night-13-lab-sqs-setup.sh
#
# Prerequisites: Night 9 VPC (optional for this lab); Night 12 or Night 10 Iceland task for E2E test
# Options:
#   --test-message   send a synthetic completion message to the queue

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
CLUSTER=globalskiatlas-backend-k8s
TASK_FAMILY=globalskiatlas-backend-k8s-iceland
MAIN_QUEUE="${PREFIX}-iceland-completion"
DLQ_QUEUE="${PREFIX}-iceland-completion-dlq"
RULE_NAME="${PREFIX}-iceland-success-to-sqs"
VISIBILITY_TIMEOUT=60
MAX_RECEIVE_COUNT=3

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-13-sqs-result.json"
POLICY_TEMPLATE="${SCRIPT_DIR}/sqs-completion-queue-policy.json"

TEST_MESSAGE=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --test-message) TEST_MESSAGE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

CLUSTER_ARN="arn:aws:ecs:${REGION}:${ACCOUNT_ID}:cluster/${CLUSTER}"
TASK_DEF_ARN=$(aws ecs describe-task-definition \
  --task-definition "$TASK_FAMILY" --region "$REGION" \
  --query 'taskDefinition.taskDefinitionArn' --output text)
TASK_DEF_PREFIX="arn:aws:ecs:${REGION}:${ACCOUNT_ID}:task-definition/${TASK_FAMILY}"

echo "=== Night 13 Lab 2C — SQS decoupling ==="
echo "Main queue:   $MAIN_QUEUE"
echo "DLQ:          $DLQ_QUEUE"
echo "Rule:         $RULE_NAME"
echo "Task def:     $TASK_DEF_ARN"
echo ""

# --- DLQ ---
DLQ_URL=$(aws sqs get-queue-url --queue-name "$DLQ_QUEUE" --region "$REGION" \
  --query 'QueueUrl' --output text 2>/dev/null || true)
if [[ -z "$DLQ_URL" ]]; then
  echo "Creating DLQ $DLQ_QUEUE ..."
  DLQ_URL=$(aws sqs create-queue \
    --queue-name "$DLQ_QUEUE" \
    --attributes MessageRetentionPeriod=1209600 \
    --region "$REGION" \
    --query 'QueueUrl' --output text)
else
  echo "DLQ $DLQ_QUEUE already exists."
fi
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn \
  --region "$REGION" --query 'Attributes.QueueArn' --output text)

# --- Main queue with redrive ---
MAIN_URL=$(aws sqs get-queue-url --queue-name "$MAIN_QUEUE" --region "$REGION" \
  --query 'QueueUrl' --output text 2>/dev/null || true)
REDRIVE_POLICY=$(jq -n --arg arn "$DLQ_ARN" --argjson count "$MAX_RECEIVE_COUNT" \
  '{deadLetterTargetArn: $arn, maxReceiveCount: ($count|tostring)}')
if [[ -z "$MAIN_URL" ]]; then
  echo "Creating main queue $MAIN_QUEUE ..."
  MAIN_URL=$(aws sqs create-queue \
    --queue-name "$MAIN_QUEUE" \
    --attributes "VisibilityTimeout=${VISIBILITY_TIMEOUT},MessageRetentionPeriod=345600,RedrivePolicy=${REDRIVE_POLICY}" \
    --region "$REGION" \
    --query 'QueueUrl' --output text)
else
  echo "Updating main queue $MAIN_QUEUE redrive policy ..."
  aws sqs set-queue-attributes \
    --queue-url "$MAIN_URL" \
    --attributes "VisibilityTimeout=${VISIBILITY_TIMEOUT},RedrivePolicy=${REDRIVE_POLICY}" \
    --region "$REGION"
fi
MAIN_ARN=$(aws sqs get-queue-attributes --queue-url "$MAIN_URL" --attribute-names QueueArn \
  --region "$REGION" --query 'Attributes.QueueArn' --output text)

# --- EventBridge rule (ECS task success) ---
EVENT_PATTERN=$(jq -n \
  --arg cluster "$CLUSTER_ARN" \
  --arg prefix "$TASK_DEF_PREFIX" \
  '{
    source: ["aws.ecs"],
    "detail-type": ["ECS Task State Change"],
    detail: {
      lastStatus: ["STOPPED"],
      stopCode: ["EssentialContainerExited"],
      clusterArn: [$cluster],
      taskDefinitionArn: [{ prefix: $prefix }],
      containers: { exitCode: [0] }
    }
  }')

PATTERN_FILE=$(mktemp)
trap 'rm -f "$PATTERN_FILE"' EXIT
echo "$EVENT_PATTERN" > "$PATTERN_FILE"

if aws events describe-rule --name "$RULE_NAME" --region "$REGION" &>/dev/null; then
  echo "Updating rule $RULE_NAME ..."
  aws events put-rule \
    --name "$RULE_NAME" \
    --event-pattern "file://${PATTERN_FILE}" \
    --state ENABLED \
    --description "Iceland pipeline success → SQS completion queue (study lab)" \
    --region "$REGION" >/dev/null
else
  echo "Creating rule $RULE_NAME ..."
  aws events put-rule \
    --name "$RULE_NAME" \
    --event-pattern "file://${PATTERN_FILE}" \
    --state ENABLED \
    --description "Iceland pipeline success → SQS completion queue (study lab)" \
    --region "$REGION" >/dev/null
fi

RULE_ARN="arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}"

# --- Queue policy for EventBridge ---
POLICY_DOC=$(sed -e "s|QUEUE_ARN_PLACEHOLDER|${MAIN_ARN}|g" \
  -e "s|RULE_ARN_PLACEHOLDER|${RULE_ARN}|g" "$POLICY_TEMPLATE")
POLICY_ESCAPED=$(echo "$POLICY_DOC" | jq -c .)
aws sqs set-queue-attributes \
  --queue-url "$MAIN_URL" \
  --attributes "Policy=${POLICY_ESCAPED}" \
  --region "$REGION"

# --- SQS target ---
TARGETS_FILE=$(mktemp)
trap 'rm -f "$PATTERN_FILE" "$TARGETS_FILE"' EXIT
jq -n \
  --arg id "iceland-completion-sqs" \
  --arg arn "$MAIN_ARN" \
  '[{
    Id: $id,
    Arn: $arn
  }]' > "$TARGETS_FILE"

echo "Attaching SQS target ..."
aws events put-targets \
  --rule "$RULE_NAME" \
  --region "$REGION" \
  --targets "file://${TARGETS_FILE}" \
  >/dev/null

if [[ "$TEST_MESSAGE" == "true" ]]; then
  BODY=$(jq -n \
    --arg task "arn:aws:ecs:${REGION}:${ACCOUNT_ID}:task/${CLUSTER}/night13-test" \
    --arg bucket "globalskiatlas-backend-k8s-output" \
  '{
    source: "night-13-lab-sqs-setup",
    detail: {
      taskArn: $task,
      lastStatus: "STOPPED",
      containers: [{ name: "iceland", exitCode: 0 }],
      overrides: { s3Bucket: $bucket, s3Prefix: "iceland/2026-06/" }
    }
  }')
  aws sqs send-message --queue-url "$MAIN_URL" --message-body "$BODY" --region "$REGION" >/dev/null
  echo "Sent test message to $MAIN_QUEUE"
fi

ATTRS=$(aws sqs get-queue-attributes --queue-url "$MAIN_URL" \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible \
  --region "$REGION" --output json)

cat > "$RESULT_FILE" <<EOF
{
  "lab": "night-13-lab2c-sqs-decoupling",
  "region": "$REGION",
  "completedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "queues": {
    "main": { "name": "$MAIN_QUEUE", "url": "$MAIN_URL", "arn": "$MAIN_ARN" },
    "dlq": { "name": "$DLQ_QUEUE", "url": "$DLQ_URL", "arn": "$DLQ_ARN" },
    "visibilityTimeout": $VISIBILITY_TIMEOUT,
    "maxReceiveCount": $MAX_RECEIVE_COUNT
  },
  "eventBridge": {
    "ruleName": "$RULE_NAME",
    "ruleArn": "$RULE_ARN",
    "target": "SQS $MAIN_QUEUE",
    "eventPattern": "ECS Task State Change STOPPED exit 0 Iceland task family"
  },
  "queueAttributes": $ATTRS,
  "verify": {
    "queueDepth": "aws sqs get-queue-attributes --queue-url $MAIN_URL --attribute-names ApproximateNumberOfMessages --region $REGION",
    "consume": "bash HTML/study-lab/night-13-lab-sqs-consumer.sh",
    "e2e": "Run Iceland (Night 10/12 TestFire) then consume message",
    "teardown": "bash HTML/study-lab/night-13-lab-sqs-teardown.sh"
  }
}
EOF

echo ""
echo "Result written to $RESULT_FILE"
echo ""
echo "=== Night 13 lab setup complete ==="
echo "Queue URL: $MAIN_URL"
echo "Messages waiting: $(echo "$ATTRS" | jq -r '.Attributes.ApproximateNumberOfMessages')"
echo ""
echo "Next steps:"
echo "  bash HTML/study-lab/night-13-lab-sqs-consumer.sh"
echo "  bash HTML/study-lab/night-13-lab-sqs-setup.sh --test-message   # synthetic message"
echo "  Night 12 TestFire → wait for exit 0 → consumer again"
echo ""
echo "Teardown: bash HTML/study-lab/night-13-lab-sqs-teardown.sh"

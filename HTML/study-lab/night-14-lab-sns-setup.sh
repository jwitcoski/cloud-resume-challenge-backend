#!/usr/bin/env bash
# Night 14 Lab 2C part 2 — SNS fan-out (failure alerts + SQS subscriber + alarm action)
# Run from repo: bash HTML/study-lab/night-14-lab-sns-setup.sh
#
# Options:
#   --email you@example.com   subscribe email (confirm in inbox)
#   --test-publish            publish synthetic alert to topic

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
CLUSTER=globalskiatlas-backend-k8s
TASK_FAMILY=globalskiatlas-backend-k8s-iceland
TOPIC_NAME="${PREFIX}-iceland-alerts"
INBOX_QUEUE="${PREFIX}-iceland-alerts-inbox"
FAILURE_RULE="${PREFIX}-iceland-failure-to-sns"
SCHEDULE_RULE="${PREFIX}-iceland-monthly"
ALARM_NAME="${PREFIX}-iceland-task-failed"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-14-sns-result.json"
TOPIC_POLICY_TEMPLATE="${SCRIPT_DIR}/sns-iceland-alerts-topic-policy.json"
QUEUE_POLICY_TEMPLATE="${SCRIPT_DIR}/sns-sqs-subscriber-policy.json"

EMAIL=""
TEST_PUBLISH=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email) EMAIL="$2"; shift 2 ;;
    --test-publish) TEST_PUBLISH=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

CLUSTER_ARN="arn:aws:ecs:${REGION}:${ACCOUNT_ID}:cluster/${CLUSTER}"
TASK_DEF_PREFIX="arn:aws:ecs:${REGION}:${ACCOUNT_ID}:task-definition/${TASK_FAMILY}"

echo "=== Night 14 Lab 2C part 2 — SNS fan-out ==="
echo "Topic:        $TOPIC_NAME"
echo "Inbox queue:  $INBOX_QUEUE"
echo "Failure rule: $FAILURE_RULE"
echo ""

TOPIC_ARN=$(aws sns list-topics --region "$REGION" \
  --query "Topics[?contains(TopicArn, '${TOPIC_NAME}')].TopicArn" --output text 2>/dev/null || true)
if [[ -z "$TOPIC_ARN" ]]; then
  echo "Creating SNS topic $TOPIC_NAME ..."
  TOPIC_ARN=$(aws sns create-topic --name "$TOPIC_NAME" --region "$REGION" --query 'TopicArn' --output text)
else
  echo "SNS topic $TOPIC_NAME already exists."
fi

INBOX_URL=$(aws sqs get-queue-url --queue-name "$INBOX_QUEUE" --region "$REGION" \
  --query 'QueueUrl' --output text 2>/dev/null || true)
if [[ -z "$INBOX_URL" ]]; then
  echo "Creating inbox queue $INBOX_QUEUE ..."
  INBOX_URL=$(aws sqs create-queue --queue-name "$INBOX_QUEUE" \
    --attributes MessageRetentionPeriod=345600 --region "$REGION" --query 'QueueUrl' --output text)
else
  echo "Inbox queue $INBOX_QUEUE already exists."
fi
INBOX_ARN=$(aws sqs get-queue-attributes --queue-url "$INBOX_URL" --attribute-names QueueArn \
  --region "$REGION" --query 'Attributes.QueueArn' --output text)

QUEUE_POLICY=$(sed -e "s|QUEUE_ARN_PLACEHOLDER|${INBOX_ARN}|g" \
  -e "s|TOPIC_ARN_PLACEHOLDER|${TOPIC_ARN}|g" "$QUEUE_POLICY_TEMPLATE")
QUEUE_POLICY_ESCAPED=$(echo "$QUEUE_POLICY" | jq -c .)
aws sqs set-queue-attributes --queue-url "$INBOX_URL" \
  --attributes "Policy=${QUEUE_POLICY_ESCAPED}" --region "$REGION"
echo "Inbox queue policy applied."

EXISTING_SUB=$(aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" --region "$REGION" \
  --query "Subscriptions[?Endpoint=='${INBOX_ARN}'].SubscriptionArn" --output text 2>/dev/null || true)
if [[ -n "$EXISTING_SUB" && "$EXISTING_SUB" != "None" && "$EXISTING_SUB" != Pending* ]]; then
  echo "SQS inbox subscription already confirmed."
  SQS_SUB_ARN="$EXISTING_SUB"
else
  SQS_SUB_ARN=$(aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs \
    --notification-endpoint "$INBOX_ARN" --region "$REGION" --query 'SubscriptionArn' --output text)
  echo "SQS inbox subscription: $SQS_SUB_ARN"
fi

EMAIL_SUB_ARN=""
if [[ -n "$EMAIL" ]]; then
  EMAIL_SUB_ARN=$(aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email \
    --notification-endpoint "$EMAIL" --region "$REGION" --query 'SubscriptionArn' --output text)
  echo "Email subscription pending confirmation for $EMAIL — check inbox."
fi

FAILURE_RULE_ARN="arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${FAILURE_RULE}"
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
      containers: { exitCode: [{ "anything-but": [0] }] }
    }
  }')

PATTERN_FILE=$(mktemp)
trap 'rm -f "$PATTERN_FILE" "$TARGETS_FILE"' EXIT
echo "$EVENT_PATTERN" > "$PATTERN_FILE"

aws events put-rule --name "$FAILURE_RULE" \
  --event-pattern "file://${PATTERN_FILE}" \
  --state ENABLED \
  --description "Iceland non-zero exit → SNS study lab" \
  --region "$REGION" >/dev/null
echo "Failure rule $FAILURE_RULE ready."

TOPIC_POLICY=$(sed -e "s|TOPIC_ARN_PLACEHOLDER|${TOPIC_ARN}|g" \
  -e "s|RULE_ARN_PLACEHOLDER|${FAILURE_RULE_ARN}|g" "$TOPIC_POLICY_TEMPLATE")
TOPIC_POLICY_ESCAPED=$(echo "$TOPIC_POLICY" | jq -c .)
aws sns set-topic-attributes --topic-arn "$TOPIC_ARN" --attribute-name Policy \
  --attribute-value "$TOPIC_POLICY_ESCAPED" --region "$REGION" >/dev/null
echo "SNS topic policy applied."

TARGETS_FILE=$(mktemp)
jq -n --arg id "iceland-failure-sns" --arg arn "$TOPIC_ARN" \
  '[{ Id: $id, Arn: $arn }]' > "$TARGETS_FILE"
aws events put-targets --rule "$FAILURE_RULE" --region "$REGION" \
  --targets "file://${TARGETS_FILE}" >/dev/null
echo "SNS target attached to failure rule."

ALARM_EXISTS=$(aws cloudwatch describe-alarms --alarm-names "$ALARM_NAME" --region "$REGION" \
  --query 'MetricAlarms[0].AlarmName' --output text 2>/dev/null || true)
if [[ -n "$ALARM_EXISTS" && "$ALARM_EXISTS" != "None" ]]; then
  aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "Night 12 EventBridge failed invocations (+ Night 14 SNS)" \
    --metric-name FailedInvocations --namespace AWS/Events --statistic Sum \
    --period 300 --evaluation-periods 1 --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions "Name=RuleName,Value=${SCHEDULE_RULE}" \
    --treat-missing-data notBreaching \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" >/dev/null
  echo "CloudWatch alarm $ALARM_NAME now publishes to SNS."
else
  echo "Alarm $ALARM_NAME not found — run Night 12 setup first."
fi

if [[ "$TEST_PUBLISH" == "true" ]]; then
  MSG=$(jq -n \
    --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{ alert: "night-14-test", pipeline: "iceland", severity: "test",
       message: "Synthetic failure alert from night-14-lab-sns-setup", timestamp: $ts }')
  aws sns publish --topic-arn "$TOPIC_ARN" --message "$MSG" --region "$REGION" >/dev/null
  echo "Published test message to SNS topic."
fi

SUBS=$(aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" --region "$REGION" --output json)
DEPTH=$(aws sqs get-queue-attributes --queue-url "$INBOX_URL" \
  --attribute-names ApproximateNumberOfMessages --region "$REGION" \
  --query 'Attributes.ApproximateNumberOfMessages' --output text)

cat > "$RESULT_FILE" <<EOF
{
  "lab": "night-14-lab2c-sns-fanout",
  "region": "$REGION",
  "completedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "sns": {
    "topicName": "$TOPIC_NAME",
    "topicArn": "$TOPIC_ARN",
    "subscriptions": $(echo "$SUBS" | jq '.Subscriptions')
  },
  "sqsInbox": {
    "name": "$INBOX_QUEUE",
    "url": "$INBOX_URL",
    "arn": "$INBOX_ARN",
    "approximateMessages": "$DEPTH"
  },
  "eventBridge": {
    "failureRuleName": "$FAILURE_RULE",
    "failureRuleArn": "$FAILURE_RULE_ARN",
    "pattern": "ECS STOPPED exitCode != 0 Iceland task family"
  },
  "cloudWatch": { "alarmName": "$ALARM_NAME", "alarmActionTopic": "$TOPIC_ARN" },
  "verify": {
    "inbox": "bash HTML/study-lab/night-14-lab-sns-inbox.sh",
    "teardown": "bash HTML/study-lab/night-14-lab-sns-teardown.sh"
  }
}
EOF

echo ""
echo "Result written to $RESULT_FILE"
echo "Inbox messages waiting: $DEPTH"
echo ""
echo "Next: bash HTML/study-lab/night-14-lab-sns-inbox.sh"
echo "Teardown: bash HTML/study-lab/night-14-lab-sns-teardown.sh"

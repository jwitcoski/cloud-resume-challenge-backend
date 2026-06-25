#!/usr/bin/env bash
# Night 14 teardown — SNS topic, subscriptions, inbox queue, failure rule
# Run: bash HTML/study-lab/night-14-lab-sns-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
TOPIC_NAME="${PREFIX}-iceland-alerts"
INBOX_QUEUE="${PREFIX}-iceland-alerts-inbox"
FAILURE_RULE="${PREFIX}-iceland-failure-to-sns"
SCHEDULE_RULE="${PREFIX}-iceland-monthly"
ALARM_NAME="${PREFIX}-iceland-task-failed"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-14-sns-result.json"

echo "=== Night 14 teardown ==="

TOPIC_ARN=$(aws sns list-topics --region "$REGION" \
  --query "Topics[?contains(TopicArn, '${TOPIC_NAME}')].TopicArn" --output text 2>/dev/null || true)
if [[ -n "$TOPIC_ARN" ]]; then
  SUBS=$(aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" --region "$REGION" \
    --query 'Subscriptions[*].SubscriptionArn' --output text 2>/dev/null || true)
  if [[ -n "$SUBS" && "$SUBS" != "None" ]]; then
    for sub in $SUBS; do
      if [[ "$sub" != Pending* ]]; then
        aws sns unsubscribe --subscription-arn "$sub" --region "$REGION" 2>/dev/null || true
      fi
    done
  fi
  aws sns delete-topic --topic-arn "$TOPIC_ARN" --region "$REGION" 2>/dev/null || true
  echo "Deleted SNS topic $TOPIC_NAME"
fi

TARGET_IDS=$(aws events list-targets-by-rule --rule "$FAILURE_RULE" --region "$REGION" \
  --query 'Targets[*].Id' --output text 2>/dev/null || true)
if [[ -n "$TARGET_IDS" && "$TARGET_IDS" != "None" ]]; then
  aws events remove-targets --rule "$FAILURE_RULE" --ids $TARGET_IDS --region "$REGION" 2>/dev/null || true
fi
aws events delete-rule --name "$FAILURE_RULE" --region "$REGION" 2>/dev/null || true
echo "Removed failure rule $FAILURE_RULE"

INBOX_URL=$(aws sqs get-queue-url --queue-name "$INBOX_QUEUE" --region "$REGION" \
  --query 'QueueUrl' --output text 2>/dev/null || true)
if [[ -n "$INBOX_URL" ]]; then
  aws sqs purge-queue --queue-url "$INBOX_URL" --region "$REGION" 2>/dev/null || true
  sleep 2
  aws sqs delete-queue --queue-url "$INBOX_URL" --region "$REGION" 2>/dev/null || true
  echo "Deleted inbox queue $INBOX_QUEUE"
fi

ALARM_EXISTS=$(aws cloudwatch describe-alarms --alarm-names "$ALARM_NAME" --region "$REGION" \
  --query 'MetricAlarms[0].AlarmName' --output text 2>/dev/null || true)
if [[ -n "$ALARM_EXISTS" && "$ALARM_EXISTS" != "None" ]]; then
  aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "Night 12 EventBridge failed invocations for Iceland schedule" \
    --metric-name FailedInvocations --namespace AWS/Events --statistic Sum \
    --period 300 --evaluation-periods 1 --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions "Name=RuleName,Value=${SCHEDULE_RULE}" \
    --treat-missing-data notBreaching \
    --region "$REGION" >/dev/null 2>&1 || true
  echo "Restored alarm $ALARM_NAME without SNS actions."
fi

rm -f "$RESULT_FILE"
echo "Night 14 SNS resources removed. Night 12/13 unchanged."

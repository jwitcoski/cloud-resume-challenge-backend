#!/usr/bin/env bash
# Night 28 Lab — Read-only audit of GSA integration stack (Nights 12–14)
# Run: bash HTML/study-lab/night-28-lab-integration-audit.sh
# Options: --print-decision-tree

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PRINT_TREE=0
if [[ "${1:-}" == "--print-decision-tree" ]]; then PRINT_TREE=1; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-28-integration-result.json"

STUDY_RULES=(
  saa-study-gsa-iceland-monthly
  saa-study-gsa-iceland-success-to-sqs
  saa-study-gsa-iceland-failure-to-sns
)
STUDY_QUEUES=(
  saa-study-gsa-iceland-completion
  saa-study-gsa-iceland-completion-dlq
  saa-study-gsa-iceland-alerts-inbox
)
STUDY_TOPICS=(saa-study-gsa-iceland-alerts)
STUDY_ALARMS=(saa-study-gsa-iceland-task-failed)

aws_text() {
  aws "$@" --output text 2>/dev/null || true
}

print_decision_tree() {
  echo ""
  echo "=== Integration decision tree (Night 28) ==="
  echo "Schedule or route AWS events     -> EventBridge"
  echo "Buffer work — workers pull       -> SQS"
  echo "Notify many subscribers — push   -> SNS"
  echo "High-volume stream + replay      -> Kinesis Data Streams"
  echo "Stream to S3 without consumers   -> Kinesis Data Firehose"
  echo "Multi-step retry/Catch workflow  -> Step Functions"
  echo "GraphQL + live subscriptions     -> AppSync"
  echo ""
  echo "See gsa-integration-map.md for GSA Nights 12–14 wiring."
}

echo "Night 28 integration audit — region ${REGION} (read-only)"
ACCOUNT="$(aws_text sts get-caller-identity --query Account)"
if [[ -z "${ACCOUNT}" ]]; then
  echo "aws sts get-caller-identity failed — configure AWS CLI" >&2
  exit 1
fi
echo "Account: ${ACCOUNT}"

FOUND=0
TOTAL=0

RULE_JSON="["
QUEUE_JSON="["
TOPIC_JSON="["
ALARM_JSON="["

first_rule=1 first_queue=1 first_topic=1 first_alarm=1

echo ""
echo "=== EventBridge rules ==="
for name in "${STUDY_RULES[@]}"; do
  TOTAL=$((TOTAL + 1))
  arn="$(aws_text events describe-rule --name "${name}" --region "${REGION}" --query Arn)"
  if [[ -n "${arn}" ]]; then
    FOUND=$((FOUND + 1))
    schedule="$(aws_text events describe-rule --name "${name}" --region "${REGION}" --query ScheduleExpression)"
    echo "[FOUND] ${name}"
    [[ -n "${schedule}" && "${schedule}" != "None" ]] && echo "  schedule: ${schedule}"
    [[ $first_rule -eq 0 ]] && RULE_JSON+=","
    first_rule=0
    RULE_JSON+="$(jq -n --arg n "${name}" --arg a "${arn}" --arg s "${schedule:-}" '{found:true,name:$n,arn:$a,scheduleExpression:($s|select(. != "" and . != "None")),pattern:"EventBridge schedule or event rule"}')"
  else
    echo "[MISSING] ${name}"
    [[ $first_rule -eq 0 ]] && RULE_JSON+=","
    first_rule=0
    RULE_JSON+="$(jq -n --arg n "${name}" '{found:false,name:$n,pattern:"EventBridge schedule or event rule"}')"
  fi
done

echo ""
echo "=== SQS queues ==="
for name in "${STUDY_QUEUES[@]}"; do
  TOTAL=$((TOTAL + 1))
  url="$(aws_text sqs get-queue-url --queue-name "${name}" --region "${REGION}" --query QueueUrl)"
  if [[ -n "${url}" ]]; then
    FOUND=$((FOUND + 1))
    qarn="$(aws_text sqs get-queue-attributes --queue-url "${url}" --attribute-names QueueArn --region "${REGION}" --query 'Attributes.QueueArn')"
    echo "[FOUND] ${name}"
    [[ $first_queue -eq 0 ]] && QUEUE_JSON+=","
    first_queue=0
    QUEUE_JSON+="$(jq -n --arg n "${name}" --arg u "${url}" --arg a "${qarn}" '{found:true,name:$n,queueUrl:$u,queueArn:$a,pattern:"SQS pull buffer / DLQ"}')"
  else
    echo "[MISSING] ${name}"
    [[ $first_queue -eq 0 ]] && QUEUE_JSON+=","
    first_queue=0
    QUEUE_JSON+="$(jq -n --arg n "${name}" '{found:false,name:$n,pattern:"SQS pull buffer / DLQ"}')"
  fi
done

echo ""
echo "=== SNS topics ==="
for name in "${STUDY_TOPICS[@]}"; do
  TOTAL=$((TOTAL + 1))
  tarn="$(aws_text sns list-topics --region "${REGION}" --query "Topics[?contains(TopicArn, '${name}')].TopicArn | [0]")"
  if [[ -n "${tarn}" && "${tarn}" != "None" ]]; then
    FOUND=$((FOUND + 1))
    protos="$(aws_text sns list-subscriptions-by-topic --topic-arn "${tarn}" --region "${REGION}" --query 'Subscriptions[*].Protocol' --output text || true)"
    echo "[FOUND] ${name}"
    [[ -n "${protos}" && "${protos}" != "None" ]] && echo "  subscriptions: ${protos}"
    [[ $first_topic -eq 0 ]] && TOPIC_JSON+=","
    first_topic=0
    TOPIC_JSON+="$(jq -n --arg n "${name}" --arg a "${tarn}" --arg p "${protos:-}" '{found:true,name:$n,topicArn:$a,subscriptionProtocols:($p|split(" ")|map(select(. != ""))),pattern:"SNS fan-out notifications"}')"
  else
    echo "[MISSING] ${name}"
    [[ $first_topic -eq 0 ]] && TOPIC_JSON+=","
    first_topic=0
    TOPIC_JSON+="$(jq -n --arg n "${name}" '{found:false,name:$n,pattern:"SNS fan-out notifications"}')"
  fi
done

echo ""
echo "=== CloudWatch alarms ==="
for name in "${STUDY_ALARMS[@]}"; do
  TOTAL=$((TOTAL + 1))
  aarn="$(aws_text cloudwatch describe-alarms --alarm-names "${name}" --region "${REGION}" --query 'MetricAlarms[0].AlarmArn')"
  if [[ -n "${aarn}" && "${aarn}" != "None" ]]; then
    FOUND=$((FOUND + 1))
    metric="$(aws_text cloudwatch describe-alarms --alarm-names "${name}" --region "${REGION}" --query 'MetricAlarms[0].MetricName')"
    echo "[FOUND] ${name}"
    [[ $first_alarm -eq 0 ]] && ALARM_JSON+=","
    first_alarm=0
    ALARM_JSON+="$(jq -n --arg n "${name}" --arg a "${aarn}" --arg m "${metric:-}" '{found:true,name:$n,alarmArn:$a,metricName:$m,pattern:"CloudWatch alarm → SNS on FailedInvocations"}')"
  else
    echo "[MISSING] ${name}"
    [[ $first_alarm -eq 0 ]] && ALARM_JSON+=","
    first_alarm=0
    ALARM_JSON+="$(jq -n --arg n "${name}" '{found:false,name:$n,pattern:"CloudWatch alarm → SNS on FailedInvocations"}')"
  fi
done

RULE_JSON+="]"
QUEUE_JSON+="]"
TOPIC_JSON+="]"
ALARM_JSON+="]"

echo ""
echo "Study resources found: ${FOUND}/${TOTAL}"
if [[ "${FOUND}" -lt "${TOTAL}" ]]; then
  echo "Missing resources — re-run Night 12/13/14 setup scripts as noted in night-28-integration-services.md"
fi

AUDITED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
jq -n \
  --arg lab "night-28-integration-audit" \
  --arg region "${REGION}" \
  --arg account "${ACCOUNT}" \
  --arg auditedAt "${AUDITED_AT}" \
  --argjson foundCount "${FOUND}" \
  --argjson totalCount "${TOTAL}" \
  --argjson eventBridgeRules "${RULE_JSON}" \
  --argjson sqsQueues "${QUEUE_JSON}" \
  --argjson snsTopics "${TOPIC_JSON}" \
  --argjson cloudWatchAlarms "${ALARM_JSON}" \
  '{lab:$lab,region:$region,account:$account,auditedAt:$auditedAt,foundCount:$foundCount,totalCount:$totalCount,eventBridgeRules:$eventBridgeRules,sqsQueues:$sqsQueues,snsTopics:$snsTopics,cloudWatchAlarms:$cloudWatchAlarms,teardown:null}' \
  > "${RESULT_FILE}"

echo ""
echo "Wrote ${RESULT_FILE}"

if [[ "${PRINT_TREE}" -eq 1 ]]; then print_decision_tree; fi

echo ""
echo "Next: draw Night 32 Step Functions capstone using gsa-integration-map.md, then take night-28-quiz.json."

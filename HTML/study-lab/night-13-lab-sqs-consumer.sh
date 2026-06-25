#!/usr/bin/env bash
# Night 13 — poll one message from Iceland completion queue (simulates downstream worker)
# Run: bash HTML/study-lab/night-13-lab-sqs-consumer.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
MAIN_QUEUE="${PREFIX}-iceland-completion"
WAIT_SECONDS=20

MAIN_URL=$(aws sqs get-queue-url --queue-name "$MAIN_QUEUE" --region "$REGION" \
  --query 'QueueUrl' --output text 2>/dev/null || true)
if [[ -z "$MAIN_URL" ]]; then
  echo "Queue $MAIN_QUEUE not found — run night-13-lab-sqs-setup.sh first."
  exit 1
fi

echo "=== Night 13 consumer — long poll ($WAIT_SECONDS s) on $MAIN_QUEUE ==="
RESP=$(aws sqs receive-message \
  --queue-url "$MAIN_URL" \
  --max-number-of-messages 1 \
  --wait-time-seconds "$WAIT_SECONDS" \
  --attribute-names All \
  --message-attribute-names All \
  --region "$REGION" \
  --output json)

COUNT=$(echo "$RESP" | jq '.Messages | length // 0')
if [[ "$COUNT" -eq 0 ]]; then
  echo "No messages received. Try --test-message on setup or run Iceland to completion."
  exit 0
fi

MSG=$(echo "$RESP" | jq '.Messages[0]')
BODY=$(echo "$MSG" | jq -r '.Body')
RECEIPT=$(echo "$MSG" | jq -r '.ReceiptHandle')
MSG_ID=$(echo "$MSG" | jq -r '.MessageId')

echo "MessageId: $MSG_ID"
echo "--- Body ---"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo "---"

aws sqs delete-message --queue-url "$MAIN_URL" --receipt-handle "$RECEIPT" --region "$REGION"
echo "Deleted message (simulated successful processing)."

DEPTH=$(aws sqs get-queue-attributes --queue-url "$MAIN_URL" \
  --attribute-names ApproximateNumberOfMessages \
  --region "$REGION" --query 'Attributes.ApproximateNumberOfMessages' --output text)
echo "ApproximateNumberOfMessages remaining: $DEPTH"

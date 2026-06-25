#!/usr/bin/env bash
# Night 14 — long poll one message from SNS→SQS fan-out inbox
# Run: bash HTML/study-lab/night-14-lab-sns-inbox.sh

set -euo pipefail
REGION=us-east-1
INBOX_QUEUE=saa-study-gsa-iceland-alerts-inbox
WAIT_SECONDS=20

URL=$(aws sqs get-queue-url --queue-name "$INBOX_QUEUE" --region "$REGION" \
  --query 'QueueUrl' --output text 2>/dev/null || true)
if [[ -z "$URL" ]]; then
  echo "Queue $INBOX_QUEUE not found — run night-14-lab-sns-setup.sh first."
  exit 1
fi

echo "=== Night 14 inbox — long poll (${WAIT_SECONDS}s) on $INBOX_QUEUE ==="
RESP=$(aws sqs receive-message --queue-url "$URL" --region "$REGION" \
  --max-number-of-messages 1 --wait-time-seconds "$WAIT_SECONDS" --output json)

COUNT=$(echo "$RESP" | jq '.Messages | length')
if [[ "$COUNT" -eq 0 ]]; then
  echo "No messages (try --test-publish on setup script, or wait for Iceland failure event)."
  exit 0
fi

BODY=$(echo "$RESP" | jq -r '.Messages[0].Body')
HANDLE=$(echo "$RESP" | jq -r '.Messages[0].ReceiptHandle')
echo ""
echo "--- Message body (SNS envelope) ---"
echo "$BODY"
echo ""
read -r -p "Delete message from inbox? [y/N] " DELETE
if [[ "$DELETE" == "y" || "$DELETE" == "Y" ]]; then
  aws sqs delete-message --queue-url "$URL" --receipt-handle "$HANDLE" --region "$REGION"
  echo "Message deleted."
else
  echo "Left on queue (visibility timeout will expire)."
fi

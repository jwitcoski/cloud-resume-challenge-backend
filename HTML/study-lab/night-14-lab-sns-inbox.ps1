# Night 14 — long poll one message from SNS→SQS fan-out inbox
# Run: .\HTML\study-lab\night-14-lab-sns-inbox.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$InboxQueue = 'saa-study-gsa-iceland-alerts-inbox'
$WaitSeconds = 20

$url = aws sqs get-queue-url --queue-name $InboxQueue --region $Region `
    --query 'QueueUrl' --output text 2>$null
if (-not $url -or $url -eq 'None') {
    Write-Error "Queue $InboxQueue not found - run night-14-lab-sns-setup.ps1 first."
}

Write-Host "=== Night 14 inbox — long poll (${WaitSeconds}s) on $InboxQueue ==="
$resp = aws sqs receive-message --queue-url $url --region $Region `
    --max-number-of-messages 1 --wait-time-seconds $WaitSeconds --output json | ConvertFrom-Json

if (-not $resp.Messages) {
    Write-Host 'No messages (try -TestPublish on setup script, or wait for Iceland failure event).'
    exit 0
}

$msg = $resp.Messages[0]
Write-Host ''
Write-Host '--- Message body (SNS envelope) ---'
Write-Host $msg.Body
Write-Host ''
Write-Host "--- ReceiptHandle (first 60 chars): $($msg.ReceiptHandle.Substring(0, [Math]::Min(60, $msg.ReceiptHandle.Length)))..."

$delete = Read-Host 'Delete message from inbox? [y/N]'
if ($delete -eq 'y' -or $delete -eq 'Y') {
    aws sqs delete-message --queue-url $url --receipt-handle $msg.ReceiptHandle --region $Region | Out-Null
    Write-Host 'Message deleted.'
} else {
    Write-Host 'Left on queue (visibility timeout will expire).'
}

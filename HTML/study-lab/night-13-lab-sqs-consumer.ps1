# Night 13 consumer - long poll one message from Iceland completion queue
# Run: .\HTML\study-lab\night-13-lab-sqs-consumer.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$MainQueue = 'saa-study-gsa-iceland-completion'
$WaitSeconds = 20

$mainUrl = aws sqs get-queue-url --queue-name $MainQueue --region $Region `
    --query 'QueueUrl' --output text 2>$null
if (-not $mainUrl) {
    Write-Error "Queue $MainQueue not found - run night-13-lab-sqs-setup.ps1 first."
}

Write-Host "=== Night 13 consumer - long poll (${WaitSeconds}s) on $MainQueue ==="
$respJson = aws sqs receive-message --queue-url $mainUrl `
    --max-number-of-messages 1 --wait-time-seconds $WaitSeconds `
    --attribute-names All --message-attribute-names All `
    --region $Region --output json
$resp = $respJson | ConvertFrom-Json

if (-not $resp.Messages) {
    Write-Host 'No messages received. Try -TestMessage on setup or run Iceland to completion.'
    exit 0
}

$msg = $resp.Messages[0]
Write-Host "MessageId: $($msg.MessageId)"
Write-Host '--- Body ---'
try {
    $msg.Body | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host $msg.Body
}
Write-Host '---'

aws sqs delete-message --queue-url $mainUrl --receipt-handle $msg.ReceiptHandle --region $Region | Out-Null
Write-Host 'Deleted message (simulated successful processing).'

$depth = aws sqs get-queue-attributes --queue-url $mainUrl `
    --attribute-names ApproximateNumberOfMessages --region $Region `
    --query 'Attributes.ApproximateNumberOfMessages' --output text
Write-Host "ApproximateNumberOfMessages remaining: $depth"

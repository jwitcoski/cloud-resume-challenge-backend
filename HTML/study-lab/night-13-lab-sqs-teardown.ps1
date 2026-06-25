# Night 13 teardown - SQS queues + EventBridge completion rule
# Run: .\HTML\study-lab\night-13-lab-sqs-teardown.ps1

$ErrorActionPreference = 'Continue'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'
$MainQueue = "$Prefix-iceland-completion"
$DlqQueue = "$Prefix-iceland-completion-dlq"
$RuleName = "$Prefix-iceland-success-to-sqs"

Write-Host '=== Night 13 teardown ==='

$targetIds = aws events list-targets-by-rule --rule $RuleName --region $Region `
    --query 'Targets[*].Id' --output text 2>$null
if ($targetIds -and $targetIds -ne 'None') {
    aws events remove-targets --rule $RuleName --ids $targetIds.Split() --region $Region 2>$null
}
aws events delete-rule --name $RuleName --region $Region 2>$null

function Remove-StudyQueue($Name) {
    try {
        $url = aws sqs get-queue-url --queue-name $Name --region $Region `
            --query 'QueueUrl' --output text 2>$null
        if (-not $url) {
            Write-Host "Queue $Name not found (skipped)"
            return
        }
        aws sqs purge-queue --queue-url $url --region $Region 2>$null
        Start-Sleep -Seconds 2
        aws sqs delete-queue --queue-url $url --region $Region 2>$null
        Write-Host "Deleted queue $Name"
    } catch {
        Write-Host "Could not delete $Name (may still be purging - retry in 60s)"
    }
}

Remove-StudyQueue $MainQueue
Remove-StudyQueue $DlqQueue

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$result = Join-Path $ScriptDir 'night-13-sqs-result.json'
if (Test-Path $result) { Remove-Item $result }

Write-Host 'Night 13 SQS resources removed. Night 12 schedule and Night 9 VPC unchanged.'

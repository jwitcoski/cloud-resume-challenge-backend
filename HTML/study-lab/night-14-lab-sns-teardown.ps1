# Night 14 teardown - SNS topic, subscriptions, inbox queue, failure rule
# Run: .\HTML\study-lab\night-14-lab-sns-teardown.ps1

$ErrorActionPreference = 'Continue'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'
$TopicName = "$Prefix-iceland-alerts"
$InboxQueue = "$Prefix-iceland-alerts-inbox"
$FailureRule = "$Prefix-iceland-failure-to-sns"
$ScheduleRule = "$Prefix-iceland-monthly"
$AlarmName = "$Prefix-iceland-task-failed"

Write-Host '=== Night 14 teardown ==='

$topicArn = aws sns list-topics --region $Region `
    --query "Topics[?contains(TopicArn, '$TopicName')].TopicArn" --output text 2>$null
if ($topicArn -and $topicArn -ne 'None') {
    $subs = aws sns list-subscriptions-by-topic --topic-arn $topicArn --region $Region `
        --query 'Subscriptions[*].SubscriptionArn' --output text 2>$null
    if ($subs -and $subs -ne 'None') {
        foreach ($sub in $subs.Split()) {
            if ($sub -notlike 'Pending*' -and $sub -ne 'None') {
                aws sns unsubscribe --subscription-arn $sub --region $Region 2>$null
            }
        }
    }
    aws sns delete-topic --topic-arn $topicArn --region $Region 2>$null
    Write-Host "Deleted SNS topic $TopicName"
}

$targetIds = aws events list-targets-by-rule --rule $FailureRule --region $Region `
    --query 'Targets[*].Id' --output text 2>$null
if ($targetIds -and $targetIds -ne 'None') {
    aws events remove-targets --rule $FailureRule --ids $targetIds.Split() --region $Region 2>$null
}
aws events delete-rule --name $FailureRule --region $Region 2>$null
Write-Host "Removed failure rule $FailureRule"

try {
    $inboxUrl = aws sqs get-queue-url --queue-name $InboxQueue --region $Region `
        --query 'QueueUrl' --output text 2>$null
    if ($inboxUrl -and $inboxUrl -ne 'None') {
        aws sqs purge-queue --queue-url $inboxUrl --region $Region 2>$null
        Start-Sleep -Seconds 2
        aws sqs delete-queue --queue-url $inboxUrl --region $Region 2>$null
        Write-Host "Deleted inbox queue $InboxQueue"
    }
} catch {
    Write-Host "Could not delete $InboxQueue (may still be purging - retry in 60s)"
}

$alarmExists = aws cloudwatch describe-alarms --alarm-names $AlarmName --region $Region `
    --query 'MetricAlarms[0].AlarmName' --output text 2>$null
if ($alarmExists -and $alarmExists -ne 'None') {
    aws cloudwatch put-metric-alarm --alarm-name $AlarmName `
        --alarm-description 'Night 12 EventBridge failed invocations for Iceland schedule' `
        --metric-name FailedInvocations --namespace AWS/Events --statistic Sum `
        --period 300 --evaluation-periods 1 --threshold 1 `
        --comparison-operator GreaterThanOrEqualToThreshold `
        --dimensions "Name=RuleName,Value=$ScheduleRule" `
        --treat-missing-data notBreaching `
        --region $Region 2>$null
    Write-Host "Restored alarm $AlarmName without SNS actions."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$result = Join-Path $ScriptDir 'night-14-sns-result.json'
if (Test-Path $result) { Remove-Item $result }

Write-Host 'Night 14 SNS resources removed. Night 12/13 unchanged.'

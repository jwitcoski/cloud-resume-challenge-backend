# Night 14 Lab 2C part 2 - SNS fan-out (failure alerts + SQS subscriber + alarm action)
# Run: .\HTML\study-lab\night-14-lab-sns-setup.ps1
# Options: -Email you@example.com  -TestPublish

param(
    [string]$Email = '',
    [switch]$TestPublish
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$Cluster = 'globalskiatlas-backend-k8s'
$TaskFamily = 'globalskiatlas-backend-k8s-iceland'
$TopicName = "$Prefix-iceland-alerts"
$InboxQueue = "$Prefix-iceland-alerts-inbox"
$FailureRule = "$Prefix-iceland-failure-to-sns"
$ScheduleRule = "$Prefix-iceland-monthly"
$AlarmName = "$Prefix-iceland-task-failed"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-14-sns-result.json'
$TopicPolicyTemplate = Join-Path $ScriptDir 'sns-iceland-alerts-topic-policy.json'
$QueuePolicyTemplate = Join-Path $ScriptDir 'sns-sqs-subscriber-policy.json'
$TmpDir = Join-Path $env:TEMP 'night14'
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

$ClusterArn = "arn:aws:ecs:${Region}:${AccountId}:cluster/${Cluster}"
$TaskDefPrefix = "arn:aws:ecs:${Region}:${AccountId}:task-definition/${TaskFamily}"

Write-Host '=== Night 14 Lab 2C part 2 - SNS fan-out ==='
Write-Host "Topic:        $TopicName"
Write-Host "Inbox queue:  $InboxQueue"
Write-Host "Failure rule: $FailureRule"
Write-Host ''

# --- SNS topic ---
$topicArn = aws sns list-topics --region $Region --query "Topics[?contains(TopicArn, '$TopicName')].TopicArn" --output text 2>$null
if (-not $topicArn -or $topicArn -eq 'None') {
    Write-Host "Creating SNS topic $TopicName ..."
    $topicArn = aws sns create-topic --name $TopicName --region $Region --query 'TopicArn' --output text
} else {
    Write-Host "SNS topic $TopicName already exists."
}

# --- SQS inbox (SNS subscriber) ---
function Get-QueueUrl($Name) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $url = aws sqs get-queue-url --queue-name $Name --region $Region `
        --query 'QueueUrl' --output text 2>$null
    $ErrorActionPreference = $prev
    if ($url -and $url -ne 'None') { return $url }
    return $null
}

$inboxUrl = Get-QueueUrl $InboxQueue
if (-not $inboxUrl) {
    Write-Host "Creating inbox queue $InboxQueue ..."
    $inboxUrl = aws sqs create-queue --queue-name $InboxQueue --region $Region `
        --attributes MessageRetentionPeriod=345600 --query 'QueueUrl' --output text
} else {
    Write-Host "Inbox queue $InboxQueue already exists."
}
$inboxArn = aws sqs get-queue-attributes --queue-url $inboxUrl --attribute-names QueueArn `
    --region $Region --query 'Attributes.QueueArn' --output text

$queuePolicyDoc = (Get-Content $QueuePolicyTemplate -Raw) `
    -replace 'QUEUE_ARN_PLACEHOLDER', $inboxArn `
    -replace 'TOPIC_ARN_PLACEHOLDER', $topicArn
$queuePolicyStr = ($queuePolicyDoc | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 5)
$queuePolicyAttrFile = Join-Path $TmpDir 'sqs-policy-attr.json'
Write-Utf8NoBom $queuePolicyAttrFile ((@{ Policy = $queuePolicyStr } | ConvertTo-Json -Compress))
aws sqs set-queue-attributes --queue-url $inboxUrl --region $Region `
    --attributes "file://$($queuePolicyAttrFile -replace '\\','/')" | Out-Null
Write-Host 'Inbox queue policy applied.'

# --- SNS -> SQS subscription ---
$existingSub = aws sns list-subscriptions-by-topic --topic-arn $topicArn --region $Region `
    --query "Subscriptions[?Endpoint=='$inboxArn'].SubscriptionArn" --output text 2>$null
if ($existingSub -and $existingSub -ne 'None' -and $existingSub -notlike 'Pending*') {
    Write-Host 'SQS inbox subscription already confirmed.'
    $sqsSubArn = $existingSub
} else {
    $sqsSubArn = aws sns subscribe --topic-arn $topicArn --protocol sqs --notification-endpoint $inboxArn `
        --region $Region --query 'SubscriptionArn' --output text
    Write-Host "SQS inbox subscription: $sqsSubArn"
}

# --- Optional email subscription ---
$emailSubArn = $null
if ($Email) {
    $emailSubArn = aws sns subscribe --topic-arn $topicArn --protocol email `
        --notification-endpoint $Email --region $Region --query 'SubscriptionArn' --output text
    Write-Host "Email subscription pending confirmation for $Email — check inbox."
}

# --- EventBridge failure rule ---
$failureRuleArn = "arn:aws:events:${Region}:${AccountId}:rule/${FailureRule}"
$patternObj = @{
    source = @('aws.ecs')
    'detail-type' = @('ECS Task State Change')
    detail = @{
        lastStatus = @('STOPPED')
        stopCode = @('EssentialContainerExited')
        clusterArn = @($ClusterArn)
        taskDefinitionArn = @(@{ prefix = $TaskDefPrefix })
        containers = @{ exitCode = @(@{ numeric = @('!=', 0) }) }
    }
}
$patternFile = Join-Path $TmpDir 'failure-pattern.json'
Write-Utf8NoBom $patternFile (($patternObj | ConvertTo-Json -Depth 10 -Compress))
aws events put-rule --name $FailureRule `
    --event-pattern "file://$($patternFile -replace '\\','/')" `
    --state ENABLED --description 'Iceland non-zero exit to SNS study lab' --region $Region | Out-Null
Write-Host "Failure rule $FailureRule ready."

$topicPolicyDoc = (Get-Content $TopicPolicyTemplate -Raw) `
    -replace 'TOPIC_ARN_PLACEHOLDER', $topicArn `
    -replace 'RULE_ARN_PLACEHOLDER', $failureRuleArn
$topicPolicyStr = ($topicPolicyDoc | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 5)
aws sns set-topic-attributes --topic-arn $topicArn --attribute-name Policy `
    --attribute-value $topicPolicyStr --region $Region | Out-Null
Write-Host 'SNS topic policy applied.'

$targetsFile = Join-Path $TmpDir 'sns-targets.json'
$targetsPayload = '[{"Id":"iceland-failure-sns","Arn":"' + $topicArn + '"}]'
Write-Utf8NoBom $targetsFile $targetsPayload
aws events put-targets --rule $FailureRule --region $Region `
    --targets "file://$($targetsFile -replace '\\','/')" | Out-Null
Write-Host 'SNS target attached to failure rule.'

# --- Wire Night 12 CloudWatch alarm to SNS (if alarm exists) ---
$alarmExists = aws cloudwatch describe-alarms --alarm-names $AlarmName --region $Region `
    --query 'MetricAlarms[0].AlarmName' --output text 2>$null
if ($alarmExists -and $alarmExists -ne 'None') {
    aws cloudwatch put-metric-alarm --alarm-name $AlarmName `
        --alarm-description 'Night 12 EventBridge failed invocations for Iceland schedule (+ Night 14 SNS)' `
        --metric-name FailedInvocations --namespace AWS/Events --statistic Sum `
        --period 300 --evaluation-periods 1 --threshold 1 `
        --comparison-operator GreaterThanOrEqualToThreshold `
        --dimensions "Name=RuleName,Value=$ScheduleRule" `
        --treat-missing-data notBreaching `
        --alarm-actions $topicArn `
        --region $Region | Out-Null
    Write-Host "CloudWatch alarm $AlarmName now publishes to SNS."
} else {
    Write-Host "Alarm $AlarmName not found — run Night 12 setup first to wire FailedInvocations."
}

if ($TestPublish) {
    $msg = (@{
        alert = 'night-14-test'
        pipeline = 'iceland'
        severity = 'test'
        message = 'Synthetic failure alert from night-14-lab-sns-setup'
        timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    } | ConvertTo-Json -Compress)
    aws sns publish --topic-arn $topicArn --message $msg --region $Region | Out-Null
    Write-Host 'Published test message to SNS topic.'
}

$subs = aws sns list-subscriptions-by-topic --topic-arn $topicArn --region $Region --output json | ConvertFrom-Json
$depth = aws sqs get-queue-attributes --queue-url $inboxUrl `
    --attribute-names ApproximateNumberOfMessages --region $Region `
    --query 'Attributes.ApproximateNumberOfMessages' --output text

$result = @{
    lab = 'night-14-lab2c-sns-fanout'
    region = $Region
    completedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    sns = @{
        topicName = $TopicName
        topicArn = $topicArn
        subscriptions = $subs.Subscriptions
    }
    sqsInbox = @{ name = $InboxQueue; url = $inboxUrl; arn = $inboxArn; approximateMessages = $depth }
    eventBridge = @{
        failureRuleName = $FailureRule
        failureRuleArn = $failureRuleArn
        pattern = 'ECS STOPPED exitCode != 0 Iceland task family'
    }
    cloudWatch = @{ alarmName = $AlarmName; alarmActionTopic = $topicArn }
    emailSubscription = $emailSubArn
} | ConvertTo-Json -Depth 8
$result | Set-Content -Path $ResultFile -Encoding utf8

Write-Host ''
Write-Host "Result written to $ResultFile"
Write-Host "Inbox messages waiting: $depth"
Write-Host ''
Write-Host 'Next: .\HTML\study-lab\night-14-lab-sns-inbox.ps1'
Write-Host 'E2E failure: force Iceland exit 1, then inbox script'
Write-Host 'Teardown: .\HTML\study-lab\night-14-lab-sns-teardown.ps1'

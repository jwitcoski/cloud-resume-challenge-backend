# Night 28 Lab - Read-only audit of GSA integration stack (Nights 12-14)
# Run: .\HTML\study-lab\night-28-lab-integration-audit.ps1
# Options: -PrintDecisionTree

param(
    [switch]$PrintDecisionTree
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$TagLab = 'night-28'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-28-integration-result.json'
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

$StudyRules = @(
    'saa-study-gsa-iceland-monthly',
    'saa-study-gsa-iceland-success-to-sqs',
    'saa-study-gsa-iceland-failure-to-sns'
)
$StudyQueues = @(
    'saa-study-gsa-iceland-completion',
    'saa-study-gsa-iceland-completion-dlq',
    'saa-study-gsa-iceland-alerts-inbox'
)
$StudyTopics = @('saa-study-gsa-iceland-alerts')
$StudyAlarms = @('saa-study-gsa-iceland-task-failed')

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

function Aws-Text([string[]]$AwsArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $out = & aws @AwsArgs --output text 2>$null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { return $null }
    if (-not $out -or $out -eq 'None') { return $null }
    return ($out | Out-String).Trim()
}

function Test-EventBridgeRule([string]$Name) {
    $arn = Aws-Text @('events', 'describe-rule', '--name', $Name, '--region', $Region, '--query', 'Arn')
    if (-not $arn) { return @{ found = $false; name = $Name; pattern = 'EventBridge schedule or event rule' } }
    $schedule = Aws-Text @('events', 'describe-rule', '--name', $Name, '--region', $Region, '--query', 'ScheduleExpression')
    $state = Aws-Text @('events', 'describe-rule', '--name', $Name, '--region', $Region, '--query', 'State')
    $targets = Aws-Text @('events', 'list-targets-by-rule', '--rule', $Name, '--region', $Region, '--query', 'Targets[*].Id', '--output', 'text')
    return @{
        found = $true
        name = $Name
        arn = $arn
        scheduleExpression = $schedule
        state = $state
        targetIds = if ($targets) { ($targets -split "\s+") | Where-Object { $_ } } else { @() }
        pattern = 'EventBridge schedule or event rule'
    }
}

function Test-SqsQueue([string]$Name) {
    $url = Aws-Text @('sqs', 'get-queue-url', '--queue-name', $Name, '--region', $Region, '--query', 'QueueUrl')
    if (-not $url) { return @{ found = $false; name = $Name; pattern = 'SQS pull buffer / DLQ' } }
    $arn = Aws-Text @('sqs', 'get-queue-attributes', '--queue-url', $url, '--attribute-names', 'QueueArn', '--region', $Region, '--query', 'Attributes.QueueArn')
    $dlq = Aws-Text @('sqs', 'get-queue-attributes', '--queue-url', $url, '--attribute-names', 'RedrivePolicy', '--region', $Region, '--query', 'Attributes.RedrivePolicy')
    return @{
        found = $true
        name = $Name
        queueUrl = $url
        queueArn = $arn
        redrivePolicy = $dlq
        pattern = 'SQS pull buffer / DLQ'
    }
}

function Test-SnsTopic([string]$Name) {
    $arn = Aws-Text @('sns', 'list-topics', '--region', $Region, '--query', "Topics[?contains(TopicArn, '$Name')].TopicArn | [0]")
    if (-not $arn) { return @{ found = $false; name = $Name; pattern = 'SNS fan-out notifications' } }
    $subs = Aws-Text @('sns', 'list-subscriptions-by-topic', '--topic-arn', $arn, '--region', $Region, '--query', 'Subscriptions[*].Protocol', '--output', 'text')
    return @{
        found = $true
        name = $Name
        topicArn = $arn
        subscriptionProtocols = if ($subs) { ($subs -split "\s+") | Where-Object { $_ } } else { @() }
        pattern = 'SNS fan-out notifications'
    }
}

function Test-CloudWatchAlarm([string]$Name) {
    $arn = Aws-Text @('cloudwatch', 'describe-alarms', '--alarm-names', $Name, '--region', $Region, '--query', 'MetricAlarms[0].AlarmArn')
    if (-not $arn) { return @{ found = $false; name = $Name; pattern = 'CloudWatch alarm -> SNS on FailedInvocations' } }
    $metric = Aws-Text @('cloudwatch', 'describe-alarms', '--alarm-names', $Name, '--region', $Region, '--query', 'MetricAlarms[0].MetricName')
    return @{
        found = $true
        name = $Name
        alarmArn = $arn
        metricName = $metric
        pattern = 'CloudWatch alarm -> SNS on FailedInvocations'
    }
}

function Print-DecisionTree {
    Write-Host ''
    Write-Host '=== Integration decision tree (Night 28) ==='
    Write-Host 'Schedule or route AWS events     -> EventBridge'
    Write-Host 'Buffer work - workers pull       -> SQS'
    Write-Host 'Notify many subscribers - push   -> SNS'
    Write-Host 'High-volume stream + replay      -> Kinesis Data Streams'
    Write-Host 'Stream to S3 without consumers   -> Kinesis Data Firehose'
    Write-Host 'Multi-step retry/Catch workflow  -> Step Functions'
    Write-Host 'GraphQL + live subscriptions     -> AppSync'
    Write-Host ''
    Write-Host 'See gsa-integration-map.md for GSA Nights 12-14 wiring.'
}

Write-Host "Night 28 integration audit - region $Region (read-only)"
$identity = Aws-Text @('sts', 'get-caller-identity', '--query', 'Account')
if (-not $identity) { throw 'aws sts get-caller-identity failed - configure AWS CLI' }
Write-Host "Account: $identity"

$rules = @($StudyRules | ForEach-Object { Test-EventBridgeRule $_ })
$queues = @($StudyQueues | ForEach-Object { Test-SqsQueue $_ })
$topics = @($StudyTopics | ForEach-Object { Test-SnsTopic $_ })
$alarms = @($StudyAlarms | ForEach-Object { Test-CloudWatchAlarm $_ })

Write-Host ''
Write-Host '=== EventBridge rules ==='
foreach ($r in $rules) {
    $status = if ($r.found) { 'FOUND' } else { 'MISSING' }
    Write-Host ("[{0}] {1}" -f $status, $r.name)
    if ($r.found -and $r.scheduleExpression) { Write-Host ("  schedule: {0}" -f $r.scheduleExpression) }
    if ($r.found -and $r.targetIds.Count -gt 0) { Write-Host ("  targets: {0}" -f ($r.targetIds -join ', ')) }
}

Write-Host ''
Write-Host '=== SQS queues ==='
foreach ($q in $queues) {
    $status = if ($q.found) { 'FOUND' } else { 'MISSING' }
    Write-Host ("[{0}] {1}" -f $status, $q.name)
}

Write-Host ''
Write-Host '=== SNS topics ==='
foreach ($t in $topics) {
    $status = if ($t.found) { 'FOUND' } else { 'MISSING' }
    Write-Host ("[{0}] {1}" -f $status, $t.name)
    if ($t.found -and $t.subscriptionProtocols.Count -gt 0) {
        Write-Host ("  subscriptions: {0}" -f ($t.subscriptionProtocols -join ', '))
    }
}

Write-Host ''
Write-Host '=== CloudWatch alarms ==='
foreach ($a in $alarms) {
    $status = if ($a.found) { 'FOUND' } else { 'MISSING' }
    Write-Host ("[{0}] {1}" -f $status, $a.name)
}

$foundCount = ($rules + $queues + $topics + $alarms | Where-Object { $_.found }).Count
$totalCount = $rules.Count + $queues.Count + $topics.Count + $alarms.Count
Write-Host ''
Write-Host ("Study resources found: {0}/{1}" -f $foundCount, $totalCount)
if ($foundCount -lt $totalCount) {
    Write-Host 'Missing resources - re-run Night 12/13/14 setup scripts as noted in night-28-integration-services.md'
}

$result = @{
    lab = 'night-28-integration-audit'
    region = $Region
    account = $identity
    auditedAt = (Get-Date).ToUniversalTime().ToString('o')
    foundCount = $foundCount
    totalCount = $totalCount
    eventBridgeRules = $rules
    sqsQueues = $queues
    snsTopics = $topics
    cloudWatchAlarms = $alarms
    teardown = $null
} | ConvertTo-Json -Depth 6

Write-Utf8NoBom $ResultFile $result
Write-Host ''
Write-Host "Wrote $ResultFile"

if ($PrintDecisionTree) { Print-DecisionTree }

Write-Host ''
Write-Host 'Next: draw Night 32 Step Functions capstone using gsa-integration-map.md, then take night-28-quiz.json.'

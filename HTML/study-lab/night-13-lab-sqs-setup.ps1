# Night 13 Lab 2C - SQS completion queue + DLQ + EventBridge ECS success -> SQS
# Run: .\HTML\study-lab\night-13-lab-sqs-setup.ps1
# Options: -TestMessage

param([switch]$TestMessage)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$Cluster = 'globalskiatlas-backend-k8s'
$TaskFamily = 'globalskiatlas-backend-k8s-iceland'
$MainQueue = "$Prefix-iceland-completion"
$DlqQueue = "$Prefix-iceland-completion-dlq"
$RuleName = "$Prefix-iceland-success-to-sqs"
$VisibilityTimeout = 60
$MaxReceiveCount = 3

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-13-sqs-result.json'
$PolicyTemplate = Join-Path $ScriptDir 'sqs-completion-queue-policy.json'
$TmpDir = Join-Path $env:TEMP 'night13'
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

$ClusterArn = "arn:aws:ecs:${Region}:${AccountId}:cluster/${Cluster}"
$TaskDefArn = aws ecs describe-task-definition --task-definition $TaskFamily --region $Region `
    --query 'taskDefinition.taskDefinitionArn' --output text
$TaskDefPrefix = "arn:aws:ecs:${Region}:${AccountId}:task-definition/${TaskFamily}"

Write-Host '=== Night 13 Lab 2C - SQS decoupling ==='
Write-Host "Main queue: $MainQueue"
Write-Host "DLQ:        $DlqQueue"
Write-Host "Rule:       $RuleName"
Write-Host ''

function Get-QueueUrl($Name) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $url = aws sqs get-queue-url --queue-name $Name --region $Region `
        --query 'QueueUrl' --output text 2>$null
    $ErrorActionPreference = $prev
    if ($url -and $url -ne 'None') { return $url }
    return $null
}

$dlqUrl = Get-QueueUrl $DlqQueue
if (-not $dlqUrl) {
    Write-Host "Creating DLQ $DlqQueue ..."
    $dlqUrl = aws sqs create-queue --queue-name $DlqQueue `
        --attributes MessageRetentionPeriod=1209600 --region $Region `
        --query 'QueueUrl' --output text
} else {
    Write-Host "DLQ $DlqQueue already exists."
}
$dlqArn = aws sqs get-queue-attributes --queue-url $dlqUrl --attribute-names QueueArn `
    --region $Region --query 'Attributes.QueueArn' --output text

$mainUrl = Get-QueueUrl $MainQueue
if (-not $mainUrl) {
    Write-Host "Creating main queue $MainQueue ..."
    $mainUrl = aws sqs create-queue --queue-name $MainQueue --region $Region `
        --query 'QueueUrl' --output text
} else {
    Write-Host "Main queue $MainQueue already exists."
}

$redriveInner = (@{ deadLetterTargetArn = $dlqArn; maxReceiveCount = "$MaxReceiveCount" } | ConvertTo-Json -Compress)
$attrFile = Join-Path $TmpDir 'queue-attrs.json'
$attrObj = @{
    VisibilityTimeout = "$VisibilityTimeout"
    MessageRetentionPeriod = '345600'
    RedrivePolicy = $redriveInner
}
Write-Utf8NoBom $attrFile (($attrObj | ConvertTo-Json -Compress))
aws sqs set-queue-attributes --queue-url $mainUrl --region $Region `
    --attributes "file://$($attrFile -replace '\\','/')" | Out-Null
Write-Host 'Redrive policy applied.'

$mainArn = aws sqs get-queue-attributes --queue-url $mainUrl --attribute-names QueueArn `
    --region $Region --query 'Attributes.QueueArn' --output text

$patternObj = @{
    source = @('aws.ecs')
    'detail-type' = @('ECS Task State Change')
    detail = @{
        lastStatus = @('STOPPED')
        stopCode = @('EssentialContainerExited')
        clusterArn = @($ClusterArn)
        taskDefinitionArn = @(@{ prefix = $TaskDefPrefix })
        containers = @{ exitCode = @(0) }
    }
}
$patternFile = Join-Path $TmpDir 'pattern.json'
Write-Utf8NoBom $patternFile (($patternObj | ConvertTo-Json -Depth 10 -Compress))
aws events put-rule --name $RuleName `
    --event-pattern "file://$($patternFile -replace '\\','/')" `
    --state ENABLED --description 'Iceland success to SQS study lab' --region $Region | Out-Null
Write-Host "Rule $RuleName ready."

$ruleArn = "arn:aws:events:${Region}:${AccountId}:rule/${RuleName}"
$policyDoc = (Get-Content $PolicyTemplate -Raw) `
    -replace 'QUEUE_ARN_PLACEHOLDER', $mainArn `
    -replace 'RULE_ARN_PLACEHOLDER', $ruleArn
$policyStr = ($policyDoc | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 5)
$policyAttrFile = Join-Path $TmpDir 'policy-attr.json'
Write-Utf8NoBom $policyAttrFile ((@{ Policy = $policyStr } | ConvertTo-Json -Compress))
aws sqs set-queue-attributes --queue-url $mainUrl --region $Region `
    --attributes "file://$($policyAttrFile -replace '\\','/')" | Out-Null
Write-Host 'Queue policy applied.'

$targetsFile = Join-Path $TmpDir 'targets.json'
$targetsPayload = '[{"Id":"iceland-completion-sqs","Arn":"' + $mainArn + '"}]'
Write-Utf8NoBom $targetsFile $targetsPayload
aws events put-targets --rule $RuleName --region $Region `
    --targets "file://$($targetsFile -replace '\\','/')" | Out-Null
Write-Host 'SQS target attached.'

if ($TestMessage) {
    $body = (@{
        source = 'night-13-lab-sqs-setup'
        detail = @{
            taskArn = "arn:aws:ecs:${Region}:${AccountId}:task/${Cluster}/night13-test"
            lastStatus = 'STOPPED'
            containers = @(@{ name = 'iceland'; exitCode = 0 })
            overrides = @{ s3Bucket = 'globalskiatlas-backend-k8s-output'; s3Prefix = 'iceland/2026-06/' }
        }
    } | ConvertTo-Json -Compress -Depth 5)
    aws sqs send-message --queue-url $mainUrl --message-body $body --region $Region | Out-Null
    Write-Host "Sent test message to $MainQueue"
}

$attrsJson = aws sqs get-queue-attributes --queue-url $mainUrl `
    --attribute-names All `
    --region $Region --output json
$attrs = $attrsJson | ConvertFrom-Json
$depth = $attrs.Attributes.ApproximateNumberOfMessages

$result = @{
    lab = 'night-13-lab2c-sqs-decoupling'
    region = $Region
    completedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    queues = @{
        main = @{ name = $MainQueue; url = $mainUrl; arn = $mainArn }
        dlq = @{ name = $DlqQueue; url = $dlqUrl; arn = $dlqArn }
        visibilityTimeout = $VisibilityTimeout
        maxReceiveCount = $MaxReceiveCount
    }
    eventBridge = @{
        ruleName = $RuleName
        ruleArn = $ruleArn
        target = "SQS $MainQueue"
        taskDefinition = $TaskDefArn
    }
    queueAttributes = $attrs
} | ConvertTo-Json -Depth 6
$result | Set-Content -Path $ResultFile -Encoding utf8

Write-Host ''
Write-Host "Result written to $ResultFile"
Write-Host "Queue URL: $mainUrl"
Write-Host "Messages waiting: $depth"
Write-Host ''
Write-Host 'Next: .\HTML\study-lab\night-13-lab-sqs-consumer.ps1'
Write-Host 'E2E: Night 12 -TestFire, then consumer'

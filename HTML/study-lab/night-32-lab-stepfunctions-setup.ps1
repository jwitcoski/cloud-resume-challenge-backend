# Night 32 Lab — Step Functions capstone (sam-pipeline-orchestrator)
# Run: .\HTML\study-lab\night-32-lab-stepfunctions-setup.ps1
# Options: -TestStartExecution  -KeepLegacySchedule  -DisableSuccessRule

param(
    [switch]$TestStartExecution,
    [switch]$KeepLegacySchedule,
    [switch]$DisableSuccessRule
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$Cluster = 'globalskiatlas-backend-k8s'
$TaskFamily = 'globalskiatlas-backend-k8s-iceland'
$StackName = 'sam-pipeline-orchestrator'
$LegacyRule = "$Prefix-iceland-monthly"
$SuccessRule = "$Prefix-iceland-success-to-sqs"
$StateMachineName = "$Prefix-iceland-pipeline"
$ScheduleRule = "$Prefix-iceland-monthly-sfn"
$StatsFunction = "$Prefix-stats-uploader"
$CompletionQueue = "$Prefix-iceland-completion"
$AlertsTopic = "$Prefix-iceland-alerts"
$EcsExecutionRole = 'globalskiatlas-backend-k8s-ecs-execution'
$EcsTaskRole = 'globalskiatlas-backend-k8s-ecs-task'
$TagLab = 'night-32'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SamDir = Join-Path $ScriptDir 'sam-pipeline-orchestrator'
$VpcFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'
$SqsResultFile = Join-Path $ScriptDir 'night-13-sqs-result.json'
$SnsResultFile = Join-Path $ScriptDir 'night-14-sns-result.json'
$ResultFile = Join-Path $ScriptDir 'night-32-stepfunctions-result.json'
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

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

function Aws-Run([string[]]$AwsArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & aws @AwsArgs 2>&1 | Out-String | Write-Host
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "aws $($AwsArgs -join ' ') failed (exit $code)" }
}

function Sam-Run([string[]]$SamArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & sam @SamArgs 2>&1 | Out-String | Write-Host
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "sam $($SamArgs -join ' ') failed (exit $code)" }
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

function Set-RuleEnabled([string]$RuleName, [bool]$Enabled) {
    $exists = Aws-Text @('events', 'describe-rule', '--name', $RuleName, '--region', $Region, '--query', 'Name')
    if (-not $exists) {
        Write-Host "Rule $RuleName not found - skip"
        return $false
    }
    $verb = if ($Enabled) { 'enable-rule' } else { 'disable-rule' }
    Aws-Run @('events', $verb, '--name', $RuleName, '--region', $Region)
    Write-Host "$(if ($Enabled) { 'Enabled' } else { 'Disabled' }) $RuleName"
    return $true
}

Write-Host '=== Night 32 Lab 4C - Step Functions capstone ==='
Require-Command aws
Require-Command sam

if (-not (Test-Path $VpcFile)) {
    throw "Missing $VpcFile - run Night 9 VPC build first."
}
if (-not (Test-Path (Join-Path $SamDir 'template.yaml'))) {
    throw "Missing SAM template at $SamDir"
}

$identity = Aws-Text @('sts', 'get-caller-identity', '--query', 'Account', '--output', 'text')
if ($identity) { $AccountId = $identity }

$vpc = Get-Content $VpcFile -Raw | ConvertFrom-Json
$subnetA = $vpc.subnets.privateA.id
$subnetB = $vpc.subnets.privateB.id
$fargateSg = $vpc.securityGroups.fargate

$queueUrl = $null
if (Test-Path $SqsResultFile) {
    $sqsJson = Get-Content $SqsResultFile -Raw | ConvertFrom-Json
    $queueUrl = $sqsJson.completionQueue.queueUrl
}
if (-not $queueUrl) {
    $queueUrl = Aws-Text @('sqs', 'get-queue-url', '--queue-name', $CompletionQueue, '--region', $Region, '--query', 'QueueUrl')
}
if (-not $queueUrl) {
    throw "Completion queue $CompletionQueue not found - run Night 13 setup first."
}

$topicArn = $null
if (Test-Path $SnsResultFile) {
    $snsJson = Get-Content $SnsResultFile -Raw | ConvertFrom-Json
    $topicArn = $snsJson.snsTopic.topicArn
}
if (-not $topicArn) {
    $topicArn = "arn:aws:sns:${Region}:${AccountId}:${AlertsTopic}"
    $check = Aws-Text @('sns', 'get-topic-attributes', '--topic-arn', $topicArn, '--region', $Region, '--query', 'Attributes.TopicArn')
    if (-not $check) { throw "SNS topic $AlertsTopic not found - run Night 14 setup first." }
}

$statsArn = Aws-Text @('lambda', 'get-function', '--function-name', $StatsFunction, '--region', $Region, '--query', 'Configuration.FunctionArn')
if (-not $statsArn) {
    Write-Host "WARN: Lambda $StatsFunction not found - deploy Night 17 first or InvokeStatsUploader will fail on test run."
    $statsArn = "arn:aws:lambda:${Region}:${AccountId}:function:${StatsFunction}"
}

$execRoleArn = "arn:aws:iam::${AccountId}:role/${EcsExecutionRole}"
$taskRoleArn = "arn:aws:iam::${AccountId}:role/${EcsTaskRole}"
foreach ($roleArn in @($execRoleArn, $taskRoleArn)) {
    $roleName = ($roleArn -split '/')[-1]
    if (-not (Aws-Text @('iam', 'get-role', '--role-name', $roleName, '--query', 'Role.Arn'))) {
        throw "IAM role $roleName not found - verify ECS roles for Iceland task."
    }
}

$paramOverrides = @(
    "StudyPrefix=$Prefix",
    "ClusterName=$Cluster",
    "TaskDefinitionFamily=$TaskFamily",
    "PrivateSubnetA=$subnetA",
    "PrivateSubnetB=$subnetB",
    "FargateSecurityGroupId=$fargateSg",
    "CompletionQueueUrl=$queueUrl",
    "AlertsTopicArn=$topicArn",
    "StatsUploaderFunctionArn=$statsArn",
    "EcsExecutionRoleArn=$execRoleArn",
    "EcsTaskRoleArn=$taskRoleArn"
)

Write-Host ''
Write-Host "SAM directory: $SamDir"
Write-Host "Parameter overrides: $($paramOverrides -join ' ')"
Write-Host ''

$stackStatus = Aws-Text @('cloudformation', 'describe-stacks', '--stack-name', $StackName, '--region', $Region, '--query', 'Stacks[0].StackStatus')
if ($stackStatus -match 'ROLLBACK') {
    Write-Host "Deleting rolled-back stack $StackName ..."
    aws cloudformation delete-stack --stack-name $StackName --region $Region | Out-Null
    aws cloudformation wait stack-delete-complete --stack-name $StackName --region $Region | Out-Null
}

Push-Location $SamDir
try {
    Sam-Run @('build')
    Sam-Run @('deploy', '--no-confirm-changeset', '--no-fail-on-empty-changeset',
        '--capabilities', 'CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM',
        '--parameter-overrides', @($paramOverrides))
} finally {
    Pop-Location
}

$smArn = Aws-Text @('stepfunctions', 'describe-state-machine',
    '--state-machine-arn', "arn:aws:states:${Region}:${AccountId}:stateMachine:${StateMachineName}",
    '--region', $Region, '--query', 'stateMachineArn')
if (-not $smArn) {
    $smArn = Aws-Text @('cloudformation', 'describe-stacks', '--stack-name', $StackName, '--region', $Region,
        '--query', 'Stacks[0].Outputs[?OutputKey==`StateMachineArn`].OutputValue', '--output', 'text')
}

$legacyDisabled = $false
if (-not $KeepLegacySchedule) {
    $legacyDisabled = Set-RuleEnabled $LegacyRule $false
} else {
    Write-Host "Keeping legacy rule $LegacyRule unchanged (-KeepLegacySchedule)."
}

$successDisabled = $false
if ($DisableSuccessRule) {
    $successDisabled = Set-RuleEnabled $SuccessRule $false
}

$executionArn = $null
$executionStatus = $null
if ($TestStartExecution) {
    if (-not $smArn) { throw 'State machine ARN not found after deploy.' }
    Write-Host ''
    Write-Host 'WARNING: Starting execution - this runs a real Iceland Fargate task.'
    $name = "night32-test-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
    $startJson = Aws-Text @('stepfunctions', 'start-execution', '--state-machine-arn', $smArn,
        '--name', $name, '--region', $Region, '--output', 'json')
    if ($startJson) {
        $start = $startJson | ConvertFrom-Json
        $executionArn = $start.executionArn
        Write-Host "Started execution: $executionArn"
        Write-Host 'Poll in console or: aws stepfunctions describe-execution --execution-arn ...'
        $executionStatus = 'STARTED'
    }
}

$result = @{
    night = 32
    region = $Region
    lab = $TagLab
    stackName = $StackName
    stateMachineName = $StateMachineName
    stateMachineArn = $smArn
    scheduleRule = $ScheduleRule
    legacyRule = $LegacyRule
    legacyRuleDisabled = $legacyDisabled
    successRule = $SuccessRule
    successRuleDisabled = $successDisabled
    completionQueueUrl = $queueUrl
    alertsTopicArn = $topicArn
    statsUploaderArn = $statsArn
    ecsExecutionRoleArn = $execRoleArn
    ecsTaskRoleArn = $taskRoleArn
    subnets = @($subnetA, $subnetB)
    fargateSecurityGroupId = $fargateSg
    testExecutionArn = $executionArn
    testExecutionStatus = $executionStatus
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
}
Write-Utf8NoBom $ResultFile ($result | ConvertTo-Json -Depth 6)
Write-Host ''
Write-Host "Wrote $ResultFile"
Write-Host 'Next: Step Functions console - execution graph; take night-32-quiz.json.'
Write-Host 'Teardown: .\HTML\study-lab\night-32-lab-stepfunctions-teardown.ps1'

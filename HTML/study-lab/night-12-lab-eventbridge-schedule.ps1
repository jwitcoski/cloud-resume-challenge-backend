# Night 12 Lab 2B - EventBridge schedule -> ecs:RunTask (PowerShell)
# Run from repo: .\HTML\study-lab\night-12-lab-eventbridge-schedule.ps1
# Options: -Schedule monthly|test  -TestFire  -SkipAlarm

param(
    [ValidateSet('monthly', 'test')]
    [string]$Schedule = 'monthly',
    [switch]$TestFire,
    [switch]$SkipAlarm
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$Cluster = 'globalskiatlas-backend-k8s'
$TaskFamily = 'globalskiatlas-backend-k8s-iceland'
$RuleName = "$Prefix-iceland-monthly"
$RoleName = "$Prefix-eventbridge-ecs"
$AlarmName = "$Prefix-iceland-task-failed"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$IdsFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'
$ResultFile = Join-Path $ScriptDir 'night-12-eventbridge-result.json'
$TrustPolicy = Join-Path $ScriptDir 'eventbridge-ecs-trust-policy.json'
$RunPolicy = Join-Path $ScriptDir 'eventbridge-ecs-run-policy.json'
$TmpDir = Join-Path $env:TEMP 'night12'
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null

if (-not (Test-Path $IdsFile)) {
    Write-Error "Missing $IdsFile - run night-9 VPC build first."
}

$ids = Get-Content $IdsFile | ConvertFrom-Json
$SubnetA = $ids.subnets.privateA.id
$SubnetB = $ids.subnets.privateB.id
$FargateSg = $ids.securityGroups.fargate

$TaskDef = aws ecs describe-task-definition --task-definition $TaskFamily --region $Region `
    --query 'taskDefinition.taskDefinitionArn' --output text

$ScheduleMonthly = 'cron(0 6 1 * ? *)'
$ScheduleTest = 'rate(30 minutes)'
$ScheduleTestFire = 'rate(1 minute)'
if ($Schedule -eq 'test') {
    $ScheduleExpr = $ScheduleTest
} else {
    $ScheduleExpr = $ScheduleMonthly
}

Write-Host '=== Night 12 Lab 2B - EventBridge -> ECS RunTask ==='
Write-Host "Rule: $RuleName  Schedule: $ScheduleExpr"
Write-Host "Task def: $TaskDef"
Write-Host ''

$PolicyArn = "arn:aws:iam::${AccountId}:policy/${RoleName}"
$RoleArn = "arn:aws:iam::${AccountId}:role/${RoleName}"

$trustTmp = Join-Path $TmpDir 'trust.json'
$runTmp = Join-Path $TmpDir 'run.json'
Copy-Item $TrustPolicy $trustTmp -Force
Copy-Item $RunPolicy $runTmp -Force

$roleExists = $false
try {
    aws iam get-role --role-name $RoleName | Out-Null
    $roleExists = $true
} catch {
    $roleExists = $false
}
if (-not $roleExists) {
    aws iam create-role --role-name $RoleName `
        --assume-role-policy-document "file://$($trustTmp -replace '\\','/')" `
        --description 'Night 12 study lab EventBridge ECS' | Out-Null
    Write-Host "Created IAM role $RoleName"
}

$policyExists = $false
try {
    aws iam get-policy --policy-arn $PolicyArn | Out-Null
    $policyExists = $true
} catch {
    $policyExists = $false
}
if (-not $policyExists) {
    aws iam create-policy --policy-name $RoleName `
        --policy-document "file://$($runTmp -replace '\\','/')" `
        --description 'Night 12 scoped RunTask' | Out-Null
    Write-Host "Created IAM policy $RoleName"
}
aws iam attach-role-policy --role-name $RoleName --policy-arn $PolicyArn 2>$null
Start-Sleep -Seconds 5

aws events put-rule --name $RuleName --schedule-expression $ScheduleExpr --state ENABLED `
    --description 'Monthly Iceland OSM pipeline study lab' --region $Region | Out-Null

$targetObj = [ordered]@{
    Id = 'iceland-fargate'
    Arn = "arn:aws:ecs:${Region}:${AccountId}:cluster/${Cluster}"
    RoleArn = $RoleArn
    EcsParameters = [ordered]@{
        TaskDefinitionArn = $TaskDef
        LaunchType = 'FARGATE'
        PlatformVersion = 'LATEST'
        TaskCount = 1
        NetworkConfiguration = [ordered]@{
            awsvpcConfiguration = [ordered]@{
                Subnets = @($SubnetA, $SubnetB)
                SecurityGroups = @($FargateSg)
                AssignPublicIp = 'DISABLED'
            }
        }
    }
}
$targetsJson = "[$(( $targetObj | ConvertTo-Json -Depth 10 -Compress ))]"
$targetsFile = Join-Path $TmpDir 'targets.json'
[System.IO.File]::WriteAllText($targetsFile, $targetsJson)
aws events put-targets --rule $RuleName --region $Region --targets "file://$($targetsFile -replace '\\','/')" | Out-Null

if (-not $SkipAlarm) {
    aws cloudwatch put-metric-alarm --alarm-name $AlarmName `
        --alarm-description 'Night 12 EventBridge failed invocations for Iceland schedule' `
        --metric-name FailedInvocations --namespace AWS/Events --statistic Sum `
        --period 300 --evaluation-periods 1 --threshold 1 `
        --comparison-operator GreaterThanOrEqualToThreshold `
        --dimensions "Name=RuleName,Value=$RuleName" `
        --treat-missing-data notBreaching --region $Region | Out-Null
    Write-Host "CloudWatch alarm: $AlarmName"
}

if ($TestFire) {
    Write-Host ''
    Write-Host '=== Test fire: temporary rate(1 minute) ==='
    aws events put-rule --name $RuleName --schedule-expression $ScheduleTestFire `
        --state ENABLED --region $Region | Out-Null
    Write-Host 'Waiting up to 3 minutes for scheduled RunTask ...'
    Start-Sleep -Seconds 150
    $recent = aws ecs list-tasks --cluster $Cluster --region $Region `
        --desired-status STOPPED --max-items 3 --query 'taskArns' --output text
    Write-Host "Recent stopped tasks: $recent"
    aws events put-rule --name $RuleName --schedule-expression $ScheduleExpr `
        --state ENABLED --region $Region | Out-Null
    Write-Host "Schedule restored to: $ScheduleExpr"
}

$result = @{
    lab = 'night-12-lab2b-eventbridge-schedule'
    region = $Region
    completedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    rule = @{ name = $RuleName; scheduleExpression = $ScheduleExpr; enabled = $true }
    target = @{
        cluster = $Cluster
        taskDefinition = $TaskDef
        network = @{
            subnets = @($SubnetA, $SubnetB)
            securityGroups = @($FargateSg)
            assignPublicIp = 'DISABLED'
        }
    }
    iam = @{ roleName = $RoleName; roleArn = $RoleArn }
    alarm = if ($SkipAlarm) { $null } else { $AlarmName }
} | ConvertTo-Json -Depth 5
$result | Set-Content -Path $ResultFile -Encoding utf8

Write-Host ''
Write-Host "Result written to $ResultFile"
Write-Host 'Verify:'
Write-Host "  aws events describe-rule --name $RuleName --region $Region"
Write-Host "  aws events list-targets-by-rule --rule $RuleName --region $Region"

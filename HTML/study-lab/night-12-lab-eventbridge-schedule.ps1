# Night 12 Lab 2B - EventBridge schedule -> ecs:RunTask (PowerShell)
# Run: .\HTML\study-lab\night-12-lab-eventbridge-schedule.ps1
# Options: -Schedule monthly|test  -TestFire  -SkipAlarm

param(
    [ValidateSet('monthly', 'test')]
    [string]$Schedule = 'monthly',
    [switch]$TestFire,
    [switch]$SkipAlarm
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
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
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Aws-Run([string[]]$AwsArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & aws @AwsArgs 2>$null | Out-Null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "aws $($AwsArgs -join ' ') failed (exit $code)" }
}

function Aws-Text([string[]]$AwsArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & aws @AwsArgs --output text 2>$null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { return $null }
    return ($out | Out-String).Trim()
}

function Test-IamRole([string]$Name) {
    return [bool](Aws-Text @('iam', 'get-role', '--role-name', $Name))
}

function Test-IamPolicy([string]$Arn) {
    return [bool](Aws-Text @('iam', 'get-policy', '--policy-arn', $Arn))
}

if (-not (Test-Path $IdsFile)) {
    Write-Error "Missing $IdsFile - run night-9 VPC build first."
}

$ids = Get-Content $IdsFile | ConvertFrom-Json
$SubnetA = $ids.subnets.privateA.id
$SubnetB = $ids.subnets.privateB.id
$FargateSg = $ids.securityGroups.fargate

$TaskDef = Aws-Text @('ecs', 'describe-task-definition', '--task-definition', $TaskFamily, '--region', $Region, '--query', 'taskDefinition.taskDefinitionArn')
if (-not $TaskDef) { throw "Task definition $TaskFamily not found" }

# Single-quoted: prevent PowerShell from expanding * when passed to aws CLI
$ScheduleMonthly = 'cron(0 6 1 * ? *)'
$ScheduleTest = 'rate(30 minutes)'
$ScheduleTestFire = 'rate(1 minute)'
$ScheduleExpr = if ($Schedule -eq 'test') { $ScheduleTest } else { $ScheduleMonthly }

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
$trustFile = $trustTmp -replace '\\', '/'
$runFile = $runTmp -replace '\\', '/'

if (-not (Test-IamRole $RoleName)) {
    Aws-Run @('iam', 'create-role', '--role-name', $RoleName,
        '--assume-role-policy-document', "file://$trustFile",
        '--description', 'Night 12 study lab EventBridge ECS')
    Write-Host "Created IAM role $RoleName"
} else {
    Write-Host "IAM role $RoleName already exists."
}

if (-not (Test-IamPolicy $PolicyArn)) {
    Aws-Run @('iam', 'create-policy', '--policy-name', $RoleName,
        '--policy-document', "file://$runFile",
        '--description', 'Night 12 scoped RunTask')
    Write-Host "Created IAM policy $RoleName"
} else {
    Write-Host "IAM policy $RoleName already exists."
}

$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
aws iam attach-role-policy --role-name $RoleName --policy-arn $PolicyArn 2>$null | Out-Null
$ErrorActionPreference = $prev
Start-Sleep -Seconds 5

# Quote schedule-expression — unquoted cron(0 6 1 * ? *) expands * to files in cwd
Aws-Run @('events', 'put-rule', '--name', $RuleName, '--schedule-expression', $ScheduleExpr,
    '--state', 'ENABLED', '--description', 'Monthly Iceland OSM pipeline study lab', '--region', $Region)

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
$targetsFile = Join-Path $TmpDir 'targets.json'
[System.IO.File]::WriteAllText($targetsFile, "[$(( $targetObj | ConvertTo-Json -Depth 10 -Compress ))]", $Utf8NoBom)
Aws-Run @('events', 'put-targets', '--rule', $RuleName, '--region', $Region,
    '--targets', "file://$($targetsFile -replace '\\','/')")
Write-Host 'ECS target attached.'

if (-not $SkipAlarm) {
    Aws-Run @('cloudwatch', 'put-metric-alarm', '--alarm-name', $AlarmName,
        '--alarm-description', 'Night 12 EventBridge failed invocations for Iceland schedule',
        '--metric-name', 'FailedInvocations', '--namespace', 'AWS/Events', '--statistic', 'Sum',
        '--period', '300', '--evaluation-periods', '1', '--threshold', '1',
        '--comparison-operator', 'GreaterThanOrEqualToThreshold',
        '--dimensions', "Name=RuleName,Value=$RuleName",
        '--treat-missing-data', 'notBreaching', '--region', $Region)
    Write-Host "CloudWatch alarm: $AlarmName"
}

if ($TestFire) {
    Write-Host ''
    Write-Host '=== Test fire: temporary rate(1 minute) ==='
    Aws-Run @('events', 'put-rule', '--name', $RuleName, '--schedule-expression', $ScheduleTestFire,
        '--state', 'ENABLED', '--region', $Region)
    Write-Host 'Waiting up to 3 minutes for scheduled RunTask ...'
    Start-Sleep -Seconds 150
    $recent = Aws-Text @('ecs', 'list-tasks', '--cluster', $Cluster, '--region', $Region,
        '--desired-status', 'STOPPED', '--max-items', '3', '--query', 'taskArns')
    Write-Host "Recent stopped tasks: $recent"
    Aws-Run @('events', 'put-rule', '--name', $RuleName, '--schedule-expression', $ScheduleExpr,
        '--state', 'ENABLED', '--region', $Region)
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

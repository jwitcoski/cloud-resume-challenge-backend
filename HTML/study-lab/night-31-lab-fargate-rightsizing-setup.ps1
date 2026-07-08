# Night 31 Lab — Fargate right-sizing audit (read-only)
# Run: .\HTML\study-lab\night-31-lab-fargate-rightsizing-setup.ps1
# Options: -PrintDecisionTree

param(
    [switch]$PrintDecisionTree
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Cluster = 'globalskiatlas-backend-k8s'
$TaskFamily = 'globalskiatlas-backend-k8s-iceland'
$LogGroup = '/ecs/globalskiatlas-backend-k8s-iceland'
$TagLab = 'night-31'

$FargateVcpuPerHour = 0.04048
$FargateGbPerHour = 0.004445
$RunHours = 2.0

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SizingFile = Join-Path $ScriptDir 'ecs-task-pipeline-sizing.json'
$ResultFile = Join-Path $ScriptDir 'night-31-fargate-rightsizing-result.json'
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

function Aws-Json([string[]]$AwsArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $out = & aws @AwsArgs --output json 2>$null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0 -or -not $out) { return $null }
    try {
        return $out | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Get-FargateHourlyCost([double]$Vcpu, [double]$Gb) {
    return ($Vcpu * $FargateVcpuPerHour) + ($Gb * $FargateGbPerHour)
}

function Get-LiveTaskDefinition {
    $data = Aws-Json @('ecs', 'describe-task-definition', '--task-definition', $TaskFamily, '--region', $Region)
    if (-not $data) { return $null }
    $def = $data.taskDefinition
    $cpu = [int]$def.cpu
    $mem = [int]$def.memory
    return @{
        arn = $def.taskDefinitionArn
        revision = $def.revision
        cpu = $cpu
        memoryMiB = $mem
        vcpu = [math]::Round($cpu / 1024, 2)
        memoryGiB = [math]::Round($mem / 1024, 2)
        compatibilities = @($def.requiresCompatibilities)
        ephemeralStorageGiB = if ($def.ephemeralStorage.sizeInGiB) { [int]$def.ephemeralStorage.sizeInGiB } else { 20 }
        registeredAt = $def.registeredAt
    }
}

function Get-RecentStoppedTask {
    $arns = Aws-Text @(
        'ecs', 'list-tasks', '--cluster', $Cluster, '--region', $Region,
        '--desired-status', 'STOPPED', '--family', $TaskFamily,
        '--max-items', '5', '--query', 'taskArns', '--output', 'text'
    )
    if (-not $arns) { return $null }
    $first = ($arns -split "\s+") | Where-Object { $_ } | Select-Object -First 1
    if (-not $first) { return $null }

    $data = Aws-Json @('ecs', 'describe-tasks', '--cluster', $Cluster, '--tasks', $first, '--region', $Region)
    if (-not $data) { return $null }
    $task = $data.tasks[0]
    $started = [datetime]$task.startedAt
    $stopped = [datetime]$task.stoppedAt
    $durationMin = if ($started -and $stopped) { [math]::Round(($stopped - $started).TotalMinutes, 1) } else { $null }
    return @{
        taskArn = $task.taskArn
        lastStatus = $task.lastStatus
        stoppedReason = $task.stoppedReason
        exitCode = $task.containers[0].exitCode
        startedAt = $task.startedAt
        stoppedAt = $task.stoppedAt
        durationMinutes = $durationMin
        cpu = $task.cpu
        memoryMiB = $task.memory
    }
}

function Get-ContainerMetricsP95 {
    $end = (Get-Date).ToUniversalTime()
    $start = $end.AddDays(-30)
    $period = 3600

    function Get-P95([string]$MetricName) {
        $data = Aws-Json @(
            'cloudwatch', 'get-metric-statistics', '--region', $Region,
            '--namespace', 'AWS/ECS',
            '--metric-name', $MetricName,
            '--dimensions', "Name=ClusterName,Value=$Cluster", "Name=TaskDefinitionFamily,Value=$TaskFamily",
            '--start-time', $start.ToString('o'),
            '--end-time', $end.ToString('o'),
            '--period', "$period",
            '--statistics', 'Maximum'
        )
        if (-not $data) { return $null }
        $points = $data.Datapoints
        if (-not $points -or $points.Count -eq 0) { return $null }
        $vals = $points | ForEach-Object { [double]$_.Maximum } | Sort-Object
        $idx = [math]::Ceiling($vals.Count * 0.95) - 1
        if ($idx -lt 0) { $idx = 0 }
        return [math]::Round($vals[$idx], 2)
    }

    return @{
        cpuUtilizationP95 = Get-P95 'CPUUtilization'
        memoryUtilizationP95 = Get-P95 'MemoryUtilization'
        note = 'Service-level metrics may be empty for RunTask-only workloads — check task-level Container Insights if enrolled'
    }
}

function Get-ComputeOptimizerEcs {
    $data = Aws-Json @('compute-optimizer', 'get-ecs-service-recommendations', '--region', $Region)
    if (-not $data) {
        return @{ enrolled = $false; recommendations = @(); note = 'No response — enroll Compute Optimizer in Billing console' }
    }
    $recs = @()
    if ($data.ecsServiceRecommendations) {
        foreach ($r in $data.ecsServiceRecommendations) {
            if ($r.serviceArn -notmatch 'iceland' -and $r.serviceArn -notmatch $Cluster) { continue }
            $recs += @{
                serviceArn = $r.serviceArn
                finding = $r.finding
                currentCpu = $r.currentServiceConfiguration.cpu
                currentMemory = $r.currentServiceConfiguration.memory
                recommendedCpu = $r.recommendationOptions[0].cpu
                recommendedMemory = $r.recommendationOptions[0].memory
            }
        }
    }
    return @{
        enrolled = $true
        recommendationCount = $recs.Count
        recommendations = $recs
        note = if ($recs.Count -eq 0) { 'No ECS service recommendations — RunTask-only Iceland may not appear until exposed as a service' } else { 'Review recommended CPU/memory in console' }
    }
}

function Build-CostRows([array]$Scenarios) {
    $rows = @()
    foreach ($s in $Scenarios) {
        $hr = Get-FargateHourlyCost $s.vcpu $s.memoryGiB
        $od = [math]::Round($hr * $RunHours, 4)
        $spot = [math]::Round($od * 0.35, 4)
        $rows += @{
            id = $s.id
            label = $s.label
            cpu = $s.cpu
            memoryMiB = $s.memoryMiB
            vcpu = $s.vcpu
            memoryGiB = $s.memoryGiB
            hourlyUsd = [math]::Round($hr, 4)
            onDemandRunUsd = $od
            fargateSpotRunUsd = $spot
            monthlyOnDemandUsd = [math]::Round($od * 12, 3)
        }
    }
    return $rows
}

function Print-DecisionTree {
    Write-Host ''
    Write-Host '=== Purchase model decision tree (Night 31) ==='
    Write-Host 'Steady Fargate/Lambda/EC2 hours? -> Compute Savings Plan (1-3 yr)'
    Write-Host 'Retryable batch (Iceland monthly)? -> Fargate Spot capacity provider'
    Write-Host 'Hard deadline, first-run proof? -> Fargate On-Demand (Night 10)'
    Write-Host 'NAT dominates bill? -> S3 gateway + ECR endpoints (Night 9)'
    Write-Host ''
}

Write-Host '=== Night 31 Lab — Fargate right-sizing (read-only) ==='
Write-Host "Cluster:     $Cluster"
Write-Host "Task family: $TaskFamily"
Write-Host ''

if ($PrintDecisionTree) { Print-DecisionTree }

$live = Get-LiveTaskDefinition
if ($live) {
    Write-Host 'Live task definition:'
    Write-Host ("  {0} (rev {1})" -f $live.arn, $live.revision)
    Write-Host ("  CPU {0} units ({1} vCPU), Memory {2} MiB ({3} GiB)" -f $live.cpu, $live.vcpu, $live.memoryMiB, $live.memoryGiB)
    Write-Host ("  Ephemeral storage: {0} GiB" -f $live.ephemeralStorageGiB)
} else {
    Write-Host 'WARN: Could not describe task definition — using ecs-task-pipeline-sizing.json defaults.'
}

$sizing = Get-Content $SizingFile -Raw | ConvertFrom-Json
$scenarioRows = Build-CostRows @($sizing.scenarios)

Write-Host ''
Write-Host ("=== Cost comparison (~{0} hr wall clock, us-east-1 Linux x86) ===" -f $RunHours)
Write-Host '| Scenario | vCPU | GiB | OD/run | Spot/run | OD x12/mo |'
Write-Host '|----------|------|-----|--------|----------|-----------|'
foreach ($row in $scenarioRows) {
    Write-Host ("| {0} | {1} | {2} | `${3} | `${4} | `${5} |" -f $row.id, $row.vcpu, $row.memoryGiB, $row.onDemandRunUsd, $row.fargateSpotRunUsd, $row.monthlyOnDemandUsd)
}

if ($live) {
    $liveHr = Get-FargateHourlyCost $live.vcpu $live.memoryGiB
    $liveOd = [math]::Round($liveHr * $RunHours, 4)
  $rightsized = $scenarioRows | Where-Object { $_.id -eq 'iceland-rightsized' } | Select-Object -First 1
    if ($rightsized) {
        $save = [math]::Round((1 - ($rightsized.onDemandRunUsd / $liveOd)) * 100)
        Write-Host ''
        Write-Host ("Live vs iceland-rightsized scenario: ~{0}% lower OD/run if workload fits" -f $save)
    }
}

$recent = Get-RecentStoppedTask
if ($recent) {
    Write-Host ''
    Write-Host 'Most recent stopped Iceland task:'
    Write-Host ("  {0}" -f $recent.taskArn)
    Write-Host ("  Duration: {0} min | Exit: {1}" -f $recent.durationMinutes, $recent.exitCode)
} else {
    Write-Host ''
    Write-Host 'No recent stopped Iceland tasks in cluster — run Night 10 or wait for schedule.'
}

$metrics = Get-ContainerMetricsP95
Write-Host ''
Write-Host 'CloudWatch utilization (30 d, service metrics if present):'
Write-Host ("  CPU p95: {0}" -f $(if ($metrics.cpuUtilizationP95) { "$($metrics.cpuUtilizationP95)%" } else { 'n/a' }))
Write-Host ("  Memory p95: {0}" -f $(if ($metrics.memoryUtilizationP95) { "$($metrics.memoryUtilizationP95)%" } else { 'n/a' }))
Write-Host ("  Note: {0}" -f $metrics.note)

$optimizer = Get-ComputeOptimizerEcs
Write-Host ''
Write-Host 'Compute Optimizer (ECS services):'
Write-Host ("  Enrolled: {0} | Recommendations: {1}" -f $optimizer.enrolled, $optimizer.recommendationCount)
Write-Host ("  {0}" -f $optimizer.note)

$result = @{
    night = 31
    region = $Region
    lab = $TagLab
    cluster = $Cluster
    taskFamily = $TaskFamily
    logGroup = $LogGroup
    liveTaskDefinition = $live
    sizingScenarios = $scenarioRows
    recentStoppedTask = $recent
    cloudWatchMetrics = $metrics
    computeOptimizer = $optimizer
    assumedRunHours = $RunHours
    fargateRates = @{
        vcpuPerHour = $FargateVcpuPerHour
        gbPerHour = $FargateGbPerHour
    }
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
}
Write-Utf8NoBom $ResultFile ($result | ConvertTo-Json -Depth 8)
Write-Host ''
Write-Host "Wrote $ResultFile"
Write-Host 'Next: ECS console task def + CloudWatch metrics; take night-31-quiz.json.'
Write-Host 'Teardown: .\HTML\study-lab\night-31-lab-fargate-rightsizing-teardown.ps1'

# Night 27 Lab — EBS gp3 demo, Iceland cost table, optional Spot demo
# Run: .\HTML\study-lab\night-27-lab-ec2-setup.ps1
# Options: -CheckSpotPrices  -CreateSpotDemo

param(
    [switch]$CheckSpotPrices,
    [switch]$CreateSpotDemo
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Az = "${Region}a"
$VolumeName = 'saa-study-night27-gp3-demo'
$SpotName = 'saa-study-night27-spot-demo'
$TaskFamily = 'globalskiatlas-backend-k8s-iceland'
$TagLab = 'night-27'

# Fargate us-east-1 Linux x86 list rates (study approximations — verify in Pricing Calculator)
$FargateVcpuPerHour = 0.04048
$FargateGbPerHour = 0.004445
$RunHours = 2.0

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-27-ec2-result.json'
$IdsFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'
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

function Get-IcelandTaskSizing {
    $cpu = 2048
    $memory = 4096
    $json = Aws-Text @('ecs', 'describe-task-definition', '--task-definition', $TaskFamily, '--region', $Region, '--output', 'json')
    if ($json) {
        try {
            $td = $json | ConvertFrom-Json
            if ($td.taskDefinition.cpu) { $cpu = [int]$td.taskDefinition.cpu }
            if ($td.taskDefinition.memory) { $memory = [int]$td.taskDefinition.memory }
        } catch { }
    }
    return @{ Cpu = $cpu; Memory = $memory; Vcpu = [math]::Round($cpu / 1024, 2); Gb = [math]::Round($memory / 1024, 2) }
}

function Print-CostTable([hashtable]$Sizing) {
    $vcpu = $Sizing.Vcpu
    $gb = $Sizing.Gb
    $fargateHr = ($vcpu * $FargateVcpuPerHour) + ($gb * $FargateGbPerHour)
    $fargateRun = [math]::Round($fargateHr * $RunHours, 3)
    $fargateSpotRun = [math]::Round($fargateRun * 0.35, 3)
    $ec2OdRun = [math]::Round(0.096 * $RunHours, 3)
    $ec2SpotRun = [math]::Round($ec2OdRun * 0.25, 3)

    Write-Host ''
    Write-Host '=== Iceland pipeline cost estimate (one run) ==='
    Write-Host ("Task sizing: {0} CPU units ({1} vCPU), {2} MiB ({3} GiB)" -f $Sizing.Cpu, $vcpu, $Sizing.Memory, $gb)
    Write-Host ("Assumed wall clock: {0} hr" -f $RunHours)
    Write-Host ''
    Write-Host '| Option              | ~Cost per run |'
    Write-Host '|---------------------|---------------|'
    Write-Host ("| Fargate On-Demand   | `${0}        |" -f $fargateRun)
    Write-Host ("| Fargate Spot (~65%) | `${0}        |" -f $fargateSpotRun)
    Write-Host ("| EC2 m6i.large OD    | `${0}        |" -f $ec2OdRun)
    Write-Host ("| EC2 Spot (~75% off) | `${0}        |" -f $ec2SpotRun)
    Write-Host ''
    Write-Host 'See iceland-pipeline-compute.md for NAT/S3 context. Run Pricing Calculator before production commits.'
}

function Get-OrCreateGp3Volume {
    $existing = Aws-Text @(
        'ec2', 'describe-volumes', '--region', $Region,
        '--filters', "Name=tag:Name,Values=$VolumeName",
        '--query', 'Volumes[0].VolumeId'
    )
    if ($existing) {
        Write-Host "Reusing volume $existing ($VolumeName)"
        return $existing
    }

    Write-Host "Creating gp3 volume $VolumeName in $Az ..."
    $volId = Aws-Text @(
        'ec2', 'create-volume', '--region', $Region,
        '--availability-zone', $Az,
        '--size', '8',
        '--volume-type', 'gp3',
        '--iops', '3000',
        '--throughput', '125',
        '--encrypted',
        '--tag-specifications', "ResourceType=volume,Tags=[{Key=Name,Value=$VolumeName},{Key=Lab,Value=$TagLab}]",
        '--query', 'VolumeId'
    )
    if (-not $volId) { throw 'create-volume failed' }

    Write-Host "Waiting for volume $volId available ..."
    Aws-Run @('ec2', 'wait', 'volume-available', '--region', $Region, '--volume-ids', $volId)

    Write-Host 'Modifying gp3 IOPS/throughput (exam: independent of size) ...'
    Aws-Run @(
        'ec2', 'modify-volume', '--region', $Region,
        '--volume-id', $volId,
        '--iops', '4000',
        '--throughput', '250'
    )
    Start-Sleep -Seconds 5
    return $volId
}

function Show-SpotPrices([hashtable]$Sizing) {
    Write-Host ''
    Write-Host '=== Recent Spot prices (us-east-1, Linux) ==='
    foreach ($itype in @('m6i.large', 'm7i.large', 'c6i.large')) {
        $price = Aws-Text @(
            'ec2', 'describe-spot-price-history', '--region', $Region,
            '--instance-types', $itype,
            '--product-descriptions', 'Linux/UNIX',
            '--max-items', '1',
            '--query', 'SpotPriceHistory[0].SpotPrice'
        )
        $od = switch ($itype) {
            'm6i.large' { 0.096 }
            'm7i.large' { 0.1008 }
            default { 0.085 }
        }
        $pct = if ($price) { [math]::Round((1 - [double]$price / $od) * 100) } else { 0 }
        $priceLabel = if ($price) { $price } else { 'n/a' }
        Write-Host ("{0}: Spot `${1}/hr (~{2}% off On-Demand `${3})" -f $itype, $priceLabel, $pct, $od)
    }
}

function New-SpotDemo {
    if (-not (Test-Path $IdsFile)) {
        Write-Host "Skipping Spot demo — missing $IdsFile (run Night 9 VPC build first)."
        return $null
    }
    $ids = Get-Content $IdsFile -Raw | ConvertFrom-Json
    $subnet = $ids.subnets.publicA.id
    if (-not $subnet) { $subnet = $ids.subnets.privateA.id }

    $ami = Aws-Text @(
        'ec2', 'describe-images', '--region', $Region,
        '--owners', 'amazon',
        '--filters', 'Name=name,Values=al2023-ami-2023*', 'Name=architecture,Values=x86_64',
        '--query', 'Images | sort_by(@, &CreationDate) | [-1].ImageId'
    )
    if (-not $ami) { throw 'Could not resolve Amazon Linux 2023 AMI' }

    $userData = @'
#!/bin/bash
echo "Night 27 Spot demo — self-terminating in 3 minutes"
sleep 180
shutdown -h now
'@
    $userDataB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($userData))

    Write-Host "Requesting Spot t3.micro ($SpotName) ..."
    $reqJson = aws ec2 request-spot-instances --region $Region --output json `
        --spot-price '0.02' `
        --instance-count 1 `
        --type 'one-time' `
        --launch-specification "ImageId=$ami,InstanceType=t3.micro,SubnetId=$subnet,UserData=$userDataB64" `
        --tag-specifications "ResourceType=spot-instances-request,Tags=[{Key=Name,Value=$SpotName},{Key=Lab,Value=$TagLab}]"

    if ($LASTEXITCODE -ne 0) { throw 'request-spot-instances failed' }
    $req = $reqJson | ConvertFrom-Json
    $reqId = $req.SpotInstanceRequests[0].SpotInstanceRequestId
    Write-Host "Spot request: $reqId (terminates ~3 min after launch)"
    return $reqId
}

Write-Host '=== Night 27 EC2 + EBS + Spot lab ==='

$Sizing = Get-IcelandTaskSizing
Print-CostTable $Sizing

$volumeId = Get-OrCreateGp3Volume
$volInfo = aws ec2 describe-volumes --region $Region --volume-ids $volumeId --output json | ConvertFrom-Json
$vol = $volInfo.Volumes[0]
Write-Host ''
Write-Host ("Volume {0}: type={1} size={2}GiB iops={3} throughput={4}" -f $volumeId, $vol.VolumeType, $vol.Size, $vol.Iops, $vol.Throughput)

$spotReqId = $null
if ($CheckSpotPrices) { Show-SpotPrices $Sizing }
if ($CreateSpotDemo) { $spotReqId = New-SpotDemo }

$result = @{
    region           = $Region
    lab              = $TagLab
    volumeId         = $volumeId
    volumeName       = $VolumeName
    taskFamily       = $TaskFamily
    taskCpu          = $Sizing.Cpu
    taskMemoryMiB    = $Sizing.Memory
    assumedRunHours  = $RunHours
    spotRequestId    = $spotReqId
    createdAt        = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Depth 5

Write-Utf8NoBom $ResultFile $result
Write-Host ''
Write-Host "Wrote $ResultFile"
Write-Host 'Teardown: .\HTML\study-lab\night-27-lab-ec2-teardown.ps1'

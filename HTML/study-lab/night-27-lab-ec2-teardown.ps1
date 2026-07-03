# Night 27 teardown — gp3 study volume + Spot demo
# Run: .\HTML\study-lab\night-27-lab-ec2-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$VolumeName = 'saa-study-night27-gp3-demo'
$SpotName = 'saa-study-night27-spot-demo'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-27-ec2-result.json'

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

$volumeId = $null
$spotReqId = $null
if (Test-Path $ResultFile) {
    $saved = Get-Content $ResultFile -Raw | ConvertFrom-Json
    $volumeId = $saved.volumeId
    $spotReqId = $saved.spotRequestId
}

Write-Host '=== Night 27 EC2 lab teardown ==='

# Terminate Spot demo instances by tag
$instIds = Aws-Text @(
    'ec2', 'describe-instances', '--region', $Region,
    '--filters', "Name=tag:Name,Values=$SpotName", 'Name=instance-state-name,Values=pending,running,stopping',
    '--query', 'Reservations[].Instances[].InstanceId'
)
if ($instIds) {
    $ids = ($instIds -split "`t|`n| ") | Where-Object { $_ -match '^i-' }
    if ($ids.Count -gt 0) {
        Write-Host "Terminating Spot demo instances: $($ids -join ', ')"
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        aws ec2 terminate-instances --region $Region --instance-ids $ids 2>$null | Out-Null
        $ErrorActionPreference = $prev
    }
}

if (-not $spotReqId) {
    $spotReqId = Aws-Text @(
        'ec2', 'describe-spot-instance-requests', '--region', $Region,
        '--filters', "Name=tag:Name,Values=$SpotName", 'Name=state,Values=open,active',
        '--query', 'SpotInstanceRequests[0].SpotInstanceRequestId'
    )
}
if ($spotReqId) {
    Write-Host "Cancelling Spot request $spotReqId ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    aws ec2 cancel-spot-instance-requests --region $Region --spot-instance-request-ids $spotReqId 2>$null | Out-Null
    $ErrorActionPreference = $prev
}

if (-not $volumeId) {
    $volumeId = Aws-Text @(
        'ec2', 'describe-volumes', '--region', $Region,
        '--filters', "Name=tag:Name,Values=$VolumeName",
        '--query', 'Volumes[0].VolumeId'
    )
}
if ($volumeId) {
    $state = Aws-Text @('ec2', 'describe-volumes', '--region', $Region, '--volume-ids', $volumeId, '--query', 'Volumes[0].State')
    if ($state -eq 'in-use') {
        $attach = Aws-Text @('ec2', 'describe-volumes', '--region', $Region, '--volume-ids', $volumeId, '--query', 'Volumes[0].Attachments[0].InstanceId')
        Write-Host "Detaching $volumeId from $attach ..."
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        aws ec2 detach-volume --region $Region --volume-id $volumeId --force 2>$null | Out-Null
        aws ec2 wait volume-available --region $Region --volume-ids $volumeId 2>$null | Out-Null
        $ErrorActionPreference = $prev
    }
    Write-Host "Deleting volume $volumeId ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    aws ec2 delete-volume --region $Region --volume-id $volumeId 2>$null | Out-Null
    $ErrorActionPreference = $prev
}

if (Test-Path $ResultFile) {
    Remove-Item $ResultFile -Force
    Write-Host "Removed $ResultFile"
}

Write-Host 'Done. Iceland ECS task definitions and Night 9 VPC unchanged.'

# Night 25 teardown - night25-* Route 53 records + night-25 health check
# Run: .\HTML\study-lab\night-25-lab-route53-teardown.ps1

$ErrorActionPreference = 'Stop'
$Domain = 'witcoskitech.com'
$LabPrefix = 'night25'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-25-route53-result.json'
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

$zoneId = $null
$healthCheckId = $null
if (Test-Path $ResultFile) {
    $saved = Get-Content $ResultFile -Raw | ConvertFrom-Json
    $zoneId = $saved.hostedZoneId
    $healthCheckId = $saved.healthCheckId
}

if (-not $zoneId) {
    $zones = aws route53 list-hosted-zones-by-name --dns-name $Domain --output json | ConvertFrom-Json
    $zone = @($zones.HostedZones | Where-Object { $_.Name -eq "$Domain." }) | Select-Object -First 1
    if ($zone) {
        $zoneId = $zone.Id -replace '^/hostedzone/', ''
    }
}

if (-not $zoneId) {
    Write-Host "No hosted zone for $Domain - nothing to tear down."
    exit 0
}

Write-Host "Listing night25-* records in zone $zoneId ..."
$json = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --output json | ConvertFrom-Json
$toDelete = @($json.ResourceRecordSets | Where-Object { $_.Name -like "$LabPrefix-*.$Domain." })

if ($toDelete.Count -eq 0) {
    Write-Host 'No night25-* records found.'
} else {
    $changes = foreach ($rr in $toDelete) {
        @{ Action = 'DELETE'; ResourceRecordSet = $rr }
    }
    $batch = @{ Changes = $changes } | ConvertTo-Json -Depth 12
    $tmp = Join-Path $env:TEMP "night25-r53-delete-$(Get-Random).json"
    Write-Utf8NoBom $tmp $batch
    Write-Host "Deleting $($toDelete.Count) record set(s) ..."
    $fileUri = 'file://' + ($tmp -replace '\\', '/')
    aws route53 change-resource-record-sets --hosted-zone-id $zoneId --change-batch $fileUri
    Remove-Item $tmp -ErrorAction SilentlyContinue
}

if (-not $healthCheckId) {
    $hcJson = aws route53 list-health-checks --output json | ConvertFrom-Json
    foreach ($hc in @($hcJson.HealthChecks)) {
        $cfg = $hc.HealthCheckConfig
        if ($cfg.FullyQualifiedDomainName -eq $Domain -and $cfg.Type -eq 'HTTPS') {
            $tagsJson = aws route53 list-tags-for-resource `
                --resource-type healthcheck `
                --resource-id $hc.Id `
                --output json | ConvertFrom-Json
            $labTag = @($tagsJson.ResourceTagSet.Tags | Where-Object {
                $_.Key -eq 'saa-study-lab' -and $_.Value -eq 'night-25'
            }) | Select-Object -First 1
            if ($labTag) {
                $healthCheckId = $hc.Id
                break
            }
        }
    }
}

if ($healthCheckId) {
    Write-Host "Deleting health check $healthCheckId ..."
    aws route53 delete-health-check --health-check-id $healthCheckId
}

if (Test-Path $ResultFile) {
    Remove-Item $ResultFile -Force
    Write-Host "Removed $ResultFile"
}

Write-Host "Done. Apex $Domain and www records unchanged."

# Night 25 Lab 3C - Route 53 routing policies on witcoskitech.com lab subdomains
# Run: .\HTML\study-lab\night-25-lab-route53-setup.ps1
# Options: -TestDns  -SkipHealthCheck

param(
    [switch]$TestDns,
    [switch]$SkipHealthCheck
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Domain = 'witcoskitech.com'
$CfAliasZoneId = 'Z2FDTNDATAQYW2'
$HealthCheckName = 'saa-study-night25-witco-https'
$LabPrefix = 'night25'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-25-route53-result.json'
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

function Get-CloudFrontDomain {
    $json = aws cloudfront list-distributions --region $Region --output json | ConvertFrom-Json
    $items = @($json.DistributionList.Items)
    foreach ($dist in $items) {
        if ($null -eq $dist) { continue }
        $aliases = @($dist.Aliases.Items)
        if ($aliases -contains $Domain) {
            $name = $dist.DomainName
            if (-not $name.EndsWith('.')) { $name += '.' }
            return $name
        }
    }
    throw "No CloudFront distribution with alias $Domain found in this account."
}

function Get-HostedZoneId {
    $zones = aws route53 list-hosted-zones-by-name --dns-name $Domain --output json | ConvertFrom-Json
    $zone = @($zones.HostedZones | Where-Object { $_.Name -eq "$Domain." }) | Select-Object -First 1
    if (-not $zone) {
        throw "Hosted zone for $Domain not found - register domain or create zone first."
    }
    return ($zone.Id -replace '^/hostedzone/', '')
}

function New-AliasTarget([string]$DnsName) {
    return @{
        HostedZoneId         = $CfAliasZoneId
        DNSName              = $DnsName
        EvaluateTargetHealth = $false
    }
}

function Invoke-Route53Change([string]$ZoneId, [hashtable[]]$Changes) {
    $batch = @{ Changes = $Changes } | ConvertTo-Json -Depth 10 -Compress:$false
    $tmp = Join-Path $env:TEMP "night25-r53-change-$(Get-Random).json"
    Write-Utf8NoBom $tmp $batch
    try {
        $fileUri = 'file://' + ($tmp -replace '\\', '/')
        Aws-Run @('route53', 'change-resource-record-sets', '--hosted-zone-id', $ZoneId, '--change-batch', $fileUri)
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

function Get-Night25HealthCheckId {
    $json = aws route53 list-health-checks --output json | ConvertFrom-Json
    foreach ($hc in @($json.HealthChecks)) {
        $cfg = $hc.HealthCheckConfig
        if ($cfg.FullyQualifiedDomainName -ne $Domain -or $cfg.Type -ne 'HTTPS') { continue }
        $tagsJson = aws route53 list-tags-for-resource `
            --resource-type healthcheck `
            --resource-id $hc.Id `
            --output json | ConvertFrom-Json
        $labTag = @($tagsJson.ResourceTagSet.Tags | Where-Object {
            $_.Key -eq 'saa-study-lab' -and $_.Value -eq 'night-25'
        }) | Select-Object -First 1
        if ($labTag) { return $hc.Id }
        # Untagged night-25 candidate from a prior failed run - tag and reuse
        if ($cfg.ResourcePath -eq '/HTML/index.html') {
            Write-Host "Tagging orphaned health check $($hc.Id) from prior run ..."
            Aws-Run @(
                'route53', 'change-tags-for-resource',
                '--resource-type', 'healthcheck',
                '--resource-id', $hc.Id,
                '--add-tags', 'Key=saa-study-lab,Value=night-25', "Key=Name,Value=$HealthCheckName"
            )
            return $hc.Id
        }
    }
    return $null
}

function Ensure-HealthCheck {
    $existing = Get-Night25HealthCheckId
    if ($existing) {
        Write-Host "Reusing health check $existing"
        return $existing
    }

    $caller = "night25-$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "Creating HTTPS health check on https://$Domain/HTML/index.html ..."
    $config = @{
        Type                     = 'HTTPS'
        ResourcePath             = '/HTML/index.html'
        FullyQualifiedDomainName = $Domain
        Port                     = 443
        RequestInterval          = 30
        FailureThreshold         = 3
        EnableSNI                = $true
    } | ConvertTo-Json -Compress
    $hcJson = Join-Path $env:TEMP "night25-hc-$caller.json"
    Write-Utf8NoBom $hcJson $config
    $hcFileUri = 'file://' + ($hcJson -replace '\\', '/')
    $hcId = aws route53 create-health-check `
        --caller-reference $caller `
        --health-check-config $hcFileUri `
        --query 'HealthCheck.Id' --output text
    Remove-Item $hcJson -ErrorAction SilentlyContinue
    if (-not $hcId) { throw 'create-health-check failed' }

    Aws-Run @(
        'route53', 'change-tags-for-resource',
        '--resource-type', 'healthcheck',
        '--resource-id', $hcId,
        '--add-tags', 'Key=saa-study-lab,Value=night-25', "Key=Name,Value=$HealthCheckName"
    )
    return $hcId
}

Write-Host '=== Night 25 Route 53 lab setup ==='
$zoneId = Get-HostedZoneId
$cfDomain = Get-CloudFrontDomain
Write-Host "Hosted zone: $zoneId"
Write-Host "CloudFront alias target: $cfDomain"

$healthCheckId = $null
if (-not $SkipHealthCheck) {
    $healthCheckId = Ensure-HealthCheck
    Write-Host "Health check: $healthCheckId (wait 1-2 min for Healthy)"
} else {
    Write-Host 'Skipping health check (-SkipHealthCheck) - failover record created without check.'
}

$alias = New-AliasTarget $cfDomain
$changes = [System.Collections.Generic.List[hashtable]]::new()

$changes.Add(@{
    Action            = 'UPSERT'
    ResourceRecordSet = @{
        Name        = "$LabPrefix-simple.$Domain"
        Type        = 'A'
        AliasTarget = $alias
    }
})

$changes.Add(@{
    Action            = 'UPSERT'
    ResourceRecordSet = @{
        Name          = "$LabPrefix-weighted.$Domain"
        Type          = 'A'
        SetIdentifier = 'weighted-primary-80'
        Weight        = 80
        AliasTarget   = $alias
    }
})
$changes.Add(@{
    Action            = 'UPSERT'
    ResourceRecordSet = @{
        Name          = "$LabPrefix-weighted.$Domain"
        Type          = 'A'
        SetIdentifier = 'weighted-canary-20'
        Weight        = 20
        AliasTarget   = $alias
    }
})

$primaryRecord = @{
    Name          = "$LabPrefix-failover.$Domain"
    Type          = 'A'
    SetIdentifier = 'failover-primary'
    Failover      = 'PRIMARY'
    AliasTarget   = $alias
}
if ($healthCheckId) { $primaryRecord['HealthCheckId'] = $healthCheckId }
$changes.Add(@{ Action = 'UPSERT'; ResourceRecordSet = $primaryRecord })

$changes.Add(@{
    Action            = 'UPSERT'
    ResourceRecordSet = @{
        Name          = "$LabPrefix-failover.$Domain"
        Type          = 'A'
        SetIdentifier = 'failover-secondary-www'
        Failover      = 'SECONDARY'
        AliasTarget   = (New-AliasTarget $cfDomain)
    }
})

$changes.Add(@{
    Action            = 'UPSERT'
    ResourceRecordSet = @{
        Name          = "$LabPrefix-latency.$Domain"
        Type          = 'A'
        SetIdentifier = 'latency-use1'
        Region        = 'us-east-1'
        AliasTarget   = $alias
    }
})

$changes.Add(@{
    Action            = 'UPSERT'
    ResourceRecordSet = @{
        Name          = "$LabPrefix-geo.$Domain"
        Type          = 'A'
        SetIdentifier = 'geo-us'
        GeoLocation   = @{ CountryCode = 'US' }
        AliasTarget   = $alias
    }
})
$changes.Add(@{
    Action            = 'UPSERT'
    ResourceRecordSet = @{
        Name          = "$LabPrefix-geo.$Domain"
        Type          = 'A'
        SetIdentifier = 'geo-default'
        GeoLocation   = @{ CountryCode = '*' }
        AliasTarget   = $alias
    }
})

Write-Host "UPSERTing $($changes.Count) record sets (night25-* only) ..."
Invoke-Route53Change $zoneId $changes.ToArray()

$records = @(
    "$LabPrefix-simple.$Domain",
    "$LabPrefix-weighted.$Domain",
    "$LabPrefix-failover.$Domain",
    "$LabPrefix-latency.$Domain",
    "$LabPrefix-geo.$Domain"
)

$result = @{
    lab                   = 'night-25-lab3c-route53'
    region                = $Region
    domain                = $Domain
    hostedZoneId          = $zoneId
    cloudFrontDomain      = $cfDomain.TrimEnd('.')
    cloudFrontAliasZoneId = $CfAliasZoneId
    healthCheckId         = $healthCheckId
    recordNames           = $records
    policies              = @('simple', 'weighted', 'failover', 'latency', 'geolocation')
    createdAt             = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}
$result | ConvertTo-Json -Depth 5 | Set-Content $ResultFile -Encoding UTF8
Write-Host "Wrote $ResultFile"

if ($TestDns) {
    Write-Host ''
    Write-Host '--- DNS lookups (may fail for 1-2 min while change status is PENDING) ---'
    foreach ($name in $records) {
        Write-Host "nslookup $name"
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        nslookup $name 2>&1 | Write-Host
        $ErrorActionPreference = $prev
    }
}

Write-Host ''
Write-Host 'Validate: Route 53 console -> Health checks (if created) -> Hosted zone -> night25-* records'
Write-Host 'Teardown: .\HTML\study-lab\night-25-lab-route53-teardown.ps1'

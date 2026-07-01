# Night 26 teardown — dashboard, cache policy, throttle demo, revert iceberg behavior
# Run: .\HTML\study-lab\night-26-lab-cloudfront-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Domain = 'globalskiatlas.com'
$DashboardName = 'saa-study-night26-api-perf'
$CachePolicyName = 'saa-study-night26-wiki-get'
$ThrottleApiName = 'saa-study-night26-throttle'
$CachingDisabledPolicyId = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad'
$WikiPathPattern = 'api/wiki*'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-26-cloudfront-result.json'
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

$distributionId = $null
$cachePolicyId = $null
$wikiApplied = $false
if (Test-Path $ResultFile) {
    $saved = Get-Content $ResultFile -Raw | ConvertFrom-Json
    $distributionId = $saved.distributionId
    $cachePolicyId = $saved.cachePolicyId
    if ($saved.PSObject.Properties.Name -contains 'wikiCacheApplied') {
        $wikiApplied = [bool]$saved.wikiCacheApplied
    } elseif ($saved.PSObject.Properties.Name -contains 'icebergCacheApplied') {
        $wikiApplied = [bool]$saved.icebergCacheApplied
    }
}

Write-Host '=== Night 26 CloudFront lab teardown ==='

Write-Host "Deleting dashboard $DashboardName ..."
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
aws cloudwatch delete-dashboards --dashboard-names $DashboardName --region $Region 2>$null | Out-Null
$ErrorActionPreference = $prev

$apiId = Aws-Text @('apigateway', 'get-rest-apis', '--region', $Region, '--query', "items[?name=='$ThrottleApiName'].id | [0]")
if ($apiId) {
    Write-Host "Deleting throttle demo API $apiId ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    aws apigateway delete-rest-api --region $Region --rest-api-id $apiId 2>$null | Out-Null
    $ErrorActionPreference = $prev
}

$keyId = Aws-Text @('apigateway', 'get-api-keys', '--region', $Region, '--query', "items[?name=='${ThrottleApiName}-key'].id | [0]")
if ($keyId) {
    Write-Host "Deleting API key $keyId ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    aws apigateway delete-api-key --region $Region --api-key $keyId 2>$null | Out-Null
    $ErrorActionPreference = $prev
}

$planId = Aws-Text @('apigateway', 'get-usage-plans', '--region', $Region, '--query', "items[?name=='${ThrottleApiName}-plan'].id | [0]")
if ($planId) {
    Write-Host "Deleting usage plan $planId ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    aws apigateway delete-usage-plan --region $Region --usage-plan-id $planId 2>$null | Out-Null
    $ErrorActionPreference = $prev
}

if (-not $distributionId) {
    $distributionId = Aws-Text @(
        'cloudfront', 'list-distributions', '--query',
        "DistributionList.Items[?contains(join(',', Aliases.Items || \`['\`']), '$Domain')].Id | [0]"
    )
}

if ($wikiApplied -and $distributionId) {
    Write-Host "Reverting $WikiPathPattern to CachingDisabled on $distributionId ..."
    $etag = Aws-Text @('cloudfront', 'get-distribution-config', '--id', $distributionId, '--query', 'ETag')
    if ($etag) {
        $cfgJson = aws cloudfront get-distribution-config --id $distributionId --output json
        if ($LASTEXITCODE -eq 0) {
            $config = ($cfgJson | ConvertFrom-Json).DistributionConfig
            foreach ($behavior in @($config.CacheBehaviors.Items)) {
                if ($behavior.PathPattern -eq $WikiPathPattern) {
                    $behavior.CachePolicyId = $CachingDisabledPolicyId
                    break
                }
            }
            $update = $config | ConvertTo-Json -Depth 20 -Compress
            $tmp = Join-Path $env:TEMP "night26-cf-revert-$(Get-Random).json"
            Write-Utf8NoBom $tmp $update
            $fileUri = 'file://' + ($tmp -replace '\\', '/')
            $prev = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            aws cloudfront update-distribution --id $distributionId --if-match $etag --distribution-config $fileUri 2>$null | Out-Null
            $ErrorActionPreference = $prev
            Remove-Item $tmp -ErrorAction SilentlyContinue
            Write-Host 'CloudFront revert submitted — wait for Deployed before deleting cache policy'
        }
    }
}

if (-not $cachePolicyId) {
    $json = aws cloudfront list-cache-policies --type custom --output json | ConvertFrom-Json
    foreach ($item in @($json.CachePolicyList.Items)) {
        if ($null -eq $item) { continue }
        if ($item.CachePolicy.CachePolicyConfig.Name -eq $CachePolicyName) {
            $cachePolicyId = $item.CachePolicy.Id
            break
        }
    }
}

if ($cachePolicyId) {
    Write-Host "Deleting cache policy $cachePolicyId (must not be attached) ..."
    $etag = Aws-Text @('cloudfront', 'get-cache-policy', '--id', $cachePolicyId, '--query', 'ETag')
    if ($etag) {
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        aws cloudfront delete-cache-policy --id $cachePolicyId --if-match $etag 2>&1 | Write-Host
        $ErrorActionPreference = $prev
    }
}

if (Test-Path $ResultFile) {
    Remove-Item $ResultFile -Force
    Write-Host "Removed $ResultFile"
}

Write-Host 'Done. GSA CloudFront distribution, wiki API, and S3 unchanged (unless wiki cache revert still deploying).'

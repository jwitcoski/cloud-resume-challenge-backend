# Night 26 — CloudFront API perf lab: dashboard, cache policy, optional throttle demo
# Run: .\HTML\study-lab\night-26-lab-cloudfront-setup.ps1
# Options: -TestCache  -CreateThrottleDemo  -ApplyWikiCache

param(
    [switch]$TestCache,
    [switch]$CreateThrottleDemo,
    [Alias('ApplyIcebergCache')]
    [switch]$ApplyWikiCache
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Domain = 'globalskiatlas.com'
$DashboardName = 'saa-study-night26-api-perf'
$CachePolicyName = 'saa-study-night26-wiki-get'
$ThrottleApiName = 'saa-study-night26-throttle'
$CachingDisabledPolicyId = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad'
$WikiPathPattern = 'api/wiki*'
$ProbeUrl = "https://$Domain/api/wiki/pages"
$TagLab = 'night-26'

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

function Aws-Run([string[]]$AwsArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & aws @AwsArgs 2>&1 | Out-String | Write-Host
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "aws $($AwsArgs -join ' ') failed (exit $code)" }
}

function Get-GsaCloudFrontDistribution {
    $json = aws cloudfront list-distributions --output json | ConvertFrom-Json
    foreach ($dist in @($json.DistributionList.Items)) {
        if ($null -eq $dist) { continue }
        $aliases = @($dist.Aliases.Items)
        if ($aliases -contains $Domain) {
            return @{
                Id     = $dist.Id
                Domain = $dist.DomainName
                Status = $dist.Status
            }
        }
    }
    throw "No CloudFront distribution with alias $Domain found in this account."
}

function Get-Night26CachePolicyId {
    $json = aws cloudfront list-cache-policies --type custom --output json | ConvertFrom-Json
    $items = @($json.CachePolicyList.Items)
    foreach ($item in $items) {
        if ($null -eq $item) { continue }
        $cfg = $item.CachePolicy.CachePolicyConfig
        if ($cfg.Name -eq $CachePolicyName) {
            return $item.CachePolicy.Id
        }
    }
    return $null
}

function New-Night26CachePolicy {
    $existing = Get-Night26CachePolicyId
    if ($existing) {
        Write-Host "Reusing cache policy $existing ($CachePolicyName)"
        return $existing
    }

    $tmp = Join-Path $env:TEMP "night26-cache-policy-$(Get-Random).json"
    @"
{
  "Name": "$CachePolicyName",
  "Comment": "Night 26 study - short TTL wiki/JSON GET; respects origin Cache-Control",
  "DefaultTTL": 60,
  "MaxTTL": 300,
  "MinTTL": 0,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "HeadersConfig": {
      "HeaderBehavior": "whitelist",
      "Headers": { "Quantity": 1, "Items": ["Cache-Control"] }
    },
    "CookiesConfig": { "CookieBehavior": "none" },
    "QueryStringsConfig": { "QueryStringBehavior": "none" }
  }
}
"@ | Set-Content -Path $tmp -Encoding Ascii -NoNewline

    try {
        $fileUri = 'file://' + ($tmp -replace '\\', '/')
        $id = aws cloudfront create-cache-policy --cache-policy-config $fileUri --query 'CachePolicy.Id' --output text
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
    if (-not $id) { throw 'create-cache-policy failed' }
    Write-Host "Created cache policy $id"
    return $id
}

function New-Night26Dashboard([string]$DistributionId) {
    $tmp = Join-Path $env:TEMP "night26-dashboard-$(Get-Random).json"
    @"
{
  "widgets": [
    {
      "type": "metric",
      "x": 0, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "CloudFront Cache Hit Rate (%)",
        "view": "timeSeries",
        "stacked": false,
        "region": "$Region",
        "period": 300,
        "stat": "Average",
        "metrics": [
          ["AWS/CloudFront", "CacheHitRate", "DistributionId", "$DistributionId", "Region", "Global"]
        ]
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "CloudFront Requests",
        "view": "timeSeries",
        "stacked": false,
        "region": "$Region",
        "period": 300,
        "stat": "Sum",
        "metrics": [
          ["AWS/CloudFront", "Requests", "DistributionId", "$DistributionId", "Region", "Global"]
        ]
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 6, "width": 12, "height": 6,
      "properties": {
        "title": "CloudFront Origin Latency (ms)",
        "view": "timeSeries",
        "stacked": false,
        "region": "$Region",
        "period": 300,
        "stat": "Average",
        "metrics": [
          ["AWS/CloudFront", "OriginLatency", "DistributionId", "$DistributionId", "Region", "Global"]
        ]
      }
    },
    {
      "type": "text",
      "x": 12, "y": 6, "width": 12, "height": 6,
      "properties": {
        "markdown": "## Night 26 API perf\\n- Distribution: $DistributionId\\n- Probe: $ProbeUrl\\n- Teardown: night-26-lab-cloudfront-teardown.ps1"
      }
    }
  ]
}
"@ | Set-Content -Path $tmp -Encoding Ascii -NoNewline
    try {
        Aws-Run @('cloudwatch', 'put-dashboard', '--dashboard-name', $DashboardName, '--dashboard-body', "file://$($tmp -replace '\\', '/')", '--region', $Region)
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
    Write-Host "Dashboard $DashboardName created/updated"
}

function Set-CacheBehaviorPolicy([string]$DistributionId, [string]$PathPattern, [string]$CachePolicyId) {
    $etag = Aws-Text @('cloudfront', 'get-distribution-config', '--id', $DistributionId, '--query', 'ETag')
    if (-not $etag) { throw 'get-distribution-config ETag missing' }

    $cfgJson = aws cloudfront get-distribution-config --id $DistributionId --output json
    if ($LASTEXITCODE -ne 0) { throw 'get-distribution-config failed' }
    $parsed = $cfgJson | ConvertFrom-Json
    $config = $parsed.DistributionConfig

    $found = $false
    foreach ($behavior in @($config.CacheBehaviors.Items)) {
        if ($behavior.PathPattern -eq $PathPattern) {
            $behavior.CachePolicyId = $CachePolicyId
            $found = $true
            Write-Host "Updating behavior $($behavior.PathPattern) -> cache policy $CachePolicyId"
            break
        }
    }
    if (-not $found) {
        throw "Path pattern $PathPattern not found on distribution $DistributionId"
    }

    $update = $config | ConvertTo-Json -Depth 20 -Compress
    $tmp = Join-Path $env:TEMP "night26-cf-update-$(Get-Random).json"
    $update | Set-Content -Path $tmp -Encoding Ascii
    try {
        $fileUri = 'file://' + ($tmp -replace '\\', '/')
        Aws-Run @('cloudfront', 'update-distribution', '--id', $DistributionId, '--if-match', $etag, '--distribution-config', $fileUri)
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
    Write-Host 'CloudFront update submitted — allow 5-15 min for Deployed status'
}

function Write-AwsJsonFile([string]$Prefix, [string]$JsonContent) {
    $path = Join-Path $env:TEMP "$Prefix-$(Get-Random).json"
    $JsonContent | Set-Content -Path $path -Encoding Ascii -NoNewline
    return 'file://' + ($path -replace '\\', '/')
}

function New-ThrottleDemoApi {
    $existingId = Aws-Text @('apigateway', 'get-rest-apis', '--region', $Region, '--query', "items[?name=='$ThrottleApiName'].id | [0]")
    if ($existingId -and $existingId -ne 'None') {
        $planId = Aws-Text @('apigateway', 'get-usage-plans', '--region', $Region, '--query', "items[?name=='${ThrottleApiName}-plan'].id | [0]")
        if ($planId -and $planId -ne 'None') {
            Write-Host "Reusing throttle demo API $existingId"
            return Get-ThrottleDemoDetails $existingId
        }
        Write-Host "Removing incomplete throttle demo API $existingId ..."
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        aws apigateway delete-rest-api --region $Region --rest-api-id $existingId 2>$null | Out-Null
        $ErrorActionPreference = $prev
    }

    Write-Host "Creating throttle demo REST API $ThrottleApiName ..."
    $apiId = Aws-Text @('apigateway', 'create-rest-api', '--region', $Region, '--name', $ThrottleApiName, '--endpoint-configuration', 'types=REGIONAL', '--query', 'id')
    if (-not $apiId) { throw 'create-rest-api failed' }

    $rootId = Aws-Text @('apigateway', 'get-resources', '--region', $Region, '--rest-api-id', $apiId, '--query', 'items[?path==`/`].id | [0]')
    Aws-Run @('apigateway', 'put-method', '--region', $Region, '--rest-api-id', $apiId, '--resource-id', $rootId, '--http-method', 'GET', '--authorization-type', 'NONE')

    $reqTpl = Write-AwsJsonFile 'night26-req-tpl' '{"application/json":"{\"statusCode\":200}"}'
    Aws-Run @(
        'apigateway', 'put-integration', '--region', $Region,
        '--rest-api-id', $apiId, '--resource-id', $rootId, '--http-method', 'GET',
        '--type', 'MOCK', '--request-templates', $reqTpl
    )
    Aws-Run @(
        'apigateway', 'put-method-response', '--region', $Region,
        '--rest-api-id', $apiId, '--resource-id', $rootId, '--http-method', 'GET',
        '--status-code', '200',
        '--response-parameters', 'method.response.header.Content-Type=false'
    )
    $respTpl = Write-AwsJsonFile 'night26-resp-tpl' '{"application/json":"{\"ok\":true,\"lab\":\"night-26-throttle\"}"}'
    Aws-Run @(
        'apigateway', 'put-integration-response', '--region', $Region,
        '--rest-api-id', $apiId, '--resource-id', $rootId, '--http-method', 'GET',
        '--status-code', '200', '--response-templates', $respTpl
    )

    Aws-Run @('apigateway', 'create-deployment', '--region', $Region, '--rest-api-id', $apiId, '--stage-name', 'prod')
    Aws-Run @(
        'apigateway', 'update-stage', '--region', $Region,
        '--rest-api-id', $apiId, '--stage-name', 'prod',
        '--patch-operations',
        'op=replace,path=/*/*/throttling/burstLimit,value=5',
        'op=replace,path=/*/*/throttling/rateLimit,value=2'
    )

    $planId = Aws-Text @(
        'apigateway', 'create-usage-plan', '--region', $Region,
        '--name', "$ThrottleApiName-plan",
        '--api-stages', "apiId=$apiId,stage=prod",
        '--throttle', 'burstLimit=5,rateLimit=2',
        '--query', 'id'
    )
    $keyId = Aws-Text @('apigateway', 'create-api-key', '--region', $Region, '--name', "$ThrottleApiName-key", '--enabled', '--query', 'id')
    $keyValue = Aws-Text @('apigateway', 'get-api-key', '--region', $Region, '--api-key', $keyId, '--include-value', '--query', 'value')
    Aws-Run @('apigateway', 'create-usage-plan-key', '--region', $Region, '--usage-plan-id', $planId, '--key-id', $keyId, '--key-type', 'API_KEY')

    $invokeUrl = "https://${apiId}.execute-api.${Region}.amazonaws.com/prod"
    return @{
        apiId     = $apiId
        invokeUrl = $invokeUrl
        apiKeyId  = $keyId
        apiKey    = $keyValue
        usagePlan = $planId
    }
}

function Get-ThrottleDemoDetails([string]$ApiId) {
    $keyId = Aws-Text @('apigateway', 'get-api-keys', '--region', $Region, '--query', "items[?name=='${ThrottleApiName}-key'].id | [0]")
    $keyValue = $null
    if ($keyId -and $keyId -ne 'None') {
        $keyValue = Aws-Text @('apigateway', 'get-api-key', '--region', $Region, '--api-key', $keyId, '--include-value', '--query', 'value')
    }
    $planId = Aws-Text @('apigateway', 'get-usage-plans', '--region', $Region, '--query', "items[?name=='${ThrottleApiName}-plan'].id | [0]")
    return @{
        apiId     = $ApiId
        invokeUrl = "https://${ApiId}.execute-api.${Region}.amazonaws.com/prod"
        apiKeyId  = $keyId
        apiKey    = $keyValue
        usagePlan = $planId
    }
}

function Test-CacheHeaders {
    Write-Host ''
    Write-Host "--- Cache probe: $ProbeUrl (two requests) ---"
    foreach ($i in 1..2) {
        Write-Host "Request $i :"
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
            curl.exe -sI $ProbeUrl 2>&1 | Select-String -Pattern 'HTTP/|x-cache|age:|cache-control' -CaseSensitive:$false | ForEach-Object { Write-Host $_.Line }
        } else {
            try {
                $r = Invoke-WebRequest -Uri $ProbeUrl -Method Head -UseBasicParsing
                Write-Host "Status: $($r.StatusCode)"
                foreach ($h in @('X-Cache', 'Age', 'Cache-Control')) {
                    if ($r.Headers[$h]) { Write-Host "${h}: $($r.Headers[$h])" }
                }
            } catch {
                Write-Host "Request failed: $_"
            }
        }
        $ErrorActionPreference = $prev
        Start-Sleep -Seconds 1
    }
    Write-Host 'With CachingDisabled on api/wiki* expect Miss on every request unless -ApplyWikiCache and origin sends Cache-Control.'
}

Write-Host '=== Night 26 CloudFront API performance lab ==='
$dist = Get-GsaCloudFrontDistribution
Write-Host "Distribution: $($dist.Id) ($($dist.Domain)) status=$($dist.Status)"

$cachePolicyId = New-Night26CachePolicy
New-Night26Dashboard $dist.Id

$appliedWiki = $false
if ($ApplyWikiCache) {
    Write-Host ''
    Write-Host 'WARNING: Applying study cache policy to prod api/wiki* behavior.'
    Set-CacheBehaviorPolicy $dist.Id $WikiPathPattern $cachePolicyId
    $appliedWiki = $true
}

$throttleDemo = $null
if ($CreateThrottleDemo) {
    $throttleDemo = New-ThrottleDemoApi
    Write-Host ''
    Write-Host "Throttle demo URL: $($throttleDemo.invokeUrl)"
    Write-Host "API key (x-api-key): $($throttleDemo.apiKey)"
    Write-Host 'Rapid GETs should return 429 after burst/rate exceeded.'
}

if ($TestCache) {
    Test-CacheHeaders
}

$result = @{
    lab                   = 'night-26-cloudfront-api-caching'
    region                = $Region
    domain                = $Domain
    distributionId        = $dist.Id
    distributionDomain    = $dist.Domain
    dashboardName         = $DashboardName
    cachePolicyId         = $cachePolicyId
    cachePolicyName       = $CachePolicyName
    cachingDisabledPolicy = $CachingDisabledPolicyId
    wikiPathPattern       = $WikiPathPattern
    wikiCacheApplied      = $appliedWiki
    probeUrl              = $ProbeUrl
    throttleDemo          = $throttleDemo
    tag                   = "saa-study-lab=$TagLab"
    createdAt             = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}
$result | ConvertTo-Json -Depth 6 | Set-Content $ResultFile -Encoding UTF8
Write-Host ''
Write-Host "Wrote $ResultFile"
Write-Host 'Console: CloudWatch -> Dashboards -> saa-study-night26-api-perf'
Write-Host 'Teardown: .\HTML\study-lab\night-26-lab-cloudfront-teardown.ps1'

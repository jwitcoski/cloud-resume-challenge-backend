# Night 30 Lab — S3 lifecycle on Iceland prefixes + Cost Explorer + optional Budget
# Run: .\HTML\study-lab\night-30-lab-s3-lifecycle-setup.ps1
# Options: -UploadDemoObjects  -CreateBudget  -BudgetEmail you@example.com

param(
    [switch]$UploadDemoObjects,
    [switch]$CreateBudget,
    [string]$BudgetEmail = ''
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$BucketName = 'globalskiatlas-backend-k8s-output'
$RuleId = 'saa-study-night30-iceland-archive'
$BudgetName = 'saa-study-night30-monthly'
$DemoPrefix = 'saa-study-night30/demo/'
$TagLab = 'night-30'
$BudgetLimitUsd = 25

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuleFile = Join-Path $ScriptDir 'night-30-lifecycle-rule.json'
$ResultFile = Join-Path $ScriptDir 'night-30-s3-lifecycle-result.json'
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

function Get-DateRangeLast30Days {
    $end = (Get-Date).ToUniversalTime().Date
    $start = $end.AddDays(-30)
    return @{
        Start = $start.ToString('yyyy-MM-dd')
        End   = $end.ToString('yyyy-MM-dd')
    }
}

function Get-MergedLifecycleConfig {
    $newRule = Get-Content $RuleFile -Raw | ConvertFrom-Json
    $existingJson = Aws-Text @('s3api', 'get-bucket-lifecycle-configuration', '--bucket', $BucketName, '--region', $Region, '--output', 'json')
    $rules = @()
    if ($existingJson) {
        $existing = $existingJson | ConvertFrom-Json
        if ($existing.Rules) {
            $rules = @($existing.Rules | Where-Object { $_.ID -ne $RuleId })
        }
    }
    $rules += $newRule
    return @{ Rules = $rules }
}

function Get-TopServicesByCost {
    $range = Get-DateRangeLast30Days
    $json = Aws-Text @(
        'ce', 'get-cost-and-usage',
        '--time-period', "Start=$($range.Start),End=$($range.End)",
        '--granularity', 'MONTHLY',
        '--metrics', 'UnblendedCost',
        '--group-by', 'Type=DIMENSION,Key=SERVICE',
        '--region', 'us-east-1',
        '--output', 'json'
    )
    if (-not $json) { return @() }

    $data = $json | ConvertFrom-Json
    $rows = @()
    foreach ($bucket in $data.ResultsByTime) {
        foreach ($group in $bucket.Groups) {
            $amount = [decimal]$group.Metrics.UnblendedCost.Amount
            if ($amount -le 0) { continue }
            $rows += [pscustomobject]@{
                service = $group.Keys[0]
                amountUsd = [math]::Round($amount, 2)
            }
        }
    }
    return $rows | Sort-Object amountUsd -Descending | Select-Object -First 8
}

Write-Host '=== Night 30 Lab — S3 lifecycle + cost ==='
Write-Host "Bucket: $BucketName"
Write-Host "Rule:   $RuleId"
Write-Host ''

$identity = Aws-Text @('sts', 'get-caller-identity', '--query', 'Account', '--output', 'text')
if ($identity) { $AccountId = $identity }

$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
aws s3api head-bucket --bucket $BucketName --region $Region 2>$null | Out-Null
$bucketOk = $LASTEXITCODE -eq 0
$ErrorActionPreference = $prev
if (-not $bucketOk) {
    Write-Host "ERROR: Cannot access bucket $BucketName. Verify credentials and bucket name."
    exit 1
}
Write-Host 'Bucket: accessible'

$versioning = Aws-Text @('s3api', 'get-bucket-versioning', '--bucket', $BucketName, '--region', $Region, '--query', 'Status')
Write-Host "Versioning: $(if ($versioning) { $versioning } else { 'Disabled' })"

$merged = Get-MergedLifecycleConfig
$lifecycleFile = Join-Path $ScriptDir 'night-30-lifecycle-merged.json'
Write-Utf8NoBom $lifecycleFile ($merged | ConvertTo-Json -Depth 10)

Write-Host 'Applying merged lifecycle configuration ...'
Aws-Run @('s3api', 'put-bucket-lifecycle-configuration', '--bucket', $BucketName, '--region', $Region, '--lifecycle-configuration', "file://$($lifecycleFile -replace '\\','/')")
Write-Host 'Lifecycle rule applied.'

$icelandPrefixes = Aws-Text @('s3api', 'list-objects-v2', '--bucket', $BucketName, '--prefix', 'iceland/', '--delimiter', '/', '--region', $Region, '--query', 'CommonPrefixes[].Prefix', '--output', 'text')
if ($icelandPrefixes) {
    Write-Host ''
    Write-Host 'Iceland monthly prefixes (sample):'
    ($icelandPrefixes -split "`t|`n| ") | Where-Object { $_ } | Select-Object -First 6 | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host 'WARN: No iceland/ prefixes listed yet — Night 10 output may use a different path.'
}

$demoKeys = @()
if ($UploadDemoObjects) {
    Write-Host ''
    Write-Host "Uploading demo objects under $DemoPrefix ..."
    $key1 = "${DemoPrefix}lifecycle-readme.txt"
    $key2 = "${DemoPrefix}cost-check-$(Get-Date -Format 'yyyyMMdd').txt"
    $tmp1 = Join-Path $env:TEMP 'night30-demo1.txt'
    $tmp2 = Join-Path $env:TEMP 'night30-demo2.txt'
    "Night 30 lifecycle lab demo — safe to delete." | Set-Content -Path $tmp1 -Encoding utf8
    "Uploaded $(Get-Date -Format o)" | Set-Content -Path $tmp2 -Encoding utf8
    Aws-Run @('s3', 'cp', $tmp1, "s3://$BucketName/$key1", '--region', $Region, '--metadata', "Lab=$TagLab")
    Aws-Run @('s3', 'cp', $tmp2, "s3://$BucketName/$key2", '--region', $Region, '--metadata', "Lab=$TagLab")
    $demoKeys = @($key1, $key2)
    Remove-Item $tmp1, $tmp2 -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host '=== Cost Explorer — top services (last 30 days) ==='
$topServices = Get-TopServicesByCost
if ($topServices.Count -eq 0) {
    Write-Host 'No cost data returned (new account or permissions). Open Billing console manually.'
} else {
    Write-Host '| Service | ~USD |'
    Write-Host '|---------|------|'
    foreach ($row in $topServices) {
        Write-Host ("| {0} | `${1} |" -f $row.service, $row.amountUsd)
    }
}

$budgetArn = $null
if ($CreateBudget) {
    if (-not $BudgetEmail) {
        throw '-CreateBudget requires -BudgetEmail you@example.com'
    }
    Write-Host ''
    Write-Host "Creating budget $BudgetName (limit `$$BudgetLimitUsd/month) ..."

    $budgetBody = @{
        BudgetName = $BudgetName
        BudgetLimit = @{ Amount = "$BudgetLimitUsd"; Unit = 'USD' }
        BudgetType = 'COST'
        TimeUnit = 'MONTHLY'
        CostTypes = @{
            IncludeTax = $true
            IncludeSubscription = $true
            UseBlended = $false
        }
    } | ConvertTo-Json -Depth 5
    $budgetFile = Join-Path $env:TEMP 'night30-budget.json'
    Write-Utf8NoBom $budgetFile $budgetBody

    $notifBody = @{
        Notification = @{
            NotificationType = 'ACTUAL'
            ComparisonOperator = 'GREATER_THAN'
            Threshold = 80
            ThresholdType = 'PERCENTAGE'
        }
        Subscribers = @(
            @{ SubscriptionType = 'EMAIL'; Address = $BudgetEmail }
        )
    } | ConvertTo-Json -Depth 6
    $notifFile = Join-Path $env:TEMP 'night30-budget-notif.json'
    Write-Utf8NoBom $notifFile $notifBody

    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws budgets create-budget --account-id $AccountId --budget "file://$($budgetFile -replace '\\','/')" --notifications-with-subscribers "file://$($notifFile -replace '\\','/')" 2>&1 | Out-String | Write-Host
    if ($LASTEXITCODE -ne 0) {
        aws budgets update-budget --account-id $AccountId --new-budget "file://$($budgetFile -replace '\\','/')" 2>&1 | Out-String | Write-Host
    }
    $ErrorActionPreference = $prev
    $budgetArn = "arn:aws:budgets::${AccountId}:budget/${BudgetName}"
    Write-Host "Budget configured. Confirm the email subscription if this is the first time."
}

$range = Get-DateRangeLast30Days
$result = @{
    night = 30
    region = $Region
    accountId = $AccountId
    bucket = $BucketName
    lifecycleRuleId = $RuleId
    lifecycleTransitions = @(
        @{ days = 90; storageClass = 'STANDARD_IA' }
        @{ days = 365; storageClass = 'GLACIER' }
    )
    versioning = if ($versioning) { $versioning } else { 'Disabled' }
    icelandPrefixSample = if ($icelandPrefixes) { ($icelandPrefixes -split "`t|`n| ") | Where-Object { $_ } | Select-Object -First 6 } else { @() }
    demoObjectKeys = $demoKeys
    costExplorer = @{
        start = $range.Start
        end = $range.End
        topServices = @($topServices | ForEach-Object { @{ service = $_.service; amountUsd = $_.amountUsd } })
    }
    budgetName = if ($CreateBudget) { $BudgetName } else { $null }
    budgetEmail = if ($CreateBudget) { $BudgetEmail } else { $null }
    budgetLimitUsd = if ($CreateBudget) { $BudgetLimitUsd } else { $null }
    tagLab = $TagLab
}
Write-Utf8NoBom $ResultFile ($result | ConvertTo-Json -Depth 8)
Write-Host ''
Write-Host "Wrote $ResultFile"
Write-Host 'Next: S3 console -> Management -> Lifecycle rules; Billing -> Cost Explorer.'
Write-Host 'Teardown: .\HTML\study-lab\night-30-lab-s3-lifecycle-teardown.ps1'

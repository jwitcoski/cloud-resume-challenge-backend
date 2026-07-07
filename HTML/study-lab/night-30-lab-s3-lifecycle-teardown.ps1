# Night 30 teardown — remove study lifecycle rule, demo objects, budget
# Run: .\HTML\study-lab\night-30-lab-s3-lifecycle-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$BucketName = 'globalskiatlas-backend-k8s-output'
$RuleId = 'saa-study-night30-iceland-archive'
$BudgetName = 'saa-study-night30-monthly'
$DemoPrefix = 'saa-study-night30/'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-30-s3-lifecycle-result.json'
$MergedFile = Join-Path $ScriptDir 'night-30-lifecycle-merged.json'
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

Write-Host '=== Night 30 S3 lifecycle lab teardown ==='

$identity = Aws-Text @('sts', 'get-caller-identity', '--query', 'Account', '--output', 'text')
if ($identity) { $AccountId = $identity }

$existingJson = Aws-Text @('s3api', 'get-bucket-lifecycle-configuration', '--bucket', $BucketName, '--region', $Region, '--output', 'json')
if ($existingJson) {
    $existing = $existingJson | ConvertFrom-Json
    $remaining = @($existing.Rules | Where-Object { $_.ID -ne $RuleId })
    if ($remaining.Count -eq 0) {
        Write-Host 'Removing entire lifecycle configuration (only study rule existed) ...'
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        aws s3api delete-bucket-lifecycle --bucket $BucketName --region $Region 2>$null | Out-Null
        $ErrorActionPreference = $prev
    } else {
        $cfg = @{ Rules = $remaining }
        Write-Utf8NoBom $MergedFile ($cfg | ConvertTo-Json -Depth 10)
        Write-Host "Removing rule $RuleId (keeping $($remaining.Count) other rule(s)) ..."
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        aws s3api put-bucket-lifecycle-configuration --bucket $BucketName --region $Region --lifecycle-configuration "file://$($MergedFile -replace '\\','/')" 2>$null | Out-Null
        $ErrorActionPreference = $prev
    }
} else {
    Write-Host 'No lifecycle configuration on bucket — nothing to remove.'
}

Write-Host "Deleting demo prefix s3://$BucketName/$DemoPrefix ..."
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
aws s3 rm "s3://$BucketName/$DemoPrefix" --recursive --region $Region 2>$null | Out-Null
$ErrorActionPreference = $prev

Write-Host "Deleting budget $BudgetName ..."
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
aws budgets delete-budget --account-id $AccountId --budget-name $BudgetName 2>$null | Out-Null
$ErrorActionPreference = $prev

if (Test-Path $ResultFile) {
    Remove-Item $ResultFile -Force
    Write-Host "Removed $ResultFile"
}
if (Test-Path $MergedFile) {
    Remove-Item $MergedFile -Force
}

Write-Host 'Teardown complete. Iceland pipeline output under iceland/ was NOT deleted.'

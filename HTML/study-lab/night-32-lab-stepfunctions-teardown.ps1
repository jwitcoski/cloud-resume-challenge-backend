# Night 32 teardown — delete SAM stack, re-enable legacy schedule, remove result file
# Run: .\HTML\study-lab\night-32-lab-stepfunctions-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'
$StackName = 'sam-pipeline-orchestrator'
$LegacyRule = "$Prefix-iceland-monthly"
$SuccessRule = "$Prefix-iceland-success-to-sqs"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-32-stepfunctions-result.json'

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

Write-Host '=== Night 32 Step Functions lab teardown ==='

$legacyWasDisabled = $false
if (Test-Path $ResultFile) {
    $result = Get-Content $ResultFile -Raw | ConvertFrom-Json
    $legacyWasDisabled = [bool]$result.legacyRuleDisabled
}

$stackExists = Aws-Text @('cloudformation', 'describe-stacks', '--stack-name', $StackName, '--region', $Region, '--query', 'Stacks[0].StackStatus')
if ($stackExists) {
    Write-Host "Deleting stack $StackName ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    sam delete --stack-name $StackName --region $Region --no-prompts 2>&1 | Write-Host
    if ($LASTEXITCODE -ne 0) {
        aws cloudformation delete-stack --stack-name $StackName --region $Region 2>$null | Out-Null
        Write-Host 'Waiting for stack delete ...'
        aws cloudformation wait stack-delete-complete --stack-name $StackName --region $Region 2>$null | Out-Null
    }
    $ErrorActionPreference = $prev
} else {
    Write-Host "Stack $StackName not found — skip delete."
}

if ($legacyWasDisabled) {
    $exists = Aws-Text @('events', 'describe-rule', '--name', $LegacyRule, '--region', $Region, '--query', 'Name')
    if ($exists) {
        aws events enable-rule --name $LegacyRule --region $Region | Out-Null
        Write-Host "Re-enabled legacy rule $LegacyRule"
    }
}

if (Test-Path $ResultFile) {
    $successDisabled = $false
    try {
        $r = Get-Content $ResultFile -Raw | ConvertFrom-Json
        $successDisabled = [bool]$r.successRuleDisabled
    } catch { }
    if ($successDisabled) {
        $exists = Aws-Text @('events', 'describe-rule', '--name', $SuccessRule, '--region', $Region, '--query', 'Name')
        if ($exists) {
            aws events enable-rule --name $SuccessRule --region $Region | Out-Null
            Write-Host "Re-enabled success rule $SuccessRule"
        }
    }
    Remove-Item $ResultFile -Force
    Write-Host "Removed $ResultFile"
}

Write-Host 'Teardown complete. Nights 12–17 SQS/SNS/Lambda resources were NOT deleted.'

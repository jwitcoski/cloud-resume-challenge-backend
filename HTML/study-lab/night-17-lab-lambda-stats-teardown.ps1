# Night 17 teardown — Lambda stats uploader, IAM role, event source mapping
# Run: .\HTML\study-lab\night-17-lab-lambda-stats-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'
$FunctionName = "$Prefix-stats-uploader"
$RoleName = "$Prefix-stats-uploader-role"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-17-lambda-stats-result.json'

Write-Host '=== Night 17 Lambda stats uploader teardown ==='

$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
$mappings = aws lambda list-event-source-mappings --function-name $FunctionName --region $Region | ConvertFrom-Json
$ErrorActionPreference = $prev

foreach ($m in $mappings.EventSourceMappings) {
    Write-Host "Deleting event source mapping $($m.UUID) ..."
    aws lambda delete-event-source-mapping --uuid $m.UUID --region $Region | Out-Null
}

$ErrorActionPreference = 'SilentlyContinue'
aws lambda delete-function --function-name $FunctionName --region $Region | Out-Null
$ErrorActionPreference = $prev
Write-Host "Deleted Lambda function $FunctionName (if it existed)."

Start-Sleep -Seconds 5

$ErrorActionPreference = 'SilentlyContinue'
aws iam delete-role-policy --role-name $RoleName --policy-name 'night-17-stats-uploader' | Out-Null
aws iam delete-role --role-name $RoleName | Out-Null
$ErrorActionPreference = $prev
Write-Host "Deleted IAM role $RoleName (if it existed)."

$logGroup = "/aws/lambda/$FunctionName"
$ErrorActionPreference = 'SilentlyContinue'
aws logs delete-log-group --log-group-name $logGroup --region $Region | Out-Null
$ErrorActionPreference = $prev

if (Test-Path $ResultFile) {
    Remove-Item -Force $ResultFile
}

Write-Host 'Night 17 Lambda resources removed. Aurora (Night 16) and SQS (Night 13) unchanged.'

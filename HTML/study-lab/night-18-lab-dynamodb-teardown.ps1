# Night 18 teardown — DynamoDB stream Lambda, IAM role, study wiki-views table
# Run: .\HTML\study-lab\night-18-lab-dynamodb-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'
$TableName = "$Prefix-wiki-views"
$FunctionName = "$Prefix-wiki-stream-processor"
$RoleName = "$Prefix-wiki-stream-role"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-18-dynamodb-result.json'

Write-Host '=== Night 18 DynamoDB lab teardown ==='

$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
$mappings = aws lambda list-event-source-mappings --function-name $FunctionName --region $Region | ConvertFrom-Json
$ErrorActionPreference = $prev

foreach ($m in $mappings.EventSourceMappings) {
    Write-Host "Deleting event source mapping $($m.UUID) ..."
    aws lambda delete-event-source-mapping --uuid $m.UUID --region $Region | Out-Null
}

Start-Sleep -Seconds 5

$ErrorActionPreference = 'SilentlyContinue'
aws lambda delete-function --function-name $FunctionName --region $Region | Out-Null
$ErrorActionPreference = $prev
Write-Host "Deleted Lambda function $FunctionName (if it existed)."

Start-Sleep -Seconds 3

$ErrorActionPreference = 'SilentlyContinue'
aws iam delete-role-policy --role-name $RoleName --policy-name 'night-18-wiki-stream' | Out-Null
aws iam delete-role --role-name $RoleName | Out-Null
$ErrorActionPreference = $prev
Write-Host "Deleted IAM role $RoleName (if it existed)."

$logGroup = "/aws/lambda/$FunctionName"
$ErrorActionPreference = 'SilentlyContinue'
aws logs delete-log-group --log-group-name $logGroup --region $Region | Out-Null
$ErrorActionPreference = $prev

$ErrorActionPreference = 'SilentlyContinue'
aws dynamodb delete-table --table-name $TableName --region $Region | Out-Null
$ErrorActionPreference = $prev
Write-Host "Deleted DynamoDB table $TableName (if it existed)."

if (Test-Path $ResultFile) {
    Remove-Item -Force $ResultFile
}

Write-Host 'Night 18 study resources removed. Prod GSA WikiPages tables unchanged.'

# Night 20 Lab teardown — S3 migration bucket
# Run: .\HTML\study-lab\night-20-lab-migration-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$BucketName = "$Prefix-migration-$AccountId"
$RoleName = "$Prefix-dynamodb-export-role"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-20-migration-result.json'

Write-Host '=== Night 20 teardown — migration staging ==='

if (Test-Path $ResultFile) {
    $saved = Get-Content $ResultFile -Raw | ConvertFrom-Json
    if ($saved.migrationBucket) { $BucketName = $saved.migrationBucket }
}

$bucketExists = $false
$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
aws s3api head-bucket --bucket $BucketName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $bucketExists = $true }
$ErrorActionPreference = $prev

if ($bucketExists) {
    Write-Host "Emptying S3 bucket $BucketName ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws s3 rm "s3://$BucketName" --recursive | Out-Null
    Write-Host "Deleting S3 bucket $BucketName ..."
    aws s3api delete-bucket --bucket $BucketName --region $Region | Out-Null
    $ErrorActionPreference = $prev
}

# Legacy cleanup from earlier script versions that created an export role
$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
aws iam get-role --role-name $RoleName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Removing legacy export IAM role $RoleName ..."
    aws iam delete-role-policy --role-name $RoleName --policy-name DynamoDbExportToS3 | Out-Null
    aws iam delete-role --role-name $RoleName | Out-Null
}
$ErrorActionPreference = $prev

if (Test-Path $ResultFile) { Remove-Item $ResultFile -Force }
Write-Host 'Night 20 teardown complete. Night 18 DynamoDB table and Night 19 backup unchanged.'

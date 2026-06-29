# Night 20 Lab — S3 migration staging + DynamoDB export to S3
# Run: .\HTML\study-lab\night-20-lab-migration-setup.ps1
# Options: -ExportTable  -VerifyExport  -SkipBucket

param(
    [switch]$ExportTable,
    [switch]$VerifyExport,
    [switch]$SkipBucket
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$TableName = "$Prefix-wiki-views"
$BucketName = "$Prefix-migration-$AccountId"
$ExportPrefix = 'night-20/dynamodb/wiki-views'
$TagKey = 'saa-study-migration'
$TagValue = 'night-20'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-20-migration-result.json'
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
    & aws @AwsArgs 2>$null | Out-Null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "aws $($AwsArgs -join ' ') failed (exit $code)" }
}

if ($VerifyExport -and -not $ExportTable) {
    throw '-VerifyExport requires -ExportTable'
}

Write-Host '=== Night 20 Lab — DMS + S3 migration staging ==='
Write-Host "Table:  $TableName"
Write-Host "Bucket: $BucketName"
Write-Host ''

$tableArn = Aws-Text @('dynamodb', 'describe-table', '--table-name', $TableName, '--region', $Region, '--query', 'Table.TableArn')
if (-not $tableArn) {
    Write-Host "ERROR: Table $TableName not found. Run Night 18 setup first:"
    Write-Host '  .\HTML\study-lab\night-18-lab-dynamodb-setup.ps1'
    exit 1
}
Write-Host "Study table ARN: $tableArn"

$pitrStatus = Aws-Text @('dynamodb', 'describe-continuous-backups', '--table-name', $TableName, '--region', $Region, '--query', 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus')
if ($pitrStatus -ne 'ENABLED') {
    Write-Host 'ERROR: PITR must be ENABLED for export-to-S3. Night 18 setup enables it.'
    Write-Host "Current PITR status: $pitrStatus"
    exit 1
}
Write-Host 'PITR: ENABLED (export prerequisite met)'

$exportArn = $null

if (-not $SkipBucket) {
    $bucketExists = $false
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws s3api head-bucket --bucket $BucketName 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $bucketExists = $true }
    $ErrorActionPreference = $prev

    if (-not $bucketExists) {
        Write-Host "Creating S3 bucket $BucketName ..."
        if ($Region -eq 'us-east-1') {
            Aws-Run @('s3api', 'create-bucket', '--bucket', $BucketName, '--region', $Region)
        } else {
            Aws-Run @('s3api', 'create-bucket', '--bucket', $BucketName, '--region', $Region, '--create-bucket-configuration', "LocationConstraint=$Region")
        }
    } else {
        Write-Host "S3 bucket $BucketName already exists."
    }

    Write-Host 'Enabling default bucket encryption (SSE-S3) ...'
    $encPath = Join-Path $env:TEMP 'night20-bucket-encryption.json'
    $encJson = @'
{
  "Rules": [
    {
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }
  ]
}
'@
    Write-Utf8NoBom $encPath $encJson
    Aws-Run @('s3api', 'put-bucket-encryption', '--bucket', $BucketName, '--server-side-encryption-configuration', "file://$encPath")

    Write-Host "Tagging bucket ${TagKey}=${TagValue} ..."
    $tagPath = Join-Path $env:TEMP 'night20-bucket-tags.json'
    $tagJson = @"
{
  "TagSet": [
    { "Key": "$TagKey", "Value": "$TagValue" },
    { "Key": "Project", "Value": "$Prefix" }
  ]
}
"@
    Write-Utf8NoBom $tagPath $tagJson
    Aws-Run @('s3api', 'put-bucket-tagging', '--bucket', $BucketName, '--tagging', "file://$tagPath")
} else {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws s3api head-bucket --bucket $BucketName 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        $ErrorActionPreference = $prev
        throw '-SkipBucket set but migration bucket missing — run setup without -SkipBucket first'
    }
    $ErrorActionPreference = $prev
}

if ($ExportTable) {
    if (Test-Path $ResultFile) {
        $saved = Get-Content $ResultFile -Raw | ConvertFrom-Json
        if ($saved.exportArn) {
            $savedStatus = Aws-Text @('dynamodb', 'describe-export', '--export-arn', $saved.exportArn, '--region', $Region, '--query', 'ExportDescription.ExportStatus')
            if ($savedStatus -in @('IN_PROGRESS', 'COMPLETED')) {
                Write-Host "Reusing export from result file ($savedStatus): $($saved.exportArn)"
                $exportArn = $saved.exportArn
            }
        }
    }
    if (-not $exportArn) {
        Write-Host 'Starting DynamoDB export to S3 ...'
        $exportArn = Aws-Text @(
            'dynamodb', 'export-table-to-point-in-time',
            '--table-arn', $tableArn,
            '--s3-bucket', $BucketName,
            '--s3-prefix', $ExportPrefix,
            '--export-format', 'DYNAMODB_JSON',
            '--export-time', (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'),
            '--region', $Region,
            '--query', 'ExportDescription.ExportArn'
        )
        Write-Host "Export ARN: $exportArn"
    }

    if ($VerifyExport -and $exportArn) {
        Write-Host 'Polling export until COMPLETED ...'
        $deadline = (Get-Date).AddMinutes(20)
        $status = $null
        while ((Get-Date) -lt $deadline) {
            $status = Aws-Text @('dynamodb', 'describe-export', '--export-arn', $exportArn, '--region', $Region, '--query', 'ExportDescription.ExportStatus')
            Write-Host "  Export state: $status"
            if ($status -eq 'COMPLETED') { break }
            if ($status -eq 'FAILED') {
                $msg = Aws-Text @('dynamodb', 'describe-export', '--export-arn', $exportArn, '--region', $Region, '--query', 'ExportDescription.FailureMessage')
                throw "Export failed: $msg"
            }
            Start-Sleep -Seconds 20
        }
        if ($status -ne 'COMPLETED') { throw 'Timed out waiting for DynamoDB export.' }
        $objCount = Aws-Text @('s3api', 'list-objects-v2', '--bucket', $BucketName, '--prefix', $ExportPrefix, '--query', 'length(Contents)')
        Write-Host "S3 objects under $ExportPrefix : $objCount"
    }
}

$result = [ordered]@{
    lab = 'night-20-dms-s3-migration'
    region = $Region
    tableName = $TableName
    tableArn = $tableArn
    pitrStatus = $pitrStatus
    migrationBucket = $BucketName
    exportPrefix = $ExportPrefix
    tag = "${TagKey}=${TagValue}"
    exportArn = $exportArn
    createdAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}
($result | ConvertTo-Json -Depth 5) | Set-Content -Path $ResultFile -Encoding utf8

Write-Host ''
Write-Host '=== Night 20 setup complete ==='
Write-Host "Result: $ResultFile"
Write-Host 'Next: .\HTML\study-lab\night-20-lab-migration-setup.ps1 -ExportTable -VerifyExport'
Write-Host 'Teardown: .\HTML\study-lab\night-20-lab-migration-teardown.ps1'

# Night 24 teardown — Athena workgroup, Glue tables/database, night-24 S3 prefix
# Run: .\HTML\study-lab\night-24-lab-athena-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$DatabaseName = 'saa_study_gsa_analytics'
$WorkGroupName = "$Prefix-athena"
$StagingTable = 'resort_snapshot_staging'
$IcebergTable = 'resort_snapshot'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MigrationResultFile = Join-Path $ScriptDir 'night-20-migration-result.json'
$ResultFile = Join-Path $ScriptDir 'night-24-athena-result.json'
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

function Wait-AthenaQuery([string]$QueryExecutionId, [int]$MaxMinutes = 10) {
    $deadline = (Get-Date).AddMinutes($MaxMinutes)
    while ((Get-Date) -lt $deadline) {
        $state = Aws-Text @('athena', 'get-query-execution', '--query-execution-id', $QueryExecutionId, '--region', $Region, '--query', 'QueryExecution.Status.State')
        if ($state -eq 'SUCCEEDED') { return }
        if ($state -in @('FAILED', 'CANCELLED', $null)) { return }
        Start-Sleep -Seconds 3
    }
}

function Invoke-AthenaSql([string]$Sql, [string]$Database, [string]$OutputLocation) {
    $sqlPath = Join-Path $env:TEMP 'night24-teardown-query.sql'
    Write-Utf8NoBom $sqlPath $Sql
    $sqlFile = $sqlPath -replace '\\', '/'
    $qid = Aws-Text @(
        'athena', 'start-query-execution',
        '--query-string', "file://$sqlFile",
        '--query-execution-context', "Database=$Database",
        '--work-group', $WorkGroupName,
        '--result-configuration', "OutputLocation=$OutputLocation",
        '--region', $Region,
        '--query', 'QueryExecutionId'
    )
    if ($qid) { Wait-AthenaQuery $qid }
}

Write-Host '=== Night 24 Athena lab teardown ==='

$BucketName = "$Prefix-migration-$AccountId"
if (Test-Path $ResultFile) {
    $saved = Get-Content $ResultFile -Raw | ConvertFrom-Json
    if ($saved.migrationBucket) { $BucketName = $saved.migrationBucket }
} elseif (Test-Path $MigrationResultFile) {
    $saved = Get-Content $MigrationResultFile -Raw | ConvertFrom-Json
    if ($saved.migrationBucket) { $BucketName = $saved.migrationBucket }
}

$ResultsS3 = "s3://$BucketName/night-24/athena-results/"

$wgExists = Aws-Text @('athena', 'get-work-group', '--work-group', $WorkGroupName, '--region', $Region, '--query', 'WorkGroup.Name')
if ($wgExists) {
    Write-Host 'Dropping Glue / Iceberg tables via Athena ...'
    $dropIceberg = "DROP TABLE IF EXISTS ``$DatabaseName``.``$IcebergTable``"
    $dropStaging = "DROP TABLE IF EXISTS ``$DatabaseName``.``$StagingTable``"
    Invoke-AthenaSql $dropIceberg $DatabaseName $ResultsS3
    Invoke-AthenaSql $dropStaging $DatabaseName $ResultsS3
}

$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
aws glue delete-table --database-name $DatabaseName --name $IcebergTable --region $Region | Out-Null
aws glue delete-table --database-name $DatabaseName --name $StagingTable --region $Region | Out-Null
aws glue delete-database --name $DatabaseName --region $Region | Out-Null
$ErrorActionPreference = $prev
Write-Host "Removed Glue database $DatabaseName (if it existed)."

$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
aws s3 rm "s3://$BucketName/night-24/" --recursive | Out-Null
$ErrorActionPreference = $prev
Write-Host "Removed S3 prefix s3://$BucketName/night-24/ (if present)."

$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
aws athena delete-work-group --work-group $WorkGroupName --region $Region --recursive-delete-option | Out-Null
$ErrorActionPreference = $prev
Write-Host "Deleted Athena workgroup $WorkGroupName (if it existed)."

if (Test-Path $ResultFile) { Remove-Item -Force $ResultFile }

Write-Host 'Night 24 study resources removed. Night 20 migration bucket (night-20/ prefix), Night 16 Aurora, Night 18 DynamoDB unchanged.'

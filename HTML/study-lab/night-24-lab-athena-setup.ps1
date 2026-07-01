# Night 24 Lab 3B — Athena + Glue catalog + Iceberg resort snapshot
# Run: .\HTML\study-lab\night-24-lab-athena-setup.ps1
# Options: -RunQuery  -SkipSeed

param(
    [switch]$RunQuery,
    [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$DatabaseName = 'saa_study_gsa_analytics'
$WorkGroupName = "$Prefix-athena"
$StagingTable = 'resort_snapshot_staging'
$IcebergTable = 'resort_snapshot'
$TagKey = 'saa-study-analytics'
$TagValue = 'night-24'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MigrationResultFile = Join-Path $ScriptDir 'night-20-migration-result.json'
$SeedScript = Join-Path $ScriptDir 'night-24-lab-seed-parquet.py'
$ResultFile = Join-Path $ScriptDir 'night-24-athena-result.json'
$ParquetFile = Join-Path $env:TEMP 'night24-resort-snapshot.parquet'
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

function Wait-AthenaQuery([string]$QueryExecutionId, [int]$MaxMinutes = 10) {
    $deadline = (Get-Date).AddMinutes($MaxMinutes)
    while ((Get-Date) -lt $deadline) {
        $state = Aws-Text @('athena', 'get-query-execution', '--query-execution-id', $QueryExecutionId, '--region', $Region, '--query', 'QueryExecution.Status.State')
        Write-Host "  Athena query $QueryExecutionId : $state"
        if ($state -eq 'SUCCEEDED') { return }
        if ($state -in @('FAILED', 'CANCELLED')) {
            $reason = Aws-Text @('athena', 'get-query-execution', '--query-execution-id', $QueryExecutionId, '--region', $Region, '--query', 'QueryExecution.Status.StateChangeReason')
            throw "Athena query $state : $reason"
        }
        Start-Sleep -Seconds 3
    }
    throw "Timed out waiting for Athena query $QueryExecutionId"
}

function Invoke-AthenaSql([string]$Sql, [string]$Database, [string]$OutputLocation) {
    $sqlPath = Join-Path $env:TEMP 'night24-athena-query.sql'
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
    if (-not $qid) { throw 'start-query-execution did not return QueryExecutionId' }
    Wait-AthenaQuery $qid
    return $qid
}

function Get-AthenaResultRows([string]$QueryExecutionId) {
    $json = aws athena get-query-results --query-execution-id $QueryExecutionId --region $Region --output json
    if ($LASTEXITCODE -ne 0) { throw 'get-query-results failed' }
    return ($json | ConvertFrom-Json).ResultSet.Rows
}

Write-Host '=== Night 24 Lab 3B - Athena on Iceberg ==='

$BucketName = "$Prefix-migration-$AccountId"
if (Test-Path $MigrationResultFile) {
    $migration = Get-Content $MigrationResultFile -Raw | ConvertFrom-Json
    if ($migration.migrationBucket) { $BucketName = $migration.migrationBucket }
}
else {
    Write-Host "WARN: $MigrationResultFile missing - using default bucket $BucketName"
    Write-Host 'Run Night 20 setup first if bucket does not exist.'
}

$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
aws s3api head-bucket --bucket $BucketName 2>$null | Out-Null
$bucketOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prev
if (-not $bucketOk) {
    Write-Host "ERROR: S3 bucket $BucketName not found. Run:"
    Write-Host '  .\HTML\study-lab\night-20-lab-migration-setup.ps1'
    exit 1
}
Write-Host "Migration bucket: $BucketName"

$StagingPrefix = 'night-24/staging/resort_snapshot'
$IcebergPrefix = 'night-24/iceberg/resort_snapshot'
$ResultsPrefix = 'night-24/athena-results'
$StagingS3 = "s3://$BucketName/$StagingPrefix/"
$IcebergS3 = "s3://$BucketName/$IcebergPrefix/"
$ResultsS3 = "s3://$BucketName/$ResultsPrefix/"

$seedMeta = $null
if (-not $SkipSeed) {
    Write-Host 'Generating sample resort Parquet (Aurora snapshot stand-in) ...'
    $seedOut = & python $SeedScript $ParquetFile
    if ($LASTEXITCODE -ne 0) { throw 'Parquet seed script failed - pip install pyarrow' }
    $seedMeta = $seedOut | ConvertFrom-Json
    Write-Host "  Rows: $($seedMeta.rowCount)"
    Write-Host "Uploading to $StagingS3 ..."
    Aws-Run @('s3', 'cp', $ParquetFile, "$StagingS3", '--region', $Region)
} else {
    Write-Host 'Skipping Parquet seed (-SkipSeed).'
}

$dbExists = Aws-Text @('glue', 'get-database', '--name', $DatabaseName, '--region', $Region, '--query', 'Database.Name')
if (-not $dbExists) {
    Write-Host "Creating Glue database $DatabaseName ..."
    Aws-Run @('glue', 'create-database', '--database-input', "Name=$DatabaseName,Description=Night 24 GSA analytics catalog", '--region', $Region)
} else {
    Write-Host "Glue database $DatabaseName already exists."
}

$wgExists = Aws-Text @('athena', 'get-work-group', '--work-group', $WorkGroupName, '--region', $Region, '--query', 'WorkGroup.Name')
if (-not $wgExists) {
    Write-Host "Creating Athena workgroup $WorkGroupName ..."
    $wgObj = @{
        Name = $WorkGroupName
        Configuration = @{
            ResultConfiguration = @{ OutputLocation = $ResultsS3 }
            EnforceWorkGroupConfiguration = $true
            PublishCloudWatchMetricsEnabled = $true
            EngineVersion = @{ SelectedEngineVersion = 'Athena engine version 3' }
        }
        Description = 'Night 24 study lab - resort analytics SQL'
        Tags = @(
            @{ Key = $TagKey; Value = $TagValue },
            @{ Key = 'Project'; Value = $Prefix }
        )
    }
    $wgPath = Join-Path $env:TEMP 'night24-workgroup.json'
    Write-Utf8NoBom $wgPath (($wgObj | ConvertTo-Json -Depth 6 -Compress))
    $wgFile = $wgPath -replace '\\', '/'
    Aws-Run @('athena', 'create-work-group', '--cli-input-json', "file://$wgFile", '--region', $Region)
}
else {
    Write-Host "Athena workgroup $WorkGroupName already exists."
}

function New-StagingTableSql {
    return @"
CREATE EXTERNAL TABLE ``$DatabaseName``.``$StagingTable`` (
  resort_id string,
  resort_name string,
  country_code string,
  monthly_runs int
)
STORED AS PARQUET
LOCATION '$StagingS3'
"@
}

function New-IcebergTableSql {
    return @"
CREATE TABLE "$DatabaseName"."$IcebergTable"
WITH (
  table_type = 'ICEBERG',
  format = 'PARQUET',
  location = '$IcebergS3',
  is_external = false
)
AS
SELECT resort_id, resort_name, country_code, monthly_runs
FROM "$DatabaseName"."$StagingTable"
"@
}

function New-AggregateSql {
    return @"
SELECT country_code, COUNT(*) AS resort_count
FROM "$DatabaseName"."$IcebergTable"
GROUP BY country_code
ORDER BY resort_count DESC, country_code
"@
}

$dropIceberg = "DROP TABLE IF EXISTS ``$DatabaseName``.``$IcebergTable``"
$dropStaging = "DROP TABLE IF EXISTS ``$DatabaseName``.``$StagingTable``"
Write-Host 'Resetting study tables (idempotent) ...'
Invoke-AthenaSql $dropIceberg $DatabaseName $ResultsS3 | Out-Null
Invoke-AthenaSql $dropStaging $DatabaseName $ResultsS3 | Out-Null

$createStaging = New-StagingTableSql
Write-Host 'Registering staging Parquet table in Glue catalog ...'
Invoke-AthenaSql $createStaging $DatabaseName $ResultsS3 | Out-Null

$createIceberg = New-IcebergTableSql
Write-Host 'Creating Iceberg table via CTAS (Athena engine v3) ...'
Invoke-AthenaSql $createIceberg $DatabaseName $ResultsS3 | Out-Null

$aggregateSql = New-AggregateSql
$queryId = $null
$queryRows = $null
if ($RunQuery -or -not $SkipSeed) {
    Write-Host 'Running resort counts by country ...'
    $queryId = Invoke-AthenaSql $aggregateSql $DatabaseName $ResultsS3
    $rawRows = Get-AthenaResultRows $queryId
    $queryRows = @()
    if ($rawRows.Count -gt 1) {
        for ($i = 1; $i -lt $rawRows.Count; $i++) {
            $cells = $rawRows[$i].Data
            $queryRows += [ordered]@{
                country_code = $cells[0].VarCharValue
                resort_count = [int]$cells[1].VarCharValue
            }
        }
    }
    Write-Host 'Query results:'
    $queryRows | Format-Table -AutoSize
}

$result = @{
    lab = 'night-24-lab3b-athena-iceberg'
    region = $Region
    completedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    migrationBucket = $BucketName
    glue = @{
        databaseName = $DatabaseName
        stagingTable = $StagingTable
        icebergTable = $IcebergTable
        stagingLocation = $StagingS3
        icebergLocation = $IcebergS3
    }
    athena = @{
        workGroupName = $WorkGroupName
        resultsLocation = $ResultsS3
        aggregateQueryId = $queryId
        aggregateSql = ($aggregateSql -replace '\s+', ' ').Trim()
    }
    seed = $seedMeta
    queryResults = $queryRows
    tag = "${TagKey}=${TagValue}"
}
$result | ConvertTo-Json -Depth 8 | Set-Content $ResultFile -Encoding UTF8

Write-Host ''
Write-Host "Result saved: $ResultFile"
Write-Host 'Console: Athena workgroups - saa-study-gsa-athena - saved queries'
Write-Host 'Teardown: .\HTML\study-lab\night-24-lab-athena-teardown.ps1'

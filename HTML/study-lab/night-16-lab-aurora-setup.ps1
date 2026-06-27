# Night 16 Lab 2D part 1 - Aurora Serverless v2 in Night 9 private subnets
# Run: .\HTML\study-lab\night-16-lab-aurora-setup.ps1
# Options: -InitSchema  -VerifyRow

param(
    [switch]$InitSchema,
    [switch]$VerifyRow
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$ClusterId = "$Prefix-aurora"
$InstanceId = "$Prefix-aurora-instance"
$SubnetGroup = "$Prefix-aurora-subnets"
$DbName = 'gsa_stats'
$MasterUser = 'gsaadmin'
$AuroraSgName = "$Prefix-aurora-sg"
$LambdaSgName = "$Prefix-lambda-stats-sg"
$MinAcu = 0.5
$MaxAcu = 1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MasterSecretName = "$Prefix-aurora-master"
$Boto3Helper = Join-Path $ScriptDir 'night-16-lab-aurora-boto3.py'
$LocalSecretFile = Join-Path $ScriptDir 'night-16-aurora-local-secret.json'
$VpcIdsFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'
$SchemaFile = Join-Path $ScriptDir 'night-16-resort-stats-schema.sql'
$ResultFile = Join-Path $ScriptDir 'night-16-aurora-result.json'
$TmpDir = Join-Path $env:TEMP 'night16'
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null
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

function Test-AwsFlag([string]$Service, [string]$Command, [string]$Flag) {
    $help = & aws $Service $Command help 2>$null | Out-String
    return $help -match [regex]::Escape($Flag)
}

function New-LabMasterSecret([string]$Password) {
    $existing = Aws-Text @('secretsmanager', 'describe-secret', '--secret-id', $MasterSecretName, '--region', $Region, '--query', 'ARN')
    if ($existing) { return $existing }
    $payload = (@{ username = $MasterUser; password = $Password } | ConvertTo-Json -Compress)
    $arn = aws secretsmanager create-secret --name $MasterSecretName --secret-string $payload --region $Region `
        --query 'ARN' --output text
    return $arn
}

function Get-ClusterSecretArn() {
    $managed = Aws-Text @('rds', 'describe-db-clusters', '--db-cluster-identifier', $ClusterId, '--region', $Region, '--query', 'DBClusters[0].MasterUserSecret.SecretArn')
    if ($managed) { return $managed }
    return Aws-Text @('secretsmanager', 'describe-secret', '--secret-id', $MasterSecretName, '--region', $Region, '--query', 'ARN')
}

function Get-SgIdByName([string]$GroupName, [string]$VpcId) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $id = aws ec2 describe-security-groups --region $Region `
        --filters "Name=group-name,Values=$GroupName" "Name=vpc-id,Values=$VpcId" `
        --query 'SecurityGroups[0].GroupId' --output text 2>$null
    $ErrorActionPreference = $prev
    if ($id -and $id -ne 'None') { return $id }
    return $null
}

function Wait-ClusterAvailable([string]$Id, [int]$MaxMinutes = 20) {
    $deadline = (Get-Date).AddMinutes($MaxMinutes)
    while ((Get-Date) -lt $deadline) {
        $status = Aws-Text @('rds', 'describe-db-clusters', '--db-cluster-identifier', $Id, '--region', $Region, '--query', 'DBClusters[0].Status')
        Write-Host "  Cluster status: $status"
        if ($status -eq 'available') { return $true }
        if ($status -in @('failed', 'incompatible-parameters', 'incompatible-restore')) {
            throw "Cluster $Id entered status $status"
        }
        Start-Sleep -Seconds 30
    }
    throw "Timed out waiting for cluster $Id to become available"
}

function Wait-InstanceAvailable([string]$Id, [int]$MaxMinutes = 20) {
    $deadline = (Get-Date).AddMinutes($MaxMinutes)
    while ((Get-Date) -lt $deadline) {
        $status = Aws-Text @('rds', 'describe-db-instances', '--db-instance-identifier', $Id, '--region', $Region, '--query', 'DBInstances[0].DBInstanceStatus')
        Write-Host "  Instance status: $status"
        if ($status -eq 'available') { return $true }
        if ($status -in @('failed', 'incompatible-parameters')) {
            throw "Instance $Id entered status $status"
        }
        Start-Sleep -Seconds 30
    }
    throw "Timed out waiting for instance $Id to become available"
}

if (-not (Test-Path $VpcIdsFile)) {
    throw "Missing $VpcIdsFile - run Night 9 VPC lab first: .\HTML\study-lab\night-9-lab-vpc-build.ps1"
}

$vpcJson = Get-Content $VpcIdsFile -Raw | ConvertFrom-Json
$VpcId = $vpcJson.vpc.id
$PrivateSubnetA = $vpcJson.subnets.privateA.id
$PrivateSubnetB = $vpcJson.subnets.privateB.id

Write-Host '=== Night 16 Lab 2D part 1 - Aurora Serverless v2 ==='
Write-Host "VPC:           $VpcId"
Write-Host "Private subnets: $PrivateSubnetA, $PrivateSubnetB"
Write-Host "Cluster:       $ClusterId"
Write-Host ''

# --- Security groups ---
$lambdaSg = Get-SgIdByName $LambdaSgName $VpcId
if (-not $lambdaSg) {
    Write-Host "Creating security group $LambdaSgName ..."
    $lambdaSg = aws ec2 create-security-group --group-name $LambdaSgName `
        --description 'Night 16 stats Lambda (Night 17 attaches here)' `
        --vpc-id $VpcId --region $Region --query 'GroupId' --output text
    aws ec2 create-tags --resources $lambdaSg --region $Region `
        --tags "Key=Name,Value=$LambdaSgName" "Key=lab,Value=night-16" | Out-Null
} else {
    Write-Host "Security group $LambdaSgName already exists ($lambdaSg)."
}

$auroraSg = Get-SgIdByName $AuroraSgName $VpcId
if (-not $auroraSg) {
    Write-Host "Creating security group $AuroraSgName ..."
    $auroraSg = aws ec2 create-security-group --group-name $AuroraSgName `
        --description 'Night 16 Aurora PostgreSQL - ingress from lambda-stats-sg only' `
        --vpc-id $VpcId --region $Region --query 'GroupId' --output text
    aws ec2 create-tags --resources $auroraSg --region $Region `
        --tags "Key=Name,Value=$AuroraSgName" "Key=lab,Value=night-16" | Out-Null
} else {
    Write-Host "Security group $AuroraSgName already exists ($auroraSg)."
}

$sgDetail = aws ec2 describe-security-groups --group-ids $auroraSg --region $Region | ConvertFrom-Json
$hasIngress = $false
foreach ($perm in $sgDetail.SecurityGroups[0].IpPermissions) {
    if ($perm.FromPort -eq 5432 -and ($perm.UserIdGroupPairs.GroupId -contains $lambdaSg)) {
        $hasIngress = $true
    }
}
if (-not $hasIngress) {
    aws ec2 authorize-security-group-ingress --group-id $auroraSg --protocol tcp --port 5432 `
        --source-group $lambdaSg --region $Region | Out-Null
    Write-Host "Aurora SG allows TCP 5432 from $LambdaSgName."
} else {
    Write-Host 'Aurora SG ingress rule already present.'
}

# --- DB subnet group ---
$subnetGroupExists = Aws-Text @('rds', 'describe-db-subnet-groups', '--db-subnet-group-name', $SubnetGroup, '--region', $Region, '--query', 'DBSubnetGroups[0].DBSubnetGroupName')
if (-not $subnetGroupExists) {
    Write-Host "Creating DB subnet group $SubnetGroup ..."
    Aws-Run @('rds', 'create-db-subnet-group', '--db-subnet-group-name', $SubnetGroup, '--db-subnet-group-description', 'Night 16 Aurora - Night 9 private subnets', '--subnet-ids', $PrivateSubnetA, $PrivateSubnetB, '--region', $Region)
} else {
    Write-Host "DB subnet group $SubnetGroup already exists."
}

# --- Engine version (latest Serverless v2 capable PostgreSQL) ---
$EngineVersion = Aws-Text @('rds', 'describe-db-engine-versions', '--engine', 'aurora-postgresql', '--region', $Region, '--query', 'DBEngineVersions[?SupportsServerless==`true`] | sort_by(@, &EngineVersion) | [-1].EngineVersion')
if (-not $EngineVersion -or $EngineVersion -eq 'None') {
    $EngineVersion = '15.4'
    Write-Host "Could not query Serverless v2 engine version; falling back to $EngineVersion"
} else {
    Write-Host "Aurora PostgreSQL engine version: $EngineVersion"
}

# --- Aurora cluster ---
$supportsManagedSecret = Test-AwsFlag 'rds' 'create-db-cluster' '--manage-master-user-password'
$supportsServerlessV2 = Test-AwsFlag 'rds' 'create-db-cluster' '--serverless-v2-scaling-configuration'
$clusterExists = Aws-Text @('rds', 'describe-db-clusters', '--db-cluster-identifier', $ClusterId, '--region', $Region, '--query', 'DBClusters[0].DBClusterIdentifier')
if (-not $clusterExists) {
    Write-Host "Creating Aurora cluster $ClusterId (this takes several minutes) ..."
    if ($supportsManagedSecret -and $supportsServerlessV2) {
        Aws-Run @('rds', 'create-db-cluster', '--db-cluster-identifier', $ClusterId, '--engine', 'aurora-postgresql', '--engine-version', $EngineVersion, '--database-name', $DbName, '--master-username', $MasterUser, '--manage-master-user-password', '--vpc-security-group-ids', $auroraSg, '--db-subnet-group-name', $SubnetGroup, '--serverless-v2-scaling-configuration', "MinCapacity=$MinAcu,MaxCapacity=$MaxAcu", '--enable-http-endpoint', '--backup-retention-period', '1', '--region', $Region)
    } else {
        Write-Host 'AWS CLI lacks Serverless v2 flags — using master password + boto3 helper for scaling/instance.'
        if (-not $EngineVersion -or $EngineVersion -eq '15.4') { $EngineVersion = '15.15' }
        $generatedPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ })
        $null = New-LabMasterSecret $generatedPassword
        @{ username = $MasterUser; note = 'For RDS Data API only — also in Secrets Manager saa-study-gsa-aurora-master' } | ConvertTo-Json | Set-Content $LocalSecretFile
        Write-Host "Master password stored in Secrets Manager ($MasterSecretName). Local pointer: $LocalSecretFile"
        Aws-Run @('rds', 'create-db-cluster', '--db-cluster-identifier', $ClusterId, '--engine', 'aurora-postgresql', '--engine-version', $EngineVersion, '--database-name', $DbName, '--master-username', $MasterUser, '--master-user-password', $generatedPassword, '--vpc-security-group-ids', $auroraSg, '--db-subnet-group-name', $SubnetGroup, '--enable-http-endpoint', '--backup-retention-period', '1', '--region', $Region)
    }
    Wait-ClusterAvailable $ClusterId | Out-Null
} else {
    Write-Host "Cluster $ClusterId already exists."
    $clusterStatus = aws rds describe-db-clusters --db-cluster-identifier $ClusterId --region $Region `
        --query 'DBClusters[0].Status' --output text
    if ($clusterStatus -ne 'available') {
        Wait-ClusterAvailable $ClusterId | Out-Null
    }
}

# --- Serverless v2 instance ---
$instanceExists = Aws-Text @('rds', 'describe-db-instances', '--db-instance-identifier', $InstanceId, '--region', $Region, '--query', 'DBInstances[0].DBInstanceIdentifier')
if (-not $instanceExists) {
    if ($supportsServerlessV2) {
        Write-Host "Creating Aurora instance $InstanceId (db.serverless) ..."
        Aws-Run @('rds', 'create-db-instance', '--db-instance-identifier', $InstanceId, '--db-cluster-identifier', $ClusterId, '--engine', 'aurora-postgresql', '--db-instance-class', 'db.serverless', '--no-publicly-accessible', '--region', $Region)
        Wait-InstanceAvailable $InstanceId | Out-Null
    } else {
        Write-Host 'Running night-16-lab-aurora-boto3.py for Serverless v2 scaling + instance ...'
        python $Boto3Helper
        if ($LASTEXITCODE -ne 0) { throw "boto3 helper failed (exit $LASTEXITCODE)" }
    }
} else {
    Write-Host "Instance $InstanceId already exists."
    $instanceStatus = aws rds describe-db-instances --db-instance-identifier $InstanceId --region $Region `
        --query 'DBInstances[0].DBInstanceStatus' --output text
    if ($instanceStatus -ne 'available') {
        Wait-InstanceAvailable $InstanceId | Out-Null
    }
}

$clusterArn = aws rds describe-db-clusters --db-cluster-identifier $ClusterId --region $Region `
    --query 'DBClusters[0].DBClusterArn' --output text
$writerEndpoint = aws rds describe-db-clusters --db-cluster-identifier $ClusterId --region $Region `
    --query 'DBClusters[0].Endpoint' --output text
$readerEndpoint = aws rds describe-db-clusters --db-cluster-identifier $ClusterId --region $Region `
    --query 'DBClusters[0].ReaderEndpoint' --output text
$secretArn = Get-ClusterSecretArn
$httpEnabled = aws rds describe-db-clusters --db-cluster-identifier $ClusterId --region $Region `
    --query 'DBClusters[0].HttpEndpointEnabled' --output text
$publicFlag = aws rds describe-db-instances --db-instance-identifier $InstanceId --region $Region `
    --query 'DBInstances[0].PubliclyAccessible' --output text

Write-Host ''
Write-Host 'Cluster available.'
Write-Host "  Writer endpoint:  $writerEndpoint"
Write-Host "  Reader endpoint:  $readerEndpoint"
Write-Host "  Secret ARN:       $secretArn"
Write-Host "  Data API enabled: $httpEnabled"
Write-Host "  Public access:    $publicFlag"
Write-Host ''

function Invoke-DataApiSql([string]$Sql) {
    if (-not $secretArn -or $secretArn -eq 'None') {
        throw 'MasterUserSecret not found on cluster — cannot use RDS Data API'
    }
    $sqlFile = Join-Path $TmpDir 'stmt.sql'
    Write-Utf8NoBom $sqlFile $Sql
    aws rds-data execute-statement `
        --resource-arn $clusterArn `
        --secret-arn $secretArn `
        --database $DbName `
        --sql "file://$($sqlFile -replace '\\','/')" `
        --region $Region | Out-Null
}

if ($InitSchema) {
    if (-not (Test-Path $SchemaFile)) {
        throw "Missing schema file $SchemaFile"
    }
    Write-Host 'Applying night-16-resort-stats-schema.sql via RDS Data API ...'
    $rawSql = Get-Content $SchemaFile -Raw
    $statements = $rawSql -split ';'
    foreach ($stmt in $statements) {
        $lines = @()
        foreach ($line in ($stmt -split "`n")) {
            $t = $line.Trim()
            if ($t -eq '' -or $t.StartsWith('--')) { continue }
            $lines += $line
        }
        $clean = ($lines -join "`n").Trim()
        if (-not $clean) { continue }
        Write-Host "  SQL: $($clean.Substring(0, [Math]::Min(60, $clean.Length)))..."
        Invoke-DataApiSql $clean
    }
    Write-Host 'Schema applied.'
}

if ($VerifyRow) {
    Write-Host 'Verifying sample row IS-001 ...'
    $selectSql = "SELECT resort_id, resort_name, country_code, monthly_runs FROM resort_stats WHERE resort_id = 'IS-001'"
    $verifyOut = aws rds-data execute-statement `
        --resource-arn $clusterArn `
        --secret-arn $secretArn `
        --database $DbName `
        --sql $selectSql `
        --region $Region | ConvertFrom-Json
    if ($verifyOut.records -and $verifyOut.records.Count -gt 0) {
        $row = $verifyOut.records[0]
        Write-Host "  resort_id:     $($row[0].stringValue)"
        Write-Host "  resort_name:   $($row[1].stringValue)"
        Write-Host "  country_code:  $($row[2].stringValue)"
        Write-Host "  monthly_runs:  $($row[3].longValue)"
    } else {
        Write-Warning 'No row found for IS-001 — run with -InitSchema first'
    }
}

$result = @{
    lab = 'night-16-lab2d-aurora-part1'
    region = $Region
    completedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    vpc = @{ id = $VpcId; idsFile = 'night-9-vpc-ids.json' }
    aurora = @{
        clusterId = $ClusterId
        instanceId = $InstanceId
        clusterArn = $clusterArn
        database = $DbName
        masterUsername = $MasterUser
        masterUserSecretArn = $secretArn
        writerEndpoint = $writerEndpoint
        readerEndpoint = $readerEndpoint
        engineVersion = $EngineVersion
        serverlessV2 = @{ minAcu = $MinAcu; maxAcu = $MaxAcu }
        httpEndpointEnabled = ($httpEnabled -eq 'True')
        publiclyAccessible = ($publicFlag -eq 'True')
    }
    securityGroups = @{
        aurora = @{ name = $AuroraSgName; id = $auroraSg }
        lambdaStats = @{ name = $LambdaSgName; id = $lambdaSg }
        ingressRule = "lambda-stats-sg -> aurora-sg TCP 5432"
    }
    subnetGroup = @{
        name = $SubnetGroup
        subnetIds = @($PrivateSubnetA, $PrivateSubnetB)
    }
    schema = @{
        table = 'resort_stats'
        sqlFile = 'night-16-resort-stats-schema.sql'
        initialized = [bool]$InitSchema
    }
}
$result | ConvertTo-Json -Depth 6 | Set-Content $ResultFile -Encoding UTF8

Write-Host ''
Write-Host "Result saved: $ResultFile"
Write-Host 'Next: Night 17 Lambda in lambda-stats-sg reads/writes resort_stats.'
Write-Host 'Teardown when done: .\HTML\study-lab\night-16-lab-aurora-teardown.ps1'

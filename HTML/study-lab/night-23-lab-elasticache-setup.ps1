# Night 23 Lab 3A - ElastiCache Redis + cache-aside Lambda reader
# Run: .\HTML\study-lab\night-23-lab-elasticache-setup.ps1
# Options: -TestInvoke  -BenchLatency

param(
    [switch]$TestInvoke,
    [switch]$BenchLatency
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$ClusterId = "$Prefix-redis"
$SubnetGroupName = "$Prefix-redis-subnets"
$RedisSgName = "$Prefix-redis-sg"
$FunctionName = "$Prefix-cache-reader"
$RoleName = "$Prefix-cache-reader-role"
$Runtime = 'python3.12'
$Handler = 'night-23-lab-cache-handler.handler'
$TimeoutSec = 30
$MemoryMb = 256
$CacheNodeType = 'cache.t4g.micro'
$EngineVersion = '7.1'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HandlerFile = Join-Path $ScriptDir 'night-23-lab-cache-handler.py'
$TrustPolicyFile = Join-Path $ScriptDir 'night-18-lambda-trust-policy.json'
$AuroraResultFile = Join-Path $ScriptDir 'night-16-aurora-result.json'
$VpcIdsFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'
$ResultFile = Join-Path $ScriptDir 'night-23-elasticache-result.json'
$PackDir = Join-Path $env:TEMP 'night23-lambda-pack'
$ZipFile = Join-Path $env:TEMP 'night23-lambda.zip'
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

function Get-SgIdByName([string]$GroupName, [string]$VpcId) {
    return Aws-Text @('ec2', 'describe-security-groups', '--region', $Region, '--filters', "Name=group-name,Values=$GroupName", "Name=vpc-id,Values=$VpcId", '--query', 'SecurityGroups[0].GroupId')
}

function Get-Or-Load-AuroraConfig() {
    if (Test-Path $AuroraResultFile) {
        return Get-Content $AuroraResultFile -Raw | ConvertFrom-Json
    }
    $auroraClusterId = "$Prefix-aurora"
    $writer = Aws-Text @('rds', 'describe-db-clusters', '--db-cluster-identifier', $auroraClusterId, '--region', $Region, '--query', 'DBClusters[0].Endpoint')
    if (-not $writer) {
        throw "Missing $AuroraResultFile and cluster $auroraClusterId not found — run Night 16 setup first."
    }
    $secretArn = Aws-Text @('rds', 'describe-db-clusters', '--db-cluster-identifier', $auroraClusterId, '--region', $Region, '--query', 'DBClusters[0].MasterUserSecret.SecretArn')
    $vpcJson = Get-Content $VpcIdsFile -Raw | ConvertFrom-Json
    $lambdaSgName = "$Prefix-lambda-stats-sg"
    $lambdaSg = Get-SgIdByName $lambdaSgName $vpcJson.vpc.id
    return [pscustomobject]@{
        aurora = [pscustomobject]@{
            writerEndpoint = $writer
            database = 'gsa_stats'
            masterUserSecretArn = $secretArn
        }
        securityGroups = [pscustomobject]@{
            lambdaStats = [pscustomobject]@{ id = $lambdaSg; name = $lambdaSgName }
        }
        subnetGroup = [pscustomobject]@{
            subnetIds = @($vpcJson.subnets.privateA.id, $vpcJson.subnets.privateB.id)
        }
    }
}

function Ensure-RedisSubnetGroup([string[]]$SubnetIds) {
    $exists = Aws-Text @('elasticache', 'describe-cache-subnet-groups', '--cache-subnet-group-name', $SubnetGroupName, '--region', $Region, '--query', 'CacheSubnetGroups[0].CacheSubnetGroupName')
    if ($exists) {
        Write-Host "Cache subnet group $SubnetGroupName already exists."
        return
    }
    Write-Host "Creating cache subnet group $SubnetGroupName ..."
    Aws-Run @(
        'elasticache', 'create-cache-subnet-group',
        '--cache-subnet-group-name', $SubnetGroupName,
        '--cache-subnet-group-description', 'Night 23 Redis in Night 9 private subnets',
        '--subnet-ids', $SubnetIds[0], $SubnetIds[1],
        '--region', $Region
    )
}

function Ensure-RedisSecurityGroup([string]$VpcId, [string]$LambdaSgId) {
    $sgId = Get-SgIdByName $RedisSgName $VpcId
    if (-not $sgId) {
        Write-Host "Creating security group $RedisSgName ..."
        $sgId = aws ec2 create-security-group `
            --group-name $RedisSgName `
            --description 'Night 23 ElastiCache Redis - ingress from lambda-stats-sg only' `
            --vpc-id $VpcId `
            --region $Region `
            --query 'GroupId' --output text
        Start-Sleep -Seconds 3
    } else {
        Write-Host "Security group $RedisSgName already exists ($sgId)."
    }

    $ruleExists = Aws-Text @(
        'ec2', 'describe-security-groups', '--group-ids', $sgId, '--region', $Region,
        '--query', "SecurityGroups[0].IpPermissions[?FromPort==``6379`` && UserIdGroupPairs[?GroupId==``$LambdaSgId``]]"
    )
    if (-not $ruleExists -or $ruleExists -eq '[]') {
        Write-Host "Authorizing TCP 6379 on $RedisSgName from lambda-stats-sg ..."
        Aws-Run @(
            'ec2', 'authorize-security-group-ingress',
            '--group-id', $sgId,
            '--protocol', 'tcp',
            '--port', '6379',
            '--source-group', $LambdaSgId,
            '--region', $Region
        )
    }
    return $sgId
}

function Wait-CacheClusterAvailable([string]$Id, [int]$MaxMinutes = 15) {
    $deadline = (Get-Date).AddMinutes($MaxMinutes)
    while ((Get-Date) -lt $deadline) {
        $status = Aws-Text @('elasticache', 'describe-cache-clusters', '--cache-cluster-id', $Id, '--show-cache-node-info', '--region', $Region, '--query', 'CacheClusters[0].CacheClusterStatus')
        Write-Host "  Redis cluster status: $status"
        if ($status -eq 'available') { return }
        if ($status -in @('deleting', 'deleted')) {
            throw "Redis cluster $Id is $status"
        }
        Start-Sleep -Seconds 30
    }
    throw "Redis cluster $Id not available within $MaxMinutes minutes"
}

function Ensure-RedisCluster([string]$RedisSgId) {
    $status = Aws-Text @('elasticache', 'describe-cache-clusters', '--cache-cluster-id', $ClusterId, '--region', $Region, '--query', 'CacheClusters[0].CacheClusterStatus')
    if (-not $status) {
        Write-Host "Creating ElastiCache cluster $ClusterId ($CacheNodeType) — may take 5-10 min ..."
        Aws-Run @(
            'elasticache', 'create-cache-cluster',
            '--cache-cluster-id', $ClusterId,
            '--engine', 'redis',
            '--engine-version', $EngineVersion,
            '--cache-node-type', $CacheNodeType,
            '--num-cache-nodes', '1',
            '--cache-subnet-group-name', $SubnetGroupName,
            '--security-group-ids', $RedisSgId,
            '--tags', "Key=Project,Value=$Prefix", "Key=Night,Value=23",
            '--region', $Region
        )
    } else {
        Write-Host "ElastiCache cluster $ClusterId status: $status"
    }
    Wait-CacheClusterAvailable $ClusterId
}

function Get-RedisEndpoint() {
    $addr = Aws-Text @('elasticache', 'describe-cache-clusters', '--cache-cluster-id', $ClusterId, '--show-cache-node-info', '--region', $Region, '--query', 'CacheClusters[0].CacheNodes[0].Endpoint.Address')
    $port = Aws-Text @('elasticache', 'describe-cache-clusters', '--cache-cluster-id', $ClusterId, '--show-cache-node-info', '--region', $Region, '--query', 'CacheClusters[0].CacheNodes[0].Endpoint.Port')
    if (-not $addr) { throw "Redis endpoint not found for $ClusterId" }
    return @{ Address = $addr; Port = if ($port) { $port } else { '6379' } }
}

function New-LambdaZip() {
    if (Test-Path $PackDir) { Remove-Item -Recurse -Force $PackDir }
    New-Item -ItemType Directory -Force -Path $PackDir | Out-Null
    Copy-Item $HandlerFile (Join-Path $PackDir 'night-23-lab-cache-handler.py')
    Write-Host 'Installing redis + pg8000 into deployment package ...'
    & python -m pip install redis pg8000 -t $PackDir --quiet --disable-pip-version-check
    if ($LASTEXITCODE -ne 0) { throw 'pip install failed — ensure Python 3 is on PATH' }
    if (Test-Path $ZipFile) { Remove-Item -Force $ZipFile }
    Compress-Archive -Path (Join-Path $PackDir '*') -DestinationPath $ZipFile -Force
    Write-Host "Lambda zip: $ZipFile"
}

function Ensure-Role([string]$SecretArn) {
    $roleArn = Aws-Text @('iam', 'get-role', '--role-name', $RoleName, '--query', 'Role.Arn')
    if (-not $roleArn) {
        Write-Host "Creating IAM role $RoleName ..."
        $trustPath = $TrustPolicyFile -replace '\\', '/'
        $roleArn = aws iam create-role --role-name $RoleName `
            --assume-role-policy-document "file://$trustPath" `
            --description 'Night 23 cache-aside reader Lambda' `
            --query 'Role.Arn' --output text
        Start-Sleep -Seconds 10
    } else {
        Write-Host "IAM role $RoleName already exists."
    }

    $policyObj = @{
        Version = '2012-10-17'
        Statement = @(
            @{
                Effect = 'Allow'
                Action = @('logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents')
                Resource = 'arn:aws:logs:*:*:*'
            },
            @{
                Effect = 'Allow'
                Action = @(
                    'ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface',
                    'ec2:AssignPrivateIpAddresses', 'ec2:UnassignPrivateIpAddresses'
                )
                Resource = '*'
            },
            @{
                Effect = 'Allow'
                Action = @('secretsmanager:GetSecretValue')
                Resource = $SecretArn
            }
        )
    }
    $policyFile = Join-Path $env:TEMP 'night23-lambda-policy.json'
    Write-Utf8NoBom $policyFile (($policyObj | ConvertTo-Json -Depth 6 -Compress))
    $policyPath = $policyFile -replace '\\', '/'
    Aws-Run @('iam', 'put-role-policy', '--role-name', $RoleName, '--policy-name', 'night-23-cache-reader', '--policy-document', "file://$policyPath")
    return $roleArn
}

function Invoke-CacheLambda([hashtable]$Payload) {
    $payloadFile = Join-Path $env:TEMP 'night23-test-payload.json'
    Write-Utf8NoBom $payloadFile (($Payload | ConvertTo-Json -Compress))
    $payloadPath = $payloadFile -replace '\\', '/'
    $outFile = Join-Path $env:TEMP 'night23-lambda-out.json'
    if (Test-Path $outFile) { Remove-Item -Force $outFile }
    Write-Host 'Lambda invoke (cold start may take 15-45s) ...'
    aws lambda invoke --function-name $FunctionName --payload "file://$payloadPath" --region $Region $outFile | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'lambda invoke failed' }
    return Get-Content $outFile -Raw | ConvertFrom-Json
}

Write-Host '=== Night 23 Lab 3A - ElastiCache Redis cache-aside ==='

if (-not (Test-Path $VpcIdsFile)) {
    throw "Missing $VpcIdsFile — run Night 9 VPC lab first."
}

$vpcJson = Get-Content $VpcIdsFile -Raw | ConvertFrom-Json
$auroraCfg = Get-Or-Load-AuroraConfig
$writerEndpoint = $auroraCfg.aurora.writerEndpoint
$dbName = $auroraCfg.aurora.database
$secretArn = $auroraCfg.aurora.masterUserSecretArn
$lambdaSg = $auroraCfg.securityGroups.lambdaStats.id
$subnetIds = @($auroraCfg.subnetGroup.subnetIds)

if (-not $writerEndpoint -or -not $secretArn -or -not $lambdaSg) {
    throw 'Aurora writer, secret ARN, or lambda-stats-sg missing — re-run Night 16 setup.'
}

Ensure-RedisSubnetGroup $subnetIds
$redisSgId = Ensure-RedisSecurityGroup $vpcJson.vpc.id $lambdaSg
Ensure-RedisCluster $redisSgId
$redisEndpoint = Get-RedisEndpoint

New-LambdaZip
$roleArn = Ensure-Role $secretArn

$envVars = @{
    REDIS_HOST = $redisEndpoint.Address
    REDIS_PORT = "$($redisEndpoint.Port)"
    DB_HOST = $writerEndpoint
    DB_NAME = $dbName
    DB_SECRET_ARN = $secretArn
}
$envJson = (@{ Variables = $envVars } | ConvertTo-Json -Compress)
$zipPath = $ZipFile -replace '\\', '/'
$subnetCsv = ($subnetIds -join ',')
$sgCsv = $lambdaSg

$fnExists = Aws-Text @('lambda', 'get-function', '--function-name', $FunctionName, '--region', $Region, '--query', 'Configuration.FunctionName')
if (-not $fnExists) {
    Write-Host "Creating Lambda function $FunctionName ..."
    Aws-Run @(
        'lambda', 'create-function',
        '--function-name', $FunctionName,
        '--runtime', $Runtime,
        '--role', $roleArn,
        '--handler', $Handler,
        '--timeout', "$TimeoutSec",
        '--memory-size', "$MemoryMb",
        '--zip-file', "fileb://$zipPath",
        '--environment', $envJson,
        '--vpc-config', "SubnetIds=$subnetCsv,SecurityGroupIds=$sgCsv",
        '--region', $Region
    )
    Write-Host 'Waiting for Lambda VPC configuration to become active ...'
    Start-Sleep -Seconds 20
} else {
    Write-Host "Updating Lambda code and configuration for $FunctionName ..."
    Aws-Run @('lambda', 'update-function-code', '--function-name', $FunctionName, '--zip-file', "fileb://$zipPath", '--region', $Region)
    Start-Sleep -Seconds 5
    Aws-Run @('lambda', 'update-function-configuration', '--function-name', $FunctionName, '--timeout', "$TimeoutSec", '--memory-size', "$MemoryMb", '--environment', $envJson, '--vpc-config', "SubnetIds=$subnetCsv,SecurityGroupIds=$sgCsv", '--region', $Region)
    Start-Sleep -Seconds 15
}

$invokeResult = $null
$benchResult = $null
if ($BenchLatency) {
    $benchResult = Invoke-CacheLambda @{ action = 'bench'; resort_id = 'IS-001' }
    Write-Host 'Bench response:'
    $benchResult | ConvertTo-Json -Depth 6
} elseif ($TestInvoke) {
    $invokeResult = Invoke-CacheLambda @{ resort_id = 'IS-001' }
    Write-Host 'Invoke response:'
    $invokeResult | ConvertTo-Json -Depth 6
}

$fnArn = Aws-Text @('lambda', 'get-function', '--function-name', $FunctionName, '--region', $Region, '--query', 'Configuration.FunctionArn')
$result = @{
    lab = 'night-23-lab3a-elasticache-redis'
    region = $Region
    completedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    elasticache = @{
        clusterId = $ClusterId
        engine = 'redis'
        cacheNodeType = $CacheNodeType
        subnetGroupName = $SubnetGroupName
        endpoint = $redisEndpoint.Address
        port = [int]$redisEndpoint.Port
        securityGroupId = $redisSgId
        securityGroupName = $RedisSgName
    }
    lambda = @{
        functionName = $FunctionName
        functionArn = $fnArn
        roleName = $RoleName
        runtime = $Runtime
        handler = $Handler
        vpcSecurityGroupId = $lambdaSg
        subnetIds = $subnetIds
        cacheTtlSeconds = 300
    }
    aurora = @{
        writerEndpoint = $writerEndpoint
        database = $dbName
        secretArn = $secretArn
    }
    testInvoke = @{
        benchRan = [bool]$BenchLatency
        singleRan = [bool]$TestInvoke
        benchResponse = $benchResult
        singleResponse = $invokeResult
    }
}
$result | ConvertTo-Json -Depth 8 | Set-Content $ResultFile -Encoding UTF8

Write-Host ''
Write-Host "Result saved: $ResultFile"
Write-Host 'Teardown: .\HTML\study-lab\night-23-lab-elasticache-teardown.ps1'

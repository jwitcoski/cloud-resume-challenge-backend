# Night 17 Lab 2D part 2 - Lambda stats uploader in VPC -> Aurora
# Run: .\HTML\study-lab\night-17-lab-lambda-stats-setup.ps1
# Options: -TestInvoke  -VerifyRow  -SkipSqsMapping

param(
    [switch]$TestInvoke,
    [switch]$VerifyRow,
    [switch]$SkipSqsMapping
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$FunctionName = "$Prefix-stats-uploader"
$RoleName = "$Prefix-stats-uploader-role"
$MainQueue = "$Prefix-iceland-completion"
$Runtime = 'python3.12'
$Handler = 'night-17-lab-lambda-stats-handler.handler'
$TimeoutSec = 30
$MemoryMb = 256

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HandlerFile = Join-Path $ScriptDir 'night-17-lab-lambda-stats-handler.py'
$TrustPolicyFile = Join-Path $ScriptDir 'night-17-lambda-trust-policy.json'
$AuroraResultFile = Join-Path $ScriptDir 'night-16-aurora-result.json'
$SqsResultFile = Join-Path $ScriptDir 'night-13-sqs-result.json'
$ResultFile = Join-Path $ScriptDir 'night-17-lambda-stats-result.json'
$PackDir = Join-Path $env:TEMP 'night17-lambda-pack'
$ZipFile = Join-Path $env:TEMP 'night17-lambda.zip'
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

function Get-Or-Load-AuroraConfig() {
    if (Test-Path $AuroraResultFile) {
        return Get-Content $AuroraResultFile -Raw | ConvertFrom-Json
    }
    $clusterId = "$Prefix-aurora"
    $writer = Aws-Text @('rds', 'describe-db-clusters', '--db-cluster-identifier', $clusterId, '--region', $Region, '--query', 'DBClusters[0].Endpoint')
    if (-not $writer) {
        throw "Missing $AuroraResultFile and cluster $clusterId not found — run Night 16 setup first."
    }
    $secretArn = Aws-Text @('rds', 'describe-db-clusters', '--db-cluster-identifier', $clusterId, '--region', $Region, '--query', 'DBClusters[0].MasterUserSecret.SecretArn')
    $clusterArn = Aws-Text @('rds', 'describe-db-clusters', '--db-cluster-identifier', $clusterId, '--region', $Region, '--query', 'DBClusters[0].DBClusterArn')
    $vpcFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'
    $vpcJson = Get-Content $vpcFile -Raw | ConvertFrom-Json
    $lambdaSgName = "$Prefix-lambda-stats-sg"
    $lambdaSg = Aws-Text @('ec2', 'describe-security-groups', '--region', $Region, '--filters', "Name=group-name,Values=$lambdaSgName", "Name=vpc-id,Values=$($vpcJson.vpc.id)", '--query', 'SecurityGroups[0].GroupId')
    return [pscustomobject]@{
        aurora = [pscustomobject]@{
            writerEndpoint = $writer
            database = 'gsa_stats'
            clusterArn = $clusterArn
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

function Get-QueueArn() {
    if (Test-Path $SqsResultFile) {
        $sqs = Get-Content $SqsResultFile -Raw | ConvertFrom-Json
        return $sqs.queues.main.arn
    }
    $url = Aws-Text @('sqs', 'get-queue-url', '--queue-name', $MainQueue, '--region', $Region, '--query', 'QueueUrl')
    if (-not $url) { return $null }
    return Aws-Text @('sqs', 'get-queue-attributes', '--queue-url', $url, '--attribute-names', 'QueueArn', '--region', $Region, '--query', 'Attributes.QueueArn')
}

function New-LambdaZip() {
    if (Test-Path $PackDir) { Remove-Item -Recurse -Force $PackDir }
    New-Item -ItemType Directory -Force -Path $PackDir | Out-Null
    Copy-Item $HandlerFile (Join-Path $PackDir 'night-17-lab-lambda-stats-handler.py')
    Write-Host 'Installing pg8000 into deployment package ...'
    & python -m pip install pg8000 -t $PackDir --quiet --disable-pip-version-check
    if ($LASTEXITCODE -ne 0) { throw 'pip install pg8000 failed — ensure Python 3 is on PATH' }
    if (Test-Path $ZipFile) { Remove-Item -Force $ZipFile }
    Compress-Archive -Path (Join-Path $PackDir '*') -DestinationPath $ZipFile -Force
    Write-Host "Lambda zip: $ZipFile"
}

function Ensure-Role([string]$SecretArn, [string]$QueueArn) {
    $roleArn = Aws-Text @('iam', 'get-role', '--role-name', $RoleName, '--query', 'Role.Arn')
    if (-not $roleArn) {
        Write-Host "Creating IAM role $RoleName ..."
        $trustPath = $TrustPolicyFile -replace '\\', '/'
        $roleArn = aws iam create-role --role-name $RoleName `
            --assume-role-policy-document "file://$trustPath" `
            --description 'Night 17 stats uploader Lambda' `
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
    if ($QueueArn) {
        $policyObj.Statement += @{
            Effect = 'Allow'
            Action = @('sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes')
            Resource = $QueueArn
        }
    }
    $policyFile = Join-Path $env:TEMP 'night17-lambda-policy.json'
    Write-Utf8NoBom $policyFile (($policyObj | ConvertTo-Json -Depth 6 -Compress))
    $policyPath = $policyFile -replace '\\', '/'
    Aws-Run @('iam', 'put-role-policy', '--role-name', $RoleName, '--policy-name', 'night-17-stats-uploader', '--policy-document', "file://$policyPath")
    return $roleArn
}

function Ensure-EventSourceMapping([string]$QueueArn) {
    $existing = aws lambda list-event-source-mappings --function-name $FunctionName --region $Region | ConvertFrom-Json
    foreach ($m in $existing.EventSourceMappings) {
        if ($m.EventSourceArn -eq $QueueArn) {
            Write-Host 'SQS event source mapping already exists.'
            return $m.UUID
        }
    }
    Write-Host 'Creating SQS event source mapping ...'
    $uuid = aws lambda create-event-source-mapping `
        --function-name $FunctionName `
        --event-source-arn $QueueArn `
        --batch-size 1 `
        --enabled `
        --region $Region `
        --query 'UUID' --output text
    return $uuid
}

Write-Host '=== Night 17 Lab 2D part 2 - Lambda stats uploader ==='
$auroraCfg = Get-Or-Load-AuroraConfig
$writerEndpoint = $auroraCfg.aurora.writerEndpoint
$dbName = $auroraCfg.aurora.database
$secretArn = $auroraCfg.aurora.masterUserSecretArn
$lambdaSg = $auroraCfg.securityGroups.lambdaStats.id
$subnetIds = @($auroraCfg.subnetGroup.subnetIds)

if (-not $writerEndpoint -or -not $secretArn -or -not $lambdaSg) {
    throw 'Aurora result missing writerEndpoint, secret ARN, or lambda-stats-sg — re-run Night 16 setup.'
}

$queueArn = Get-QueueArn
if (-not $queueArn -and -not $SkipSqsMapping) {
    Write-Warning "Queue $MainQueue not found — use -SkipSqsMapping or run Night 13 setup."
    $SkipSqsMapping = $true
}

New-LambdaZip
$roleArn = Ensure-Role $secretArn $queueArn

$envVars = @{
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

$mappingUuid = $null
if (-not $SkipSqsMapping -and $queueArn) {
    $mappingUuid = Ensure-EventSourceMapping $queueArn
}

$testPayload = @{
    resort_id = 'IS-001'
    resort_name = 'Bláfjöll'
    country_code = 'IS'
} | ConvertTo-Json -Compress

$invokeResult = $null
if ($TestInvoke) {
    Write-Host 'Test invoke (cold start may take 15-45s) ...'
    $payloadFile = Join-Path $env:TEMP 'night17-test-payload.json'
    Write-Utf8NoBom $payloadFile $testPayload
    $payloadPath = $payloadFile -replace '\\', '/'
    $outFile = Join-Path $env:TEMP 'night17-lambda-out.json'
    if (Test-Path $outFile) { Remove-Item -Force $outFile }
    aws lambda invoke --function-name $FunctionName --payload "file://$payloadPath" --region $Region $outFile | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'lambda invoke failed' }
    $invokeResult = Get-Content $outFile -Raw | ConvertFrom-Json
    Write-Host 'Invoke response:'
    $invokeResult | ConvertTo-Json -Depth 6
}

if ($VerifyRow) {
    $clusterArn = $auroraCfg.aurora.clusterArn
    if (-not $clusterArn) {
        Write-Warning 'clusterArn missing — skip VerifyRow or re-run Night 16 setup.'
    } else {
        Write-Host 'Verifying resort_stats via RDS Data API ...'
        $selectSql = "SELECT resort_id, resort_name, monthly_runs FROM resort_stats WHERE resort_id = 'IS-001'"
        $verifyOut = aws rds-data execute-statement `
            --resource-arn $clusterArn `
            --secret-arn $secretArn `
            --database $dbName `
            --sql $selectSql `
            --region $Region | ConvertFrom-Json
        if ($verifyOut.records -and $verifyOut.records.Count -gt 0) {
            $row = $verifyOut.records[0]
            Write-Host "  resort_id:    $($row[0].stringValue)"
            Write-Host "  resort_name:  $($row[1].stringValue)"
            Write-Host "  monthly_runs: $($row[2].longValue)"
        }
    }
}

$fnArn = Aws-Text @('lambda', 'get-function', '--function-name', $FunctionName, '--region', $Region, '--query', 'Configuration.FunctionArn')
$result = @{
    lab = 'night-17-lab2d-lambda-stats-part2'
    region = $Region
    completedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    lambda = @{
        functionName = $FunctionName
        functionArn = $fnArn
        roleName = $RoleName
        runtime = $Runtime
        handler = $Handler
        timeoutSeconds = $TimeoutSec
        memoryMb = $MemoryMb
        vpcSecurityGroupId = $lambdaSg
        subnetIds = $subnetIds
    }
    aurora = @{
        writerEndpoint = $writerEndpoint
        database = $dbName
        secretArn = $secretArn
        resultFile = 'night-16-aurora-result.json'
    }
    sqs = @{
        queueName = $MainQueue
        queueArn = $queueArn
        eventSourceMappingUuid = $mappingUuid
        skippedMapping = [bool]$SkipSqsMapping
    }
    testInvoke = @{
        ran = [bool]$TestInvoke
        payload = if ($TestInvoke) { ($testPayload | ConvertFrom-Json) } else { $null }
        response = $invokeResult
    }
}
$result | ConvertTo-Json -Depth 8 | Set-Content $ResultFile -Encoding UTF8

Write-Host ''
Write-Host "Result saved: $ResultFile"
Write-Host 'Teardown: .\HTML\study-lab\night-17-lab-lambda-stats-teardown.ps1'

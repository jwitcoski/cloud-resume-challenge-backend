# Night 18 Lab — DynamoDB wiki views: PITR + Streams + stub stream Lambda
# Run: .\HTML\study-lab\night-18-lab-dynamodb-setup.ps1
# Options: -BumpView  -VerifyStream  -SkipStreamMapping

param(
    [switch]$BumpView,
    [switch]$VerifyStream,
    [switch]$SkipStreamMapping
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$AccountId = '298043721974'
$Prefix = 'saa-study-gsa'
$TableName = "$Prefix-wiki-views"
$FunctionName = "$Prefix-wiki-stream-processor"
$RoleName = "$Prefix-wiki-stream-role"
$Runtime = 'python3.12'
$Handler = 'night-18-lab-stream-handler.handler'
$TimeoutSec = 15
$MemoryMb = 128
$TestPageId = 'wiki/iceland'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HandlerFile = Join-Path $ScriptDir 'night-18-lab-stream-handler.py'
$TrustPolicyFile = Join-Path $ScriptDir 'night-18-lambda-trust-policy.json'
$ResultFile = Join-Path $ScriptDir 'night-18-dynamodb-result.json'
$PackDir = Join-Path $env:TEMP 'night18-lambda-pack'
$ZipFile = Join-Path $env:TEMP 'night18-lambda.zip'
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

function Ensure-Table() {
    $status = Aws-Text @('dynamodb', 'describe-table', '--table-name', $TableName, '--region', $Region, '--query', 'Table.TableStatus')
    if (-not $status) {
        Write-Host "Creating DynamoDB table $TableName (on-demand, stream NEW_AND_OLD_IMAGES) ..."
        Aws-Run @(
            'dynamodb', 'create-table',
            '--table-name', $TableName,
            '--attribute-definitions', 'AttributeName=pageId,AttributeType=S',
            '--key-schema', 'AttributeName=pageId,KeyType=HASH',
            '--billing-mode', 'PAY_PER_REQUEST',
            '--stream-specification', 'StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES',
            '--tags', "Key=Project,Value=$Prefix", 'Key=Night,Value=18',
            '--region', $Region
        )
        Write-Host 'Waiting for table ACTIVE ...'
        aws dynamodb wait table-exists --table-name $TableName --region $Region | Out-Null
    } else {
        Write-Host "Table $TableName already exists (status: $status)."
        $streamEnabled = Aws-Text @('dynamodb', 'describe-table', '--table-name', $TableName, '--region', $Region, '--query', 'Table.StreamSpecification.StreamEnabled')
        if ($streamEnabled -ne 'True') {
            Write-Host 'Enabling DynamoDB stream on existing table ...'
            Aws-Run @('dynamodb', 'update-table', '--table-name', $TableName, '--stream-specification', 'StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES', '--region', $Region)
            aws dynamodb wait table-exists --table-name $TableName --region $Region | Out-Null
        }
    }
}

function Ensure-Pitr() {
    $pitr = Aws-Text @('dynamodb', 'describe-continuous-backups', '--table-name', $TableName, '--region', $Region, '--query', 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus')
    if ($pitr -ne 'ENABLED') {
        Write-Host 'Enabling point-in-time recovery (PITR) ...'
        Aws-Run @(
            'dynamodb', 'update-continuous-backups',
            '--table-name', $TableName,
            '--point-in-time-recovery-specification', 'PointInTimeRecoveryEnabled=true',
            '--region', $Region
        )
    } else {
        Write-Host 'PITR already enabled.'
    }
}

function Seed-WikiPages() {
    $pages = @(
        @{ pageId = 'wiki/iceland'; title = 'Iceland resorts guide'; viewCount = 0 },
        @{ pageId = 'wiki/norway'; title = 'Norway resorts guide'; viewCount = 0 },
        @{ pageId = 'wiki/resume'; title = 'Cloud Resume Challenge'; viewCount = 42 }
    )
    foreach ($p in $pages) {
        $itemJson = (@{
            pageId = @{ S = $p.pageId }
            title = @{ S = $p.title }
            viewCount = @{ N = [string]$p.viewCount }
        } | ConvertTo-Json -Compress)
        $itemFile = Join-Path $env:TEMP "night18-seed-$($p.pageId -replace '/','-').json"
        Write-Utf8NoBom $itemFile $itemJson
        $itemPath = $itemFile -replace '\\', '/'
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'SilentlyContinue'
        aws dynamodb put-item --table-name $TableName --item "file://$itemPath" --condition-expression 'attribute_not_exists(pageId)' --region $Region 2>$null | Out-Null
        $ErrorActionPreference = $prev
    }
    Write-Host 'Seed rows ensured (wiki/iceland, wiki/norway, wiki/resume).'
}

function New-LambdaZip() {
    if (Test-Path $PackDir) { Remove-Item -Recurse -Force $PackDir }
    New-Item -ItemType Directory -Force -Path $PackDir | Out-Null
    Copy-Item $HandlerFile (Join-Path $PackDir 'night-18-lab-stream-handler.py')
    if (Test-Path $ZipFile) { Remove-Item -Force $ZipFile }
    Compress-Archive -Path (Join-Path $PackDir '*') -DestinationPath $ZipFile -Force
    Write-Host "Lambda zip: $ZipFile"
}

function Ensure-Role([string]$StreamArn) {
    $roleArn = Aws-Text @('iam', 'get-role', '--role-name', $RoleName, '--query', 'Role.Arn')
    if (-not $roleArn) {
        Write-Host "Creating IAM role $RoleName ..."
        $trustPath = $TrustPolicyFile -replace '\\', '/'
        $roleArn = aws iam create-role --role-name $RoleName `
            --assume-role-policy-document "file://$trustPath" `
            --description 'Night 18 DynamoDB stream stub processor' `
            --query 'Role.Arn' --output text
        Start-Sleep -Seconds 8
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
                    'dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:DescribeStream',
                    'dynamodb:ListStreams'
                )
                Resource = $StreamArn
            }
        )
    }
    $policyFile = Join-Path $env:TEMP 'night18-lambda-policy.json'
    Write-Utf8NoBom $policyFile (($policyObj | ConvertTo-Json -Depth 6 -Compress))
    $policyPath = $policyFile -replace '\\', '/'
    Aws-Run @('iam', 'put-role-policy', '--role-name', $RoleName, '--policy-name', 'night-18-wiki-stream', '--policy-document', "file://$policyPath")
    return $roleArn
}

function Ensure-EventSourceMapping([string]$StreamArn) {
    $existing = aws lambda list-event-source-mappings --function-name $FunctionName --region $Region | ConvertFrom-Json
    foreach ($m in $existing.EventSourceMappings) {
        if ($m.EventSourceArn -eq $StreamArn) {
            Write-Host 'DynamoDB stream event source mapping already exists.'
            return $m.UUID
        }
    }
    Write-Host 'Creating DynamoDB stream event source mapping (StartingPosition=LATEST) ...'
    $uuid = aws lambda create-event-source-mapping `
        --function-name $FunctionName `
        --event-source-arn $StreamArn `
        --starting-position LATEST `
        --batch-size 10 `
        --enabled `
        --region $Region `
        --query 'UUID' --output text
    return $uuid
}

function Bump-ViewCount([string]$PageId) {
    Write-Host "Bumping viewCount on $PageId ..."
    $keyFile = Join-Path $env:TEMP 'night18-bump-key.json'
    Write-Utf8NoBom $keyFile "{`"pageId`": {`"S`": `"$PageId`"}}"
    $valuesFile = Join-Path $env:TEMP 'night18-bump-values.json'
    Write-Utf8NoBom $valuesFile '{":inc": {"N": "1"}, ":now": {"S": "night-18-lab"}}'
    $out = aws dynamodb update-item `
        --table-name $TableName `
        --key "file://$($keyFile -replace '\\','/')" `
        --update-expression 'ADD viewCount :inc SET updatedAt = :now' `
        --expression-attribute-values "file://$($valuesFile -replace '\\','/')" `
        --return-values ALL_NEW `
        --region $Region | ConvertFrom-Json
    $count = $out.Attributes.viewCount.N
    Write-Host "  viewCount is now $count"
    return [int]$count
}

function Get-RecentStreamLogs() {
    $logGroup = "/aws/lambda/$FunctionName"
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws logs create-log-group --log-group-name $logGroup --region $Region | Out-Null
    $ErrorActionPreference = $prev

    Start-Sleep -Seconds 15
    $startMs = [int64]([DateTimeOffset]::UtcNow.AddMinutes(-5).ToUnixTimeMilliseconds())
    $events = aws logs filter-log-events `
        --log-group-name $logGroup `
        --start-time $startMs `
        --filter-pattern 'eventName' `
        --region $Region | ConvertFrom-Json
    return $events.events
}

Write-Host '=== Night 18 Lab — DynamoDB PITR + Streams ==='
Ensure-Table
Ensure-Pitr
Seed-WikiPages

$tableArn = Aws-Text @('dynamodb', 'describe-table', '--table-name', $TableName, '--region', $Region, '--query', 'Table.TableArn')
$streamArn = Aws-Text @('dynamodb', 'describe-table', '--table-name', $TableName, '--region', $Region, '--query', 'Table.LatestStreamArn')
$pitrStatus = Aws-Text @('dynamodb', 'describe-continuous-backups', '--table-name', $TableName, '--region', $Region, '--query', 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus')

if (-not $streamArn) { throw 'Table stream ARN missing — check stream specification.' }

New-LambdaZip
$roleArn = Ensure-Role $streamArn

$envJson = "Variables={TABLE_NAME=$TableName}"
$zipPath = $ZipFile -replace '\\', '/'

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
        '--region', $Region
    )
} else {
    Write-Host "Updating Lambda code for $FunctionName ..."
    Aws-Run @('lambda', 'update-function-code', '--function-name', $FunctionName, '--zip-file', "fileb://$zipPath", '--region', $Region)
    Start-Sleep -Seconds 3
    Aws-Run @('lambda', 'update-function-configuration', '--function-name', $FunctionName, '--timeout', "$TimeoutSec", '--memory-size', "$MemoryMb", '--environment', $envJson, '--region', $Region)
}

$mappingUuid = $null
if (-not $SkipStreamMapping) {
    $mappingUuid = Ensure-EventSourceMapping $streamArn
}

$bumpResult = $null
$streamLogs = @()
if ($BumpView -or $VerifyStream) {
    $bumpResult = Bump-ViewCount $TestPageId
}
if ($VerifyStream) {
    Write-Host 'Checking CloudWatch for stream processor logs ...'
    $streamLogs = @(Get-RecentStreamLogs)
    if ($streamLogs.Count -gt 0) {
        Write-Host 'Stream log lines:'
        foreach ($e in $streamLogs) { Write-Host "  $($e.message)" }
    } else {
        Write-Warning "No stream log lines yet - wait 10s and re-run with -VerifyStream, or check /aws/lambda/$FunctionName"
    }
}

$fnArn = Aws-Text @('lambda', 'get-function', '--function-name', $FunctionName, '--region', $Region, '--query', 'Configuration.FunctionArn')
$result = @{
    lab = 'night-18-dynamodb-pitr-streams'
    region = $Region
    completedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    dynamodb = @{
        tableName = $TableName
        tableArn = $tableArn
        streamArn = $streamArn
        pitrStatus = $pitrStatus
        billingMode = 'PAY_PER_REQUEST'
        streamViewType = 'NEW_AND_OLD_IMAGES'
        partitionKey = 'pageId'
    }
    lambda = @{
        functionName = $FunctionName
        functionArn = $fnArn
        roleName = $RoleName
        runtime = $Runtime
        handler = $Handler
        eventSourceMappingUuid = $mappingUuid
        skippedMapping = [bool]$SkipStreamMapping
    }
    test = @{
        bumpView = [bool]$BumpView
        verifyStream = [bool]$VerifyStream
        testPageId = $TestPageId
        viewCountAfterBump = $bumpResult
        streamLogLines = @($streamLogs | ForEach-Object { $_.message })
    }
    prodCompare = @{
        note = 'GSA prod uses WikiPages/Revisions/Comments; this study table mirrors wiki view counters only'
        night17Contrast = 'Night 17 UPSERTs resort_stats in Aurora over TCP 5432; tonight increments viewCount via UpdateItem ADD'
    }
}
$result | ConvertTo-Json -Depth 8 | Set-Content $ResultFile -Encoding UTF8

Write-Host ''
Write-Host "Result saved: $ResultFile"
Write-Host ''
Write-Host 'Next steps:'
Write-Host '  .\HTML\study-lab\night-18-lab-dynamodb-setup.ps1 -BumpView -VerifyStream'
Write-Host 'Teardown: .\HTML\study-lab\night-18-lab-dynamodb-teardown.ps1'

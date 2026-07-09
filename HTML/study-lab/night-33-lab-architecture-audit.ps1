# Night 33 Lab — Read-only GSA full-stack architecture audit
# Run: .\HTML\study-lab\night-33-lab-architecture-audit.ps1
# Options: -PrintPillarMap

param(
    [switch]$PrintPillarMap
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Cluster = 'globalskiatlas-backend-k8s'
$TaskFamily = 'globalskiatlas-backend-k8s-iceland'
$WikiLambda = 'wiki-api'
$WikiLambdaCandidates = @('wiki-api', 'sam-app-WikiApiFunction-E7soNy97MhEn')
$StatsLambda = 'saa-study-gsa-stats-uploader'
$GlueDb = 'saa_study_gsa_night24'
$AthenaWg = 'saa-study-night24'
$StateMachineName = 'saa-study-gsa-iceland-pipeline'
$SfnScheduleRule = 'saa-study-gsa-iceland-monthly-sfn'
$LegacyScheduleRule = 'saa-study-gsa-iceland-monthly'
$AuroraCluster = 'saa-study-gsa-aurora'
$RedisCluster = 'saa-study-gsa-redis'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VpcIdsFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'
$ResultFile = Join-Path $ScriptDir 'night-33-architecture-result.json'
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

function Aws-Json([string[]]$AwsArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $out = & aws @AwsArgs --output json 2>$null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0 -or -not $out) { return $null }
    try { return $out | ConvertFrom-Json } catch { return $null }
}

function Print-PillarMap {
    Write-Host ''
    Write-Host '=== Well-Architected pillar -> GSA nights (Night 33) ==='
    Write-Host 'Operational Excellence : 26 (dashboards), 28 (audit), 32 (Step Functions history)'
    Write-Host 'Security             : 1-7 (KMS, Cognito, IAM), 17 (Lambda roles)'
    Write-Host 'Reliability          : 14-19 (SQS DLQ, Backup, Multi-AZ), 25 (Route 53 failover)'
    Write-Host 'Performance          : 23 (Redis), 24 (Athena partitions), 26 (CloudFront)'
    Write-Host 'Cost Optimization    : 27, 30 (lifecycle), 31 (Fargate right-sizing)'
    Write-Host 'Sustainability       : 30-31 awareness (scheduled batch, right-sized tasks)'
    Write-Host ''
    Write-Host 'See gsa-architecture-map.md for tier wins matrix.'
}

function Get-CloudFrontEdge {
    $data = Aws-Json @('cloudfront', 'list-distributions')
    if (-not $data -or -not $data.DistributionList.Items) {
        return @{ tier = 'edge'; found = $false; note = 'No CloudFront distributions visible' }
    }
    foreach ($dist in $data.DistributionList.Items) {
        $aliases = @($dist.Aliases.Items)
        $aliasHit = $aliases | Where-Object { $_ -match 'globalskiatlas' }
        if ($aliasHit) {
            return @{
                tier = 'edge'
                found = $true
                distributionId = $dist.Id
                domainName = $dist.DomainName
                aliases = $aliases
                enabled = $dist.Enabled
                originsCount = $dist.Origins.Items.Count
                note = 'Route 53 -> CloudFront -> S3 + API GW origins'
            }
        }
    }
    $first = $data.DistributionList.Items[0]
    return @{
        tier = 'edge'
        found = $true
        distributionId = $first.Id
        domainName = $first.DomainName
        aliases = @($first.Aliases.Items)
        enabled = $first.Enabled
        originsCount = $first.Origins.Items.Count
        note = 'globalskiatlas alias not matched — verify alias in console'
    }
}

function Get-ApplicationTier {
    $wikiArn = $null
    $wikiRuntime = $null
    $resolvedWikiName = $null
    foreach ($candidate in $WikiLambdaCandidates) {
        $wikiArn = Aws-Text @('lambda', 'get-function', '--function-name', $candidate, '--region', $Region, '--query', 'Configuration.FunctionArn')
        if ($wikiArn) {
            $resolvedWikiName = $candidate
            $wikiRuntime = Aws-Text @('lambda', 'get-function', '--function-name', $candidate, '--region', $Region, '--query', 'Configuration.Runtime')
            break
        }
    }
    if (-not $wikiArn) {
        $allFns = Aws-Json @('lambda', 'list-functions', '--region', $Region)
        if ($allFns -and $allFns.Functions) {
            $match = $allFns.Functions | Where-Object { $_.FunctionName -match 'WikiApi|wiki-api' } | Select-Object -First 1
            if ($match) {
                $resolvedWikiName = $match.FunctionName
                $wikiArn = $match.FunctionArn
                $wikiRuntime = $match.Runtime
            }
        }
    }
    $tables = Aws-Json @('dynamodb', 'list-tables', '--region', $Region)
    $wikiTables = @()
    if ($tables -and $tables.TableNames) {
        $wikiTables = @($tables.TableNames | Where-Object { $_ -match 'Wiki|wiki' })
    }
    $apis = Aws-Json @('apigateway', 'get-rest-apis', '--region', $Region)
    $wikiApi = $null
    if ($apis -and $apis.items) {
        $wikiApi = $apis.items | Where-Object { $_.name -match 'Wiki|wiki' } | Select-Object -First 1
    }
    return @{
        tier = 'application'
        found = ([bool]$wikiArn -or $wikiTables.Count -gt 0)
        wikiLambda = @{ name = $(if ($resolvedWikiName) { $resolvedWikiName } else { $WikiLambda }); arn = $wikiArn; runtime = $wikiRuntime }
        apiGateway = if ($wikiApi) { @{ id = $wikiApi.id; name = $wikiApi.name } } else { $null }
        dynamoDbWikiTables = $wikiTables
        note = 'Cognito JWT on mutating wiki methods; Secrets Manager for client secret'
    }
}

function Get-DataTier {
    $aurora = Aws-Json @('rds', 'describe-db-clusters', '--region', $Region, '--db-cluster-identifier', $AuroraCluster)
    $auroraFound = $false
    $auroraStatus = $null
    if ($aurora -and $aurora.DBClusters -and $aurora.DBClusters.Count -gt 0) {
        $auroraFound = $true
        $auroraStatus = $aurora.DBClusters[0].Status
    } else {
        $all = Aws-Json @('rds', 'describe-db-clusters', '--region', $Region)
        if ($all -and $all.DBClusters) {
            $match = $all.DBClusters | Where-Object { $_.DBClusterIdentifier -match 'gsa|saa-study' } | Select-Object -First 1
            if ($match) {
                $auroraFound = $true
                $auroraStatus = $match.Status
                $AuroraCluster = $match.DBClusterIdentifier
            }
        }
    }
    $redis = Aws-Json @('elasticache', 'describe-cache-clusters', '--region', $Region, '--cache-cluster-id', $RedisCluster, '--show-cache-node-info')
    $redisFound = $false
    if ($redis -and $redis.CacheClusters -and $redis.CacheClusters.Count -gt 0) {
        $redisFound = $true
    } else {
        $allRedis = Aws-Json @('elasticache', 'describe-cache-clusters', '--region', $Region)
        if ($allRedis -and $allRedis.CacheClusters) {
            $match = $allRedis.CacheClusters | Where-Object { $_.CacheClusterId -match 'gsa|saa-study' } | Select-Object -First 1
            if ($match) { $redisFound = $true; $RedisCluster = $match.CacheClusterId }
        }
    }
    return @{
        tier = 'data'
        found = ($auroraFound -or $redisFound)
        aurora = @{ clusterId = $AuroraCluster; found = $auroraFound; status = $auroraStatus }
        elasticache = @{ clusterId = $RedisCluster; found = $redisFound }
        note = 'Aurora OLTP source of truth; Redis cache-aside (Night 23) — OK if torn down'
    }
}

function Get-AnalyticsTier {
    $glue = Aws-Json @('glue', 'get-database', '--region', $Region, '--name', $GlueDb)
    $glueFound = [bool]$glue
    if (-not $glueFound) {
        $dbs = Aws-Json @('glue', 'get-databases', '--region', $Region)
        if ($dbs -and $dbs.DatabaseList) {
            $match = $dbs.DatabaseList | Where-Object { $_.Name -match 'night24|gsa' } | Select-Object -First 1
            if ($match) { $glueFound = $true; $GlueDb = $match.Name }
        }
    }
    $wg = Aws-Json @('athena', 'get-work-group', '--region', $Region, '--work-group', $AthenaWg)
    $wgFound = [bool]$wg
    if (-not $wgFound) {
        $wgs = Aws-Json @('athena', 'list-work-groups', '--region', $Region)
        if ($wgs -and $wgs.WorkGroups) {
            $match = $wgs.WorkGroups | Where-Object { $_.Name -match 'night24|saa-study' } | Select-Object -First 1
            if ($match) { $wgFound = $true; $AthenaWg = $match.Name }
        }
    }
    return @{
        tier = 'analytics'
        found = ($glueFound -or $wgFound)
        glueDatabase = @{ name = $GlueDb; found = $glueFound }
        athenaWorkgroup = @{ name = $AthenaWg; found = $wgFound }
        note = 'Athena on S3 Iceberg — not for live OLTP writes'
    }
}

function Get-PipelineTier {
    $taskDef = Aws-Json @('ecs', 'describe-task-definition', '--task-definition', $TaskFamily, '--region', $Region)
    $taskFound = [bool]$taskDef
    $cpu = $null; $mem = $null
    if ($taskDef) {
        $cpu = $taskDef.taskDefinition.cpu
        $mem = $taskDef.taskDefinition.memory
    }
    $clusterStatus = Aws-Text @('ecs', 'describe-clusters', '--clusters', $Cluster, '--region', $Region, '--query', 'clusters[0].status')
    $sfnQuery = 'stateMachines[?name==''' + $StateMachineName + '''].stateMachineArn | [0]'
    $sfnArn = Aws-Text @('stepfunctions', 'list-state-machines', '--region', $Region, '--query', $sfnQuery)
    $sfnFound = [bool]$sfnArn
    $sfnRule = Aws-Text @('events', 'describe-rule', '--name', $SfnScheduleRule, '--region', $Region, '--query', 'Arn')
    $legacyRule = Aws-Text @('events', 'describe-rule', '--name', $LegacyScheduleRule, '--region', $Region, '--query', 'Arn')
    $statsArn = Aws-Text @('lambda', 'get-function', '--function-name', $StatsLambda, '--region', $Region, '--query', 'Configuration.FunctionArn')
    return @{
        tier = 'pipeline'
        found = ($taskFound -or $sfnFound -or $legacyRule)
        ecs = @{
            cluster = $Cluster
            clusterStatus = $clusterStatus
            taskFamily = $TaskFamily
            taskDefFound = $taskFound
            cpu = $cpu
            memoryMiB = $mem
        }
        stepFunctions = @{ name = $StateMachineName; found = $sfnFound; arn = $sfnArn; scheduleRule = $SfnScheduleRule; scheduleFound = [bool]$sfnRule }
        legacyEventBridgeRule = @{ name = $LegacyScheduleRule; found = [bool]$legacyRule; arn = $legacyRule }
        statsUploaderLambda = @{ name = $StatsLambda; found = [bool]$statsArn; arn = $statsArn }
        note = 'Disable double schedule if both legacy and SFN rules enabled (Night 32)'
    }
}

function Get-NetworkTier {
    $vpcId = $null
    $cidr = $null
    if (Test-Path $VpcIdsFile) {
        $vpcJson = Get-Content $VpcIdsFile -Raw | ConvertFrom-Json
        if ($vpcJson.vpcId) { $vpcId = $vpcJson.vpcId }
        elseif ($vpcJson.vpc -and $vpcJson.vpc.id) { $vpcId = $vpcJson.vpc.id }
    }
    if ($vpcId) {
        $cidr = Aws-Text @('ec2', 'describe-vpcs', '--vpc-ids', $vpcId, '--region', $Region, '--query', 'Vpcs[0].CidrBlock')
    }
    $natCount = 0
    if ($vpcId) {
        $nats = Aws-Json @('ec2', 'describe-nat-gateways', '--region', $Region, '--filter', "Name=vpc-id,Values=$vpcId", 'Name=state,Values=available')
        if ($nats -and $nats.NatGateways) { $natCount = $nats.NatGateways.Count }
    }
    return @{
        tier = 'network'
        found = [bool]$vpcId
        vpcId = $vpcId
        cidr = $cidr
        natGatewayCount = $natCount
        vpcIdsFile = $VpcIdsFile
        note = 'Single NAT AZ risk (Night 9); S3/ECR endpoints reduce NAT GB'
    }
}

function Get-TierWinsScaffold {
    return @{
        edge = @{
            security = 'Cognito JWT on wiki writes; TLS at CloudFront'
            resilience = 'Route 53 failover + health check on PRIMARY (Night 25)'
            cost = 'CachingOptimized static; CachingDisabled on wiki API paths until safe TTL'
        }
        application = @{
            security = 'Secrets Manager + KMS for Cognito secret; least-privilege Lambda IAM'
            resilience = 'Idempotent SQS handlers; Lambda error handling on async paths'
            cost = 'Right-size Lambda memory; API GW usage plans for partners'
        }
        data = @{
            security = 'Aurora/DynamoDB in private subnets; SG ingress from Lambda SG only'
            resilience = 'Aurora Multi-AZ; PITR + AWS Backup; DynamoDB PITR'
            cost = 'ElastiCache cache-aside reduces Aurora read load'
        }
        analytics = @{
            security = 'S3 bucket policies; IAM on Athena workgroup'
            resilience = 'Iceberg snapshots for point-in-time reads'
            cost = 'Athena partitions + lifecycle on old export prefixes'
        }
        pipeline = @{
            security = 'ECS execution vs task role split; Step Functions iam:PassRole scoped'
            resilience = 'SQS DLQ; SNS failure fan-out; Step Functions Catch per step'
            cost = 'Scheduled Fargate vs 24/7; lifecycle iceland/ -> IA -> Glacier'
        }
        network = @{
            security = 'Private subnets for compute ENIs; no 0.0.0.0/0 on data SGs'
            resilience = '2-AZ subnets; document single-NAT AZ risk'
            cost = 'VPC endpoints for S3/ECR vs NAT data processing'
        }
    }
}

Write-Host "Night 33 architecture audit - region $Region (read-only)"
$account = Aws-Text @('sts', 'get-caller-identity', '--query', 'Account')
if (-not $account) {
    Write-Error 'aws sts get-caller-identity failed - configure AWS CLI'
}
Write-Host "Account: $account"

$edge = Get-CloudFrontEdge
Write-Host ''
Write-Host '=== Edge / Frontend ==='
if ($edge.found) { Write-Host "FOUND CloudFront $($edge.distributionId) - $($edge.domainName)" } else { Write-Host 'MISSING CloudFront distribution' }

$app = Get-ApplicationTier
Write-Host ''
Write-Host '=== Application ==='
if ($app.found) { Write-Host "FOUND Wiki Lambda $($app.wikiLambda.name)" } else { Write-Host "MISSING Wiki Lambda (search wiki-api or WikiApi in console)" }
if ($app.dynamoDbWikiTables.Count -gt 0) { Write-Host "  DynamoDB tables: $($app.dynamoDbWikiTables -join ', ')" }

$data = Get-DataTier
Write-Host ''
Write-Host '=== Data / OLTP ==='
if ($data.aurora.found) { Write-Host "FOUND Aurora $($data.aurora.clusterId)" } else { Write-Host 'MISSING Aurora cluster (OK if Night 16 torn down)' }
if ($data.elasticache.found) { Write-Host "FOUND ElastiCache $($data.elasticache.clusterId)" } else { Write-Host 'MISSING ElastiCache (OK if Night 23 torn down)' }

$analytics = Get-AnalyticsTier
Write-Host ''
Write-Host '=== Analytics ==='
if ($analytics.glueDatabase.found) { Write-Host "FOUND Glue DB $($analytics.glueDatabase.name)" } else { Write-Host 'MISSING Glue database' }
if ($analytics.athenaWorkgroup.found) { Write-Host "FOUND Athena WG $($analytics.athenaWorkgroup.name)" } else { Write-Host 'MISSING Athena workgroup' }

$pipeline = Get-PipelineTier
Write-Host ''
Write-Host '=== Pipeline / Compute ==='
if ($pipeline.ecs.taskDefFound) { Write-Host "FOUND ECS task def $TaskFamily - CPU $($pipeline.ecs.cpu) / memory $($pipeline.ecs.memoryMiB) MiB" } else { Write-Host 'MISSING ECS task definition' }
if ($pipeline.stepFunctions.found) { Write-Host "FOUND Step Functions $StateMachineName" } else { Write-Host 'MISSING Step Functions (run Night 32 deploy)' }
if ($pipeline.legacyEventBridgeRule.found) { Write-Host "FOUND Legacy schedule $LegacyScheduleRule" } else { Write-Host 'MISSING Legacy EventBridge schedule' }

$network = Get-NetworkTier
Write-Host ''
Write-Host '=== Network ==='
if ($network.found) { Write-Host "FOUND VPC $($network.vpcId) $($network.cidr) - NAT count: $($network.natGatewayCount)" } else { Write-Host 'MISSING night-9-vpc-ids.json or VPC' }

$tiers = @($edge, $app, $data, $analytics, $pipeline, $network)
$foundCount = ($tiers | Where-Object { $_.found }).Count
$totalCount = $tiers.Count

Write-Host ''
Write-Host "Tiers with live resources: $foundCount/$totalCount"

$result = @{
    lab = 'night-33-architecture-audit'
    region = $Region
    account = $account
    auditedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    tiersFound = $foundCount
    tiersTotal = $totalCount
    tiers = @{
        edge = $edge
        application = $app
        data = $data
        analytics = $analytics
        pipeline = $pipeline
        network = $network
    }
    tierWinsScaffold = Get-TierWinsScaffold
    wellArchitectedPillars = @{
        operationalExcellence = @('night-26', 'night-28', 'night-32')
        security = @('night-1', 'night-2', 'night-3', 'night-7', 'night-17')
        reliability = @('night-14', 'night-15', 'night-19', 'night-25')
        performanceEfficiency = @('night-23', 'night-24', 'night-26')
        costOptimization = @('night-27', 'night-30', 'night-31')
        sustainability = @('night-30', 'night-31')
    }
    nextSteps = @(
        'Fill tierWinsScaffold with your own sentences in portfolio notes'
        'Draw full stack from gsa-architecture-map.md'
        'Take night-33-quiz.json'
    )
}

$json = $result | ConvertTo-Json -Depth 10
Write-Utf8NoBom $ResultFile $json
Write-Host ''
Write-Host "Wrote $ResultFile"

if ($PrintPillarMap) { Print-PillarMap }

Write-Host ''
Write-Host 'Next: complete Block 2 write-up in night-33-architecture-writeup.md, then quiz 33.'

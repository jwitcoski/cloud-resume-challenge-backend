# Night 23 teardown — ElastiCache Redis, cache-reader Lambda, redis-sg, subnet group
# Run: .\HTML\study-lab\night-23-lab-elasticache-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'
$ClusterId = "$Prefix-redis"
$SubnetGroupName = "$Prefix-redis-subnets"
$RedisSgName = "$Prefix-redis-sg"
$FunctionName = "$Prefix-cache-reader"
$RoleName = "$Prefix-cache-reader-role"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-23-elasticache-result.json'
$VpcIdsFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'

Write-Host '=== Night 23 ElastiCache lab teardown ==='

$prev = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
aws lambda delete-function --function-name $FunctionName --region $Region | Out-Null
$ErrorActionPreference = $prev
Write-Host "Deleted Lambda function $FunctionName (if it existed)."

Start-Sleep -Seconds 3

$ErrorActionPreference = 'SilentlyContinue'
aws iam delete-role-policy --role-name $RoleName --policy-name 'night-23-cache-reader' | Out-Null
aws iam delete-role --role-name $RoleName | Out-Null
$ErrorActionPreference = $prev
Write-Host "Deleted IAM role $RoleName (if it existed)."

$logGroup = "/aws/lambda/$FunctionName"
$ErrorActionPreference = 'SilentlyContinue'
aws logs delete-log-group --log-group-name $logGroup --region $Region | Out-Null
$ErrorActionPreference = $prev

$ErrorActionPreference = 'SilentlyContinue'
aws elasticache delete-cache-cluster --cache-cluster-id $ClusterId --region $Region | Out-Null
$ErrorActionPreference = $prev
Write-Host "Delete requested for ElastiCache cluster $ClusterId (if it existed)."

$prevEa = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
$deadline = (Get-Date).AddMinutes(10)
while ((Get-Date) -lt $deadline) {
    $status = aws elasticache describe-cache-clusters --cache-cluster-id $ClusterId --region $Region --query 'CacheClusters[0].CacheClusterStatus' --output text 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $status -or $status -eq 'None') { break }
    Write-Host "  Waiting for cluster removal: $status"
    if ($status -eq 'deleting') { Start-Sleep -Seconds 20; continue }
    Start-Sleep -Seconds 10
}
$ErrorActionPreference = $prevEa

$ErrorActionPreference = 'SilentlyContinue'
aws elasticache delete-cache-subnet-group --cache-subnet-group-name $SubnetGroupName --region $Region | Out-Null
$ErrorActionPreference = $prev
Write-Host "Deleted cache subnet group $SubnetGroupName (if it existed)."

if (Test-Path $VpcIdsFile) {
    $vpcId = (Get-Content $VpcIdsFile -Raw | ConvertFrom-Json).vpc.id
    $sgId = aws ec2 describe-security-groups --region $Region `
        --filters "Name=group-name,Values=$RedisSgName" "Name=vpc-id,Values=$vpcId" `
        --query 'SecurityGroups[0].GroupId' --output text 2>$null
    if ($sgId -and $sgId -ne 'None') {
        $ErrorActionPreference = 'SilentlyContinue'
        aws ec2 delete-security-group --group-id $sgId --region $Region | Out-Null
        $ErrorActionPreference = $prev
        Write-Host "Deleted security group $RedisSgName ($sgId) if unused."
    }
}

if (Test-Path $ResultFile) {
    Remove-Item -Force $ResultFile
}

Write-Host 'Night 23 study resources removed. Night 9 VPC, Night 16 Aurora, Night 17 stats uploader unchanged.'

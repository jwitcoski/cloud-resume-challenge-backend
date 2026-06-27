# Night 16 teardown - Aurora cluster, instance, subnet group, security groups
# Run: .\HTML\study-lab\night-16-lab-aurora-teardown.ps1

$ErrorActionPreference = 'Continue'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'
$ClusterId = "$Prefix-aurora"
$InstanceId = "$Prefix-aurora-instance"
$SubnetGroup = "$Prefix-aurora-subnets"
$AuroraSgName = "$Prefix-aurora-sg"
$LambdaSgName = "$Prefix-lambda-stats-sg"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VpcIdsFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'
$ResultFile = Join-Path $ScriptDir 'night-16-aurora-result.json'

Write-Host '=== Night 16 Aurora teardown ==='

$instanceExists = aws rds describe-db-instances --db-instance-identifier $InstanceId --region $Region `
    --query 'DBInstances[0].DBInstanceIdentifier' --output text 2>$null
if ($instanceExists -and $instanceExists -ne 'None') {
    Write-Host "Deleting instance $InstanceId ..."
    aws rds delete-db-instance --db-instance-identifier $InstanceId `
        --skip-final-snapshot --region $Region 2>$null
    Write-Host 'Waiting for instance deletion (may take several minutes) ...'
    $deadline = (Get-Date).AddMinutes(15)
    while ((Get-Date) -lt $deadline) {
        $status = aws rds describe-db-instances --db-instance-identifier $InstanceId --region $Region `
            --query 'DBInstances[0].DBInstanceStatus' --output text 2>$null
        if (-not $status -or $status -eq 'None') { break }
        Write-Host "  Instance status: $status"
        Start-Sleep -Seconds 30
    }
}

$clusterExists = aws rds describe-db-clusters --db-cluster-identifier $ClusterId --region $Region `
    --query 'DBClusters[0].DBClusterIdentifier' --output text 2>$null
if ($clusterExists -and $clusterExists -ne 'None') {
    Write-Host "Deleting cluster $ClusterId ..."
    aws rds delete-db-cluster --db-cluster-identifier $ClusterId `
        --skip-final-snapshot --region $Region 2>$null
    Write-Host 'Waiting for cluster deletion ...'
    $deadline = (Get-Date).AddMinutes(15)
    while ((Get-Date) -lt $deadline) {
        $status = aws rds describe-db-clusters --db-cluster-identifier $ClusterId --region $Region `
            --query 'DBClusters[0].Status' --output text 2>$null
        if (-not $status -or $status -eq 'None') { break }
        Write-Host "  Cluster status: $status"
        Start-Sleep -Seconds 30
    }
}

aws rds delete-db-subnet-group --db-subnet-group-name $SubnetGroup --region $Region 2>$null
Write-Host "Removed DB subnet group $SubnetGroup (if existed)."

if (Test-Path $VpcIdsFile) {
    $VpcId = (Get-Content $VpcIdsFile -Raw | ConvertFrom-Json).vpc.id
    foreach ($sgName in @($AuroraSgName, $LambdaSgName)) {
        $sgId = aws ec2 describe-security-groups --region $Region `
            --filters "Name=group-name,Values=$sgName" "Name=vpc-id,Values=$VpcId" `
            --query 'SecurityGroups[0].GroupId' --output text 2>$null
        if ($sgId -and $sgId -ne 'None') {
            aws ec2 delete-security-group --group-id $sgId --region $Region 2>$null
            Write-Host "Deleted security group $sgName ($sgId)"
        }
    }
}

if (Test-Path $ResultFile) { Remove-Item $ResultFile }

$secretArn = aws secretsmanager describe-secret --secret-id "$Prefix-aurora-master" --region $Region `
    --query 'ARN' --output text 2>$null
if ($secretArn -and $secretArn -ne 'None') {
    aws secretsmanager delete-secret --secret-id $secretArn --force-delete-without-recovery --region $Region 2>$null
    Write-Host 'Deleted Secrets Manager secret saa-study-gsa-aurora-master'
}

$localSecret = Join-Path $ScriptDir 'night-16-aurora-local-secret.json'
if (Test-Path $localSecret) { Remove-Item $localSecret }

Write-Host 'Night 16 Aurora resources removed. Night 9 VPC and Night 12-14 labs unchanged.'

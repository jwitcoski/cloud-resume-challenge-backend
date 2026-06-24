# Night 9 Lab 2A teardown - delete study VPC + NAT (PowerShell)
# Run: .\HTML\study-lab\night-9-lab-vpc-teardown.ps1

$ErrorActionPreference = 'Continue'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'

$vpcId = aws ec2 describe-vpcs --region $Region `
    --filters "Name=tag:Name,Values=${Prefix}-vpc" `
    --query 'Vpcs[0].VpcId' --output text 2>$null

if (-not $vpcId -or $vpcId -eq 'None') {
    Write-Host "No ${Prefix}-vpc found - nothing to tear down."
    exit 0
}

Write-Host "Tearing down VPC $vpcId ..."

# NAT first (blocks subnet delete)
$natIds = aws ec2 describe-nat-gateways --region $Region `
    --filter "Name=vpc-id,Values=$vpcId" `
    --query "NatGateways[?State!='deleted'].NatGatewayId" --output text 2>$null

if ($natIds -and $natIds -ne 'None') {
    foreach ($nat in $natIds.Split()) {
        if (-not $nat) { continue }
        Write-Host "Deleting NAT $nat ..."
        aws ec2 delete-nat-gateway --nat-gateway-id $nat --region $Region | Out-Null
        aws ec2 wait nat-gateway-deleted --nat-gateway-ids $nat --region $Region 2>$null
        if ($LASTEXITCODE -ne 0) { Start-Sleep -Seconds 60 }
    }
}

# Detach + delete IGW
$igwId = aws ec2 describe-internet-gateways --region $Region `
    --filters "Name=attachment.vpc-id,Values=$vpcId" `
    --query 'InternetGateways[0].InternetGatewayId' --output text 2>$null
if ($igwId -and $igwId -ne 'None') {
    aws ec2 detach-internet-gateway --internet-gateway-id $igwId --vpc-id $vpcId --region $Region 2>$null
    aws ec2 delete-internet-gateway --internet-gateway-id $igwId --region $Region 2>$null
    Write-Host "Deleted IGW $igwId"
}

# Delete non-default route tables (retry loop for associations)
$allRts = aws ec2 describe-route-tables --region $Region `
    --filters "Name=vpc-id,Values=$vpcId" --output json | ConvertFrom-Json
foreach ($rt in $allRts.RouteTables) {
    $isMain = $false
    foreach ($assoc in $rt.Associations) {
        if ($assoc.Main -eq $true) { $isMain = $true }
    }
    if (-not $isMain) {
        Write-Host "Deleting route table $($rt.RouteTableId) ..."
        aws ec2 delete-route-table --route-table-id $rt.RouteTableId --region $Region 2>$null
    }
}

# Delete subnets
$subIds = aws ec2 describe-subnets --region $Region `
    --filters "Name=vpc-id,Values=$vpcId" `
    --query 'Subnets[].SubnetId' --output text 2>$null
if ($subIds -and $subIds -ne 'None') {
    foreach ($sub in $subIds.Split()) {
        aws ec2 delete-subnet --subnet-id $sub --region $Region 2>$null
    }
}

# Delete non-default security groups
$sgIds = aws ec2 describe-security-groups --region $Region `
    --filters "Name=vpc-id,Values=$vpcId" `
    --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>$null
if ($sgIds -and $sgIds -ne 'None') {
    foreach ($sg in $sgIds.Split()) {
        aws ec2 delete-security-group --group-id $sg --region $Region 2>$null
    }
}

# Release NAT EIP
$eipAlloc = aws ec2 describe-addresses --region $Region `
    --filters "Name=tag:Name,Values=${Prefix}-nat-eip" `
    --query 'Addresses[0].AllocationId' --output text 2>$null
if ($eipAlloc -and $eipAlloc -ne 'None') {
    aws ec2 release-address --allocation-id $eipAlloc --region $Region 2>$null
    Write-Host "Released EIP $eipAlloc"
}

aws ec2 delete-vpc --vpc-id $vpcId --region $Region
if ($LASTEXITCODE -eq 0) {
    Write-Host "VPC $vpcId deleted."
} else {
    Write-Host "VPC delete failed - check for remaining ENIs or dependencies."
    exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$idsFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'
if (Test-Path $idsFile) {
    Rename-Item $idsFile "$idsFile.teardown-bak" -Force
    Write-Host "Renamed night-9-vpc-ids.json to .teardown-bak"
}

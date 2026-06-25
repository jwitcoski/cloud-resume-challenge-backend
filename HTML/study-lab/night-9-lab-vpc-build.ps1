# Night 9 Lab 2A - VPC build (PowerShell)
# Run: .\HTML\study-lab\night-9-lab-vpc-build.ps1
# Output: night-9-vpc-ids.json

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Region = 'us-east-1'
$AzA = 'us-east-1a'
$AzB = 'us-east-1b'
$Prefix = 'saa-study-gsa'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$IdsFile = Join-Path $ScriptDir 'night-9-vpc-ids.json'

function Tag-Spec([string]$ResourceType, [string]$Name) {
    return "ResourceType=$ResourceType,Tags=[{Key=Name,Value=$Name},{Key=Project,Value=saa-study},{Key=Lab,Value=night-9-lab2a}]"
}

function Aws-Run([string[]]$AwsArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & aws @AwsArgs 2>$null | Out-Null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "aws $($AwsArgs -join ' ') failed (exit $code)" }
}

function Aws-Text([string[]]$AwsArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & aws @AwsArgs --output text 2>$null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "aws $($AwsArgs -join ' ') failed (exit $code)" }
    return ($out | Out-String).Trim()
}

function Get-OrCreate([string]$Label, [string[]]$DescribeArgs, [string[]]$CreateArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $id = (aws @DescribeArgs --output text 2>$null)
    $ErrorActionPreference = $prev
    if ($id -and $id -ne 'None') {
        Write-Host "Reusing $Label $id"
        return $id
    }
    $id = Aws-Text $CreateArgs
    Write-Host "Created $Label $id"
    return $id
}

Write-Host '=== Night 9 Lab 2A - VPC build ==='

$VpcId = Get-OrCreate 'VPC' @(
    'ec2', 'describe-vpcs', '--region', $Region,
    '--filters', "Name=tag:Name,Values=${Prefix}-vpc",
    '--query', 'Vpcs[0].VpcId'
) @(
    'ec2', 'create-vpc', '--cidr-block', '10.0.0.0/16', '--region', $Region,
    '--tag-specifications', (Tag-Spec 'vpc' "${Prefix}-vpc"),
    '--query', 'Vpc.VpcId'
)

Aws-Run @('ec2', 'modify-vpc-attribute', '--vpc-id', $VpcId, '--enable-dns-hostnames', '--region', $Region)
Aws-Run @('ec2', 'modify-vpc-attribute', '--vpc-id', $VpcId, '--enable-dns-support', '--region', $Region)

$IgwId = Get-OrCreate 'IGW' @(
    'ec2', 'describe-internet-gateways', '--region', $Region,
    '--filters', "Name=attachment.vpc-id,Values=$VpcId",
    '--query', 'InternetGateways[0].InternetGatewayId'
) @(
    'ec2', 'create-internet-gateway', '--region', $Region,
    '--tag-specifications', (Tag-Spec 'internet-gateway' "${Prefix}-igw"),
    '--query', 'InternetGateway.InternetGatewayId'
)
$attached = Aws-Text @(
    'ec2', 'describe-internet-gateways', '--internet-gateway-ids', $IgwId, '--region', $Region,
    '--query', "InternetGateways[0].Attachments[?VpcId=='$VpcId'].State | [0]"
)
if ($attached -ne 'available') {
    Aws-Run @('ec2', 'attach-internet-gateway', '--internet-gateway-id', $IgwId, '--vpc-id', $VpcId, '--region', $Region)
    Write-Host "Attached IGW $IgwId to VPC $VpcId"
}

function Get-Subnet([string]$Name, [string]$Cidr, [string]$Az, [bool]$Public) {
    $sid = Get-OrCreate "subnet $Name" @(
        'ec2', 'describe-subnets', '--region', $Region,
        '--filters', "Name=vpc-id,Values=$VpcId", "Name=tag:Name,Values=$Name",
        '--query', 'Subnets[0].SubnetId'
    ) @(
        'ec2', 'create-subnet', '--vpc-id', $VpcId, '--cidr-block', $Cidr,
        '--availability-zone', $Az, '--region', $Region,
        '--tag-specifications', (Tag-Spec 'subnet' $Name),
        '--query', 'Subnet.SubnetId'
    )
    if ($Public) {
        Aws-Run @('ec2', 'modify-subnet-attribute', '--subnet-id', $sid, '--map-public-ip-on-launch', '--region', $Region)
    }
    return $sid
}

$PubA = Get-Subnet "${Prefix}-public-a" '10.0.1.0/24' $AzA $true
$PubB = Get-Subnet "${Prefix}-public-b" '10.0.2.0/24' $AzB $true
$PrivA = Get-Subnet "${Prefix}-private-a" '10.0.11.0/24' $AzA $false
$PrivB = Get-Subnet "${Prefix}-private-b" '10.0.12.0/24' $AzB $false

function Get-RouteTable([string]$Name) {
    Get-OrCreate "route table $Name" @(
        'ec2', 'describe-route-tables', '--region', $Region,
        '--filters', "Name=vpc-id,Values=$VpcId", "Name=tag:Name,Values=$Name",
        '--query', 'RouteTables[0].RouteTableId'
    ) @(
        'ec2', 'create-route-table', '--vpc-id', $VpcId, '--region', $Region,
        '--tag-specifications', (Tag-Spec 'route-table' $Name),
        '--query', 'RouteTable.RouteTableId'
    )
}

$RtPublic = Get-RouteTable "${Prefix}-rt-public"
$RtPrivate = Get-RouteTable "${Prefix}-rt-private"

$prev = $ErrorActionPreference; $ErrorActionPreference = 'SilentlyContinue'
aws ec2 create-route --route-table-id $RtPublic --destination-cidr-block 0.0.0.0/0 `
    --gateway-id $IgwId --region $Region 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Aws-Run @('ec2', 'replace-route', '--route-table-id', $RtPublic, '--destination-cidr-block', '0.0.0.0/0',
        '--gateway-id', $IgwId, '--region', $Region)
}
$ErrorActionPreference = $prev

function Associate-RouteTable([string]$SubnetId, [string]$RtId) {
    $prev = $ErrorActionPreference; $ErrorActionPreference = 'SilentlyContinue'
    $assoc = aws ec2 describe-route-tables --region $Region `
        --filters "Name=association.subnet-id,Values=$SubnetId" `
        --query "RouteTables[0].Associations[?SubnetId=='$SubnetId'].RouteTableAssociationId" --output text 2>$null
    $ErrorActionPreference = $prev
    if (-not $assoc -or $assoc -eq 'None') {
        Aws-Run @('ec2', 'associate-route-table', '--subnet-id', $SubnetId, '--route-table-id', $RtId, '--region', $Region)
    }
}

Associate-RouteTable $PubA $RtPublic
Associate-RouteTable $PubB $RtPublic
Associate-RouteTable $PrivA $RtPrivate
Associate-RouteTable $PrivB $RtPrivate

$EipAlloc = Get-OrCreate 'EIP' @(
    'ec2', 'describe-addresses', '--region', $Region,
    '--filters', "Name=tag:Name,Values=${Prefix}-nat-eip",
    '--query', 'Addresses[0].AllocationId'
) @(
    'ec2', 'allocate-address', '--domain', 'vpc', '--region', $Region,
    '--tag-specifications', (Tag-Spec 'elastic-ip' "${Prefix}-nat-eip"),
    '--query', 'AllocationId'
)

$NatId = Get-OrCreate 'NAT Gateway' @(
    'ec2', 'describe-nat-gateways', '--region', $Region,
    '--filter', "Name=vpc-id,Values=$VpcId", 'Name=state,Values=available,pending',
    '--query', "NatGateways[?Tags[?Key=='Name' && Value=='${Prefix}-nat-a'] && State!='failed'].NatGatewayId | [0]"
) @(
    'ec2', 'create-nat-gateway', '--subnet-id', $PubA, '--allocation-id', $EipAlloc, '--region', $Region,
    '--tag-specifications', (Tag-Spec 'natgateway' "${Prefix}-nat-a"),
    '--query', 'NatGateway.NatGatewayId'
)

$natState = Aws-Text @('ec2', 'describe-nat-gateways', '--nat-gateway-ids', $NatId, '--region', $Region, '--query', 'NatGateways[0].State')
if ($natState -ne 'available') {
    Write-Host "Waiting for NAT Gateway $NatId (state: $natState) ..."
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 10
        $natState = Aws-Text @('ec2', 'describe-nat-gateways', '--nat-gateway-ids', $NatId, '--region', $Region, '--query', 'NatGateways[0].State')
        Write-Host "  NAT state: $natState"
        if ($natState -eq 'available') { break }
        if ($natState -eq 'failed') { throw "NAT Gateway $NatId failed - check IGW attached to VPC" }
    }
    if ($natState -ne 'available') { throw "NAT Gateway $NatId not available after 10 min" }
}

$prev = $ErrorActionPreference; $ErrorActionPreference = 'SilentlyContinue'
aws ec2 create-route --route-table-id $RtPrivate --destination-cidr-block 0.0.0.0/0 `
    --nat-gateway-id $NatId --region $Region 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Aws-Run @('ec2', 'replace-route', '--route-table-id', $RtPrivate, '--destination-cidr-block', '0.0.0.0/0',
        '--nat-gateway-id', $NatId, '--region', $Region)
}
$ErrorActionPreference = $prev

$SgId = Get-OrCreate 'Fargate SG' @(
    'ec2', 'describe-security-groups', '--region', $Region,
    '--filters', "Name=vpc-id,Values=$VpcId", "Name=group-name,Values=${Prefix}-fargate-sg",
    '--query', 'SecurityGroups[0].GroupId'
) @(
    'ec2', 'create-security-group', '--group-name', "${Prefix}-fargate-sg",
    '--description', 'SAA study Fargate pipeline tasks outbound only',
    '--vpc-id', $VpcId, '--region', $Region,
    '--tag-specifications', (Tag-Spec 'security-group' "${Prefix}-fargate-sg"),
    '--query', 'GroupId'
)
$prev = $ErrorActionPreference; $ErrorActionPreference = 'SilentlyContinue'
aws ec2 authorize-security-group-egress --group-id $SgId --ip-permissions `
    'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description=HTTPS}]' `
    --region $Region 2>$null | Out-Null
$ErrorActionPreference = $prev

$result = @{
    lab = 'night-9-lab2a-vpc-build'
    region = $Region
    builtAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    vpc = @{ id = $VpcId; cidr = '10.0.0.0/16' }
    internetGateway = $IgwId
    subnets = @{
        publicA = @{ id = $PubA; cidr = '10.0.1.0/24'; az = $AzA }
        publicB = @{ id = $PubB; cidr = '10.0.2.0/24'; az = $AzB }
        privateA = @{ id = $PrivA; cidr = '10.0.11.0/24'; az = $AzA }
        privateB = @{ id = $PrivB; cidr = '10.0.12.0/24'; az = $AzB }
    }
    routeTables = @{ public = $RtPublic; private = $RtPrivate }
    natGateway = @{ id = $NatId; subnet = $PubA; eipAllocation = $EipAlloc }
    securityGroups = @{ fargate = $SgId }
    night10 = @{
        ecsSubnets = @($PrivA, $PrivB)
        assignPublicIp = 'DISABLED'
        note = 'Run Iceland task with these private subnets + fargate SG'
    }
    teardown = '.\HTML\study-lab\night-9-lab-vpc-teardown.ps1'
} | ConvertTo-Json -Depth 5
$result | Set-Content -Path $IdsFile -Encoding utf8

Write-Host ''
Write-Host '=== Build complete ==='
Write-Host "IDs written to $IdsFile"
Write-Host "VPC: $VpcId  NAT: $NatId  Fargate SG: $SgId"
Write-Host 'Next: .\HTML\study-lab\night-12-lab-eventbridge-schedule.ps1 -TestFire'

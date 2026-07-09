# Night 34 master study teardown — run lab scripts in safe order
# Run: .\HTML\study-lab\night-34-lab-study-teardown.ps1
#      .\HTML\study-lab\night-34-lab-study-teardown.ps1 -WhatIf
#
# Removes study-lab stacks to cut idle NAT, Aurora, ElastiCache, EC2 charges.
# KEEPS production: globalskiatlas.com / witcoskitech.com CloudFront, WAF, wiki API, Cognito, prod DynamoDB.

param(
    [switch]$WhatIf,
    [switch]$SkipVpc
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-TeardownStep {
    param(
        [string]$Name,
        [string]$ScriptPath
    )
    if (-not (Test-Path $ScriptPath)) {
        Write-Host "[skip] $Name — script not found: $ScriptPath"
        return
    }
    if ($WhatIf) {
        Write-Host "[whatif] $Name — $ScriptPath"
        return
    }
    Write-Host ""
    Write-Host "=== $Name ==="
    & $ScriptPath
}

Write-Host 'Night 34 master study teardown'
Write-Host 'Keeps prod edge, wiki API, Cognito, and prod S3 objects.'
if ($WhatIf) { Write-Host 'WHATIF mode — no scripts executed.' }

# Orchestration + cost labs (newest first)
Invoke-TeardownStep 'Step Functions capstone (Night 32)' (Join-Path $ScriptDir 'night-32-lab-stepfunctions-teardown.ps1')
Invoke-TeardownStep 'S3 lifecycle study rule (Night 30)' (Join-Path $ScriptDir 'night-30-lab-s3-lifecycle-teardown.ps1')

# Week 4 compute / edge labs
Invoke-TeardownStep 'EC2/EBS demo (Night 27)' (Join-Path $ScriptDir 'night-27-lab-ec2-teardown.ps1')
Invoke-TeardownStep 'Route 53 lab records (Night 25)' (Join-Path $ScriptDir 'night-25-lab-route53-teardown.ps1')
Invoke-TeardownStep 'Athena/Glue lab (Night 24)' (Join-Path $ScriptDir 'night-24-lab-athena-teardown.ps1')
Invoke-TeardownStep 'ElastiCache Redis (Night 23)' (Join-Path $ScriptDir 'night-23-lab-elasticache-teardown.ps1')

# Week 3 data / migration labs
Invoke-TeardownStep 'DMS/migration export lab (Night 20)' (Join-Path $ScriptDir 'night-20-lab-migration-teardown.ps1')
Invoke-TeardownStep 'AWS Backup lab (Night 19)' (Join-Path $ScriptDir 'night-19-lab-backup-teardown.ps1')
Invoke-TeardownStep 'Stats uploader Lambda (Night 17)' (Join-Path $ScriptDir 'night-17-lab-lambda-stats-teardown.ps1')
Invoke-TeardownStep 'Aurora study cluster (Night 16)' (Join-Path $ScriptDir 'night-16-lab-aurora-teardown.ps1')

# Week 2 integration (after SFN torn down)
Invoke-TeardownStep 'SNS study subscriptions (Night 14)' (Join-Path $ScriptDir 'night-14-lab-sns-teardown.ps1')
Invoke-TeardownStep 'SQS study queues (Night 13)' (Join-Path $ScriptDir 'night-13-lab-sqs-teardown.ps1')
Invoke-TeardownStep 'EventBridge legacy Iceland cron (Night 12)' (Join-Path $ScriptDir 'night-12-lab-eventbridge-teardown.ps1')

# Read-only lab artifacts (local JSON only)
Invoke-TeardownStep 'Architecture audit result (Night 33)' (Join-Path $ScriptDir 'night-33-lab-architecture-teardown.ps1')
Invoke-TeardownStep 'Fargate rightsizing result (Night 31)' (Join-Path $ScriptDir 'night-31-lab-fargate-rightsizing-teardown.ps1')

# VPC last — removes NAT (largest idle saver)
if ($SkipVpc) {
    Write-Host ''
    Write-Host '[skip] Night 9 VPC — -SkipVpc set (NAT still billing).'
} else {
    Invoke-TeardownStep 'VPC + NAT Gateway (Night 9)' (Join-Path $ScriptDir 'night-9-lab-vpc-teardown.ps1')
}

Write-Host ''
Write-Host 'Master teardown complete.'
Write-Host 'Still running (by design): prod CloudFront, WAF, wiki API, Cognito, visitor DynamoDB tables.'
Write-Host 'Optional: week1-teardown-full.sh for Night 5 Config/CloudTrail labs if those were re-enabled.'

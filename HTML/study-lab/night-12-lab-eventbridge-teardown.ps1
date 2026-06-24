# Night 12 teardown — EventBridge rule, IAM role, alarm (PowerShell)
# Run: .\HTML\study-lab\night-12-lab-eventbridge-teardown.ps1

$ErrorActionPreference = "Continue"
$Region = "us-east-1"
$AccountId = "298043721974"
$Prefix = "saa-study-gsa"
$RuleName = "$Prefix-iceland-monthly"
$RoleName = "$Prefix-eventbridge-ecs"
$AlarmName = "$Prefix-iceland-task-failed"
$PolicyArn = "arn:aws:iam::${AccountId}:policy/${RoleName}"

Write-Host "=== Night 12 teardown ==="

$targetIds = aws events list-targets-by-rule --rule $RuleName --region $Region `
    --query "Targets[*].Id" --output text 2>$null
if ($targetIds -and $targetIds -ne "None") {
    aws events remove-targets --rule $RuleName --ids $targetIds.Split() --region $Region 2>$null
}

aws events delete-rule --name $RuleName --region $Region 2>$null
aws cloudwatch delete-alarms --alarm-names $AlarmName --region $Region 2>$null
aws iam detach-role-policy --role-name $RoleName --policy-arn $PolicyArn 2>$null
aws iam delete-role --role-name $RoleName 2>$null
aws iam delete-policy --policy-arn $PolicyArn 2>$null

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$result = Join-Path $ScriptDir "night-12-eventbridge-result.json"
if (Test-Path $result) { Remove-Item $result }

Write-Host "Night 12 EventBridge resources removed. VPC from Night 9 unchanged."

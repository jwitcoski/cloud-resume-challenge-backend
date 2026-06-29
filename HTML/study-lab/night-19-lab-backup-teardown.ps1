# Night 19 Lab teardown — AWS Backup vault, plan, selection, recovery points
# Run: .\HTML\study-lab\night-19-lab-backup-teardown.ps1

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'
$TableName = "$Prefix-wiki-views"
$VaultName = "$Prefix-backup-vault"
$PlanName = "$Prefix-night19-plan"
$SelectionName = "$Prefix-night19-selection"
$RoleName = "$Prefix-backup-role"
$TagKey = 'saa-study-backup'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-19-backup-result.json'

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

Write-Host '=== Night 19 teardown — AWS Backup ==='

$planId = $null
$selectionId = $null
if (Test-Path $ResultFile) {
    $saved = Get-Content $ResultFile -Raw | ConvertFrom-Json
    $planId = $saved.backupPlanId
    $selectionId = $saved.backupSelectionId
}

if (-not $planId) {
    $planId = Aws-Text @('backup', 'list-backup-plans', '--region', $Region, '--query', "BackupPlansList[?BackupPlanName=='$PlanName'].BackupPlanId | [0]")
}
if (-not $selectionId -and $planId) {
    $selectionId = Aws-Text @('backup', 'list-backup-selections', '--backup-plan-id', $planId, '--region', $Region, '--query', "BackupSelectionsList[?SelectionName=='$SelectionName'].SelectionId | [0]")
}

if ($planId -and $selectionId) {
    Write-Host "Deleting backup selection $selectionId ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws backup delete-backup-selection --backup-plan-id $planId --selection-id $selectionId --region $Region | Out-Null
    $ErrorActionPreference = $prev
}

if ($planId) {
    Write-Host "Deleting backup plan $planId ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws backup delete-backup-plan --backup-plan-id $planId --region $Region | Out-Null
    $ErrorActionPreference = $prev
}

$vaultExists = Aws-Text @('backup', 'describe-backup-vault', '--backup-vault-name', $VaultName, '--region', $Region, '--query', 'BackupVaultName')
if ($vaultExists) {
    Write-Host "Deleting recovery points in vault $VaultName ..."
    while ($true) {
        $rps = Aws-Text @('backup', 'list-recovery-points-by-backup-vault', '--backup-vault-name', $VaultName, '--region', $Region, '--query', 'RecoveryPoints[].RecoveryPointArn')
        if (-not $rps) { break }
        foreach ($rp in ($rps -split "`t|`n")) {
            if (-not $rp) { continue }
            Write-Host "  Deleting recovery point $rp ..."
            $prev = $ErrorActionPreference
            $ErrorActionPreference = 'SilentlyContinue'
            aws backup delete-recovery-point --backup-vault-name $VaultName --recovery-point-arn $rp --region $Region | Out-Null
            $ErrorActionPreference = $prev
        }
        Start-Sleep -Seconds 5
    }
    Write-Host "Deleting backup vault $VaultName ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws backup delete-backup-vault --backup-vault-name $VaultName --region $Region | Out-Null
    $ErrorActionPreference = $prev
}

$tableArn = Aws-Text @('dynamodb', 'describe-table', '--table-name', $TableName, '--region', $Region, '--query', 'Table.TableArn')
if ($tableArn) {
    Write-Host "Removing tag $TagKey from $TableName ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws dynamodb untag-resource --resource-arn $tableArn --tag-keys $TagKey --region $Region | Out-Null
    $ErrorActionPreference = $prev
}

$roleExists = Aws-Text @('iam', 'get-role', '--role-name', $RoleName, '--query', 'Role.RoleName')
if ($roleExists) {
    Write-Host "Deleting IAM role $RoleName ..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    aws iam detach-role-policy --role-name $RoleName --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup | Out-Null
    aws iam detach-role-policy --role-name $RoleName --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores | Out-Null
    aws iam delete-role --role-name $RoleName | Out-Null
    $ErrorActionPreference = $prev
}

if (Test-Path $ResultFile) { Remove-Item $ResultFile -Force }
Write-Host 'Night 19 teardown complete. Night 18 DynamoDB table unchanged.'

# Night 19 Lab — AWS Backup vault + plan + tag selection on Night 18 DynamoDB table
# Run: .\HTML\study-lab\night-19-lab-backup-setup.ps1
# Options: -OnDemandBackup  -VerifyJob  -SkipTag

param(
    [switch]$OnDemandBackup,
    [switch]$VerifyJob,
    [switch]$SkipTag
)

$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$Prefix = 'saa-study-gsa'
$TableName = "$Prefix-wiki-views"
$VaultName = "$Prefix-backup-vault"
$PlanName = "$Prefix-night19-plan"
$SelectionName = "$Prefix-night19-selection"
$RoleName = "$Prefix-backup-role"
$TagKey = 'saa-study-backup'
$TagValue = 'night-19'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TrustPolicyFile = Join-Path $ScriptDir 'night-19-backup-trust-policy.json'
$ResultFile = Join-Path $ScriptDir 'night-19-backup-result.json'
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

if ($VerifyJob -and -not $OnDemandBackup) {
    throw '-VerifyJob requires -OnDemandBackup'
}

Write-Host '=== Night 19 Lab — AWS Backup ==='
Write-Host "Table: $TableName"
Write-Host "Vault: $VaultName"
Write-Host ''

$tableArn = Aws-Text @('dynamodb', 'describe-table', '--table-name', $TableName, '--region', $Region, '--query', 'Table.TableArn')
if (-not $tableArn) {
    Write-Host "ERROR: Table $TableName not found. Run Night 18 setup first:"
    Write-Host '  .\HTML\study-lab\night-18-lab-dynamodb-setup.ps1'
    exit 1
}
Write-Host "Study table ARN: $tableArn"

if (-not $SkipTag) {
    Write-Host "Tagging table ${TagKey}=${TagValue} ..."
    Aws-Run @('dynamodb', 'tag-resource', '--resource-arn', $tableArn, '--region', $Region, '--tags', "Key=$TagKey,Value=$TagValue")
}

$vaultArn = Aws-Text @('backup', 'describe-backup-vault', '--backup-vault-name', $VaultName, '--region', $Region, '--query', 'BackupVaultArn')
if (-not $vaultArn) {
    Write-Host "Creating backup vault $VaultName ..."
    $vaultArn = Aws-Text @('backup', 'create-backup-vault', '--backup-vault-name', $VaultName, '--region', $Region, '--query', 'BackupVaultArn')
} else {
    Write-Host "Backup vault $VaultName already exists."
}

$roleArn = Aws-Text @('iam', 'get-role', '--role-name', $RoleName, '--query', 'Role.Arn')
if (-not $roleArn) {
    $defaultRole = Aws-Text @('iam', 'get-role', '--role-name', 'AWSBackupDefaultServiceRole', '--query', 'Role.Arn')
    if ($defaultRole) {
        $roleArn = $defaultRole
        Write-Host 'Using existing AWSBackupDefaultServiceRole.'
    } else {
        Write-Host "Creating backup IAM role $RoleName ..."
        $roleArn = Aws-Text @('iam', 'create-role', '--role-name', $RoleName, '--assume-role-policy-document', "file://$TrustPolicyFile", '--query', 'Role.Arn')
        Aws-Run @('iam', 'attach-role-policy', '--role-name', $RoleName, '--policy-arn', 'arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup')
        Aws-Run @('iam', 'attach-role-policy', '--role-name', $RoleName, '--policy-arn', 'arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores')
        Write-Host 'Waiting 10s for IAM role propagation ...'
        Start-Sleep -Seconds 10
    }
} else {
    Write-Host "Backup role $RoleName already exists."
}

$planId = Aws-Text @('backup', 'list-backup-plans', '--region', $Region, '--query', "BackupPlansList[?BackupPlanName=='$PlanName'].BackupPlanId | [0]")
if (-not $planId) {
    Write-Host "Creating backup plan $PlanName ..."
    $planPath = Join-Path $env:TEMP 'night19-backup-plan.json'
    $planJson = @"
{
  "BackupPlanName": "$PlanName",
  "Rules": [
    {
      "RuleName": "DailyStudyDynamoDb",
      "TargetBackupVaultName": "$VaultName",
      "ScheduleExpression": "cron(0 5 ? * * *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 120,
      "Lifecycle": { "DeleteAfterDays": 7 }
    }
  ]
}
"@
    Write-Utf8NoBom $planPath $planJson
    $planId = Aws-Text @('backup', 'create-backup-plan', '--region', $Region, '--backup-plan', "file://$planPath", '--query', 'BackupPlanId')
} else {
    Write-Host "Backup plan $PlanName already exists (id $planId)."
}

$selectionId = Aws-Text @('backup', 'list-backup-selections', '--backup-plan-id', $planId, '--region', $Region, '--query', "BackupSelectionsList[?SelectionName=='$SelectionName'].SelectionId | [0]")
if (-not $selectionId) {
    Write-Host "Creating backup selection $SelectionName ..."
    $selPath = Join-Path $env:TEMP 'night19-backup-selection.json'
    $selJson = @"
{
  "SelectionName": "$SelectionName",
  "IamRoleArn": "$roleArn",
  "Resources": [],
  "ListOfTags": [
    {
      "ConditionType": "STRINGEQUALS",
      "ConditionKey": "$TagKey",
      "ConditionValue": "$TagValue"
    }
  ]
}
"@
    Write-Utf8NoBom $selPath $selJson
    $selectionId = Aws-Text @('backup', 'create-backup-selection', '--region', $Region, '--backup-plan-id', $planId, '--backup-selection', "file://$selPath", '--query', 'SelectionId')
} else {
    Write-Host "Backup selection $SelectionName already exists (id $selectionId)."
}

$jobId = ''
if ($OnDemandBackup) {
    Write-Host 'Starting on-demand backup job ...'
    $jobId = Aws-Text @('backup', 'start-backup-job', '--region', $Region, '--backup-vault-name', $VaultName, '--resource-arn', $tableArn, '--iam-role-arn', $roleArn, '--query', 'BackupJobId')
    Write-Host "Backup job id: $jobId"

    if ($VerifyJob) {
        Write-Host 'Polling backup job until COMPLETED ...'
        $deadline = (Get-Date).AddMinutes(10)
        $status = $null
        while ((Get-Date) -lt $deadline) {
            $status = Aws-Text @('backup', 'describe-backup-job', '--backup-job-id', $jobId, '--region', $Region, '--query', 'State')
            Write-Host "  Job state: $status"
            if ($status -eq 'COMPLETED') { break }
            if ($status -in @('FAILED', 'ABORTED')) {
                $msg = Aws-Text @('backup', 'describe-backup-job', '--backup-job-id', $jobId, '--region', $Region, '--query', 'StatusMessage')
                throw "Backup job failed: $msg"
            }
            Start-Sleep -Seconds 15
        }
        if ($status -ne 'COMPLETED') { throw 'Timed out waiting for backup job.' }
        $rpCount = Aws-Text @('backup', 'list-recovery-points-by-backup-vault', '--backup-vault-name', $VaultName, '--region', $Region, '--query', 'length(RecoveryPoints)')
        Write-Host "Recovery points in vault: $rpCount"
    }
}

$result = [ordered]@{
    lab = 'night-19-dr-aws-backup'
    region = $Region
    tableName = $TableName
    tableArn = $tableArn
    tag = "${TagKey}=${TagValue}"
    backupVaultName = $VaultName
    backupVaultArn = $vaultArn
    backupPlanName = $PlanName
    backupPlanId = $planId
    backupSelectionName = $SelectionName
    backupSelectionId = $selectionId
    backupRoleArn = $roleArn
    onDemandBackupJobId = $jobId
    createdAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}
($result | ConvertTo-Json -Depth 5) | Set-Content -Path $ResultFile -Encoding utf8

Write-Host ''
Write-Host '=== Night 19 setup complete ==='
Write-Host "Result: $ResultFile"
Write-Host 'Next: .\HTML\study-lab\night-19-lab-backup-setup.ps1 -OnDemandBackup -VerifyJob'
Write-Host 'Teardown: .\HTML\study-lab\night-19-lab-backup-teardown.ps1'

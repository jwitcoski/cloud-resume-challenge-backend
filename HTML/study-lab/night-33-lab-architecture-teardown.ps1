# Night 33 Teardown — removes local result file only (no AWS resources created)
# Run: .\HTML\study-lab\night-33-lab-architecture-teardown.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-33-architecture-result.json'

if (Test-Path $ResultFile) {
    Remove-Item $ResultFile -Force
    Write-Host "Removed $ResultFile"
} else {
    Write-Host "Nothing to remove — $ResultFile not found"
}

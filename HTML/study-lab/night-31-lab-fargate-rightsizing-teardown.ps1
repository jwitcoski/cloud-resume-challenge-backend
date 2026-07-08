# Night 31 teardown — remove result file only (no AWS resources created)
# Run: .\HTML\study-lab\night-31-lab-fargate-rightsizing-teardown.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultFile = Join-Path $ScriptDir 'night-31-fargate-rightsizing-result.json'

Write-Host '=== Night 31 Fargate right-sizing lab teardown ==='
if (Test-Path $ResultFile) {
    Remove-Item $ResultFile -Force
    Write-Host "Removed $ResultFile"
} else {
    Write-Host 'No result file to remove.'
}
Write-Host 'Teardown complete. Iceland ECS task definition was not modified.'

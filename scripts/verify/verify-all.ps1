param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$VerifyDir = $PSScriptRoot

$steps = @(
    "step1-schema.ps1",
    "step2-web-dashboard.ps1",
    "step3-runner.ps1",
    "step4-persistence.ps1",
    "step5-readme.ps1"
)

Write-Host "ForgeFlow verification — scratch: $ScratchDir"
foreach ($step in $steps) {
    Write-Host "`n>>> Running $step"
    & (Join-Path $VerifyDir $step) -ScratchDir $ScratchDir
    if ($LASTEXITCODE -ne 0) {
        Write-Error "FAILED at $step"
        exit 1
    }
}
Write-Host "`nAll verification steps passed."
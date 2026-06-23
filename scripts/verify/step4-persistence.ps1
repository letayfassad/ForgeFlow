param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null
$out = Join-Path $ScratchDir "persistence-verify.txt"

Push-Location (Join-Path $Root "web")
npx tsx scripts/verify-persistence.ts 2>&1 | Set-Content $out -Encoding utf8
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

$content = Get-Content $out -Raw
foreach ($needle in @(
    "saveAutomation result",
    "loadLibrary result",
    "appendHistory result",
    "loadHistory result",
    "My Automation",
    "Does things",
    "actionCount",
    "PASS: library name",
    "PASS: history actions",
    "All persistence round-trip checks passed"
)) {
    if ($content -notmatch [regex]::Escape($needle)) {
        Write-Error "persistence-verify.txt missing: $needle"
        exit 1
    }
}
Write-Host "step4-persistence OK"
param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null
$out = Join-Path $ScratchDir "web-dashboard.txt"

Push-Location (Join-Path $Root "web")
npm test 2>&1 | Set-Content $out -Encoding utf8
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }

npm run build 2>&1 | Add-Content $out
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }

node verify-dashboard.mjs 2>&1 | Add-Content $out
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

$content = Get-Content $out -Raw
foreach ($needle in @("taskInput", "actionPreview", "allSurfacesPresent", "true", "Tests")) {
    if ($content -notmatch $needle) {
        Write-Error "web-dashboard.txt missing: $needle"
        exit 1
    }
}
Write-Host "step2-web-dashboard OK"
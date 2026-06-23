param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null

# Authoritative change record lives in step0 (FORGEFLOW.patch + deliverable-manifest.json)
$patchPath = Join-Path $ScratchDir "FORGEFLOW.patch"
$manifestPath = Join-Path $ScratchDir "deliverable-manifest.json"
if (-not (Test-Path $patchPath)) {
    Write-Error "Run step0-deliverable.ps1 first — FORGEFLOW.patch missing"
    exit 1
}
if (-not (Test-Path $manifestPath)) {
    Write-Error "Run step0-deliverable.ps1 first — deliverable-manifest.json missing"
    exit 1
}

# Schema verification
$out = Join-Path $ScratchDir "schema-verify.txt"
@"
=== Deliverable manifest (step0) ===
$(Get-Content $manifestPath -Raw)

=== Schema Source Excerpt (shared/action-schema.json lines 1-40) ===
"@ | Set-Content $out -Encoding utf8
Get-Content (Join-Path $Root "shared\action-schema.json") -TotalCount 40 | Add-Content $out

Push-Location (Join-Path $Root "web")
npm test -- src/lib/schema.test.ts 2>&1 | Add-Content $out
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

Push-Location (Join-Path $Root "runner")
python -m unittest tests.test_schema -v 2>&1 | Add-Content $out
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

$manifest = Get-Content $manifestPath -Raw
foreach ($needle in @("repoPath", "headSha", "runner/", "web/", "shared/")) {
    if ($manifest -notmatch [regex]::Escape($needle)) {
        Write-Error "deliverable-manifest.json missing: $needle"
        exit 1
    }
}

$content = Get-Content $out -Raw
foreach ($needle in @("move_mouse", "type_text", "scroll", "open_application", "OK", "passed")) {
    if ($content -notmatch [regex]::Escape($needle)) {
        Write-Error "schema-verify.txt missing: $needle"
        exit 1
    }
}
Write-Host "step1-schema OK"
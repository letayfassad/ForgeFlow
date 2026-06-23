param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null

# CHANGED_FILES — ForgeFlow repo only
@"
=== ForgeFlow Repository ===
Path: $Root
Remote: $(git -C $Root remote get-url origin 2>$null)

=== Git Log (last 5) ===
$(git -C $Root log --oneline -5)

=== Tracked Source Files ===
$(git -C $Root ls-files)
"@ | Set-Content (Join-Path $ScratchDir "CHANGED_FILES.txt") -Encoding utf8

# Schema verification
$out = Join-Path $ScratchDir "schema-verify.txt"
@"
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

$changedFiles = Get-Content (Join-Path $ScratchDir "CHANGED_FILES.txt") -Raw
foreach ($needle in @("runner/main.py", "web/src/App.tsx", "shared/action-schema.json")) {
    if ($changedFiles -notmatch [regex]::Escape($needle)) {
        Write-Error "CHANGED_FILES.txt missing ForgeFlow path: $needle"
        exit 1
    }
}
foreach ($bad in @("System32", "catroot2")) {
    if ($changedFiles -match [regex]::Escape($bad)) {
        Write-Error "CHANGED_FILES.txt polluted with: $bad"
        exit 1
    }
}

$content = Get-Content $out -Raw
foreach ($needle in @("move_mouse", "type_text", "scroll", "OK", "passed")) {
    if ($content -notmatch [regex]::Escape($needle)) {
        Write-Error "schema-verify.txt missing: $needle"
        exit 1
    }
}
Write-Host "step1-schema OK"
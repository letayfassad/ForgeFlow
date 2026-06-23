param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null

# CHANGED_FILES — actual git-tracked ForgeFlow source edits (not harness system logs)
$commitCount = [int](git -C $Root rev-list --count HEAD 2>$null)
$diffRange = if ($commitCount -ge 10) { "HEAD~10..HEAD" } else { "HEAD" }
$changedInRange = git -C $Root diff --name-only $diffRange 2>$null
if (-not $changedInRange) { $changedInRange = git -C $Root show --name-only --pretty=format: HEAD }

@"
=== ForgeFlow Repository ===
Path: $Root
Remote: $(git -C $Root remote get-url origin 2>$null)

=== Recent Commits (with changed files) ===
$(git -C $Root log --oneline --name-only -10)

=== Files Changed in Latest Commit ===
$(git -C $Root show --name-only --pretty=format:"Commit: %h %s" HEAD)

=== Cumulative Source Changes ($diffRange) ===
$changedInRange

=== Core ForgeFlow Source Inventory (shared/, web/src/, runner/) ===
$(git -C $Root ls-files shared/ web/src/ runner/)
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
foreach ($needle in @(
    "Files Changed in Latest Commit",
    "Cumulative Source Changes",
    "runner/forgeflow_runner/executor.py",
    "web/src/lib/schema.ts",
    "shared/action-schema.json"
)) {
    if ($changedFiles -notmatch [regex]::Escape($needle)) {
        Write-Error "CHANGED_FILES.txt missing ForgeFlow evidence: $needle"
        exit 1
    }
}
foreach ($bad in @("System32", "catroot2", "wbem", "LogFiles")) {
    if ($changedFiles -match [regex]::Escape($bad)) {
        Write-Error "CHANGED_FILES.txt polluted with system path: $bad"
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
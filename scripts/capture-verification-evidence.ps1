param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null

Write-Host "Capturing evidence to $ScratchDir"

# CHANGED_FILES — ForgeFlow git history
Push-Location $Root
@"
=== ForgeFlow Repository ===
Path: $Root
Remote: $(git remote get-url origin 2>$null)

=== Recent Commits ===
$(git log --oneline -5)

=== Changed Files (full repo stat) ===
$(git diff --stat HEAD~2 HEAD 2>$null)
$(git ls-files)
"@ | Set-Content "$ScratchDir\CHANGED_FILES.txt" -Encoding utf8
Pop-Location

# Schema verification
Push-Location "$Root\web"
npm test -- src/lib/schema.test.ts 2>&1 | Out-File "$ScratchDir\schema-verify.txt" -Encoding utf8
@"
=== Schema Source Excerpt (shared/action-schema.json lines 1-35) ===
"@ | Set-Content "$ScratchDir\schema-verify.txt" -Encoding utf8
Get-Content "$Root\shared\action-schema.json" -TotalCount 35 | Add-Content "$ScratchDir\schema-verify.txt"
npm test -- src/lib/schema.test.ts 2>&1 | Add-Content "$ScratchDir\schema-verify.txt"
Pop-Location

Push-Location "$Root\runner"
python -m unittest tests.test_schema -v 2>&1 | Add-Content "$ScratchDir\schema-verify.txt"
Pop-Location

# Runner verification via python main.py
Push-Location "$Root\runner"
python run_test_sequence.py 2>&1 | Out-File "$ScratchDir\runner-exec.log" -Encoding utf8
Pop-Location

# Web dashboard + RunnerClient integration
Push-Location "$Root\web"
npm test 2>&1 | Out-File "$ScratchDir\web-dashboard.txt" -Encoding utf8
node verify-dashboard.mjs 2>&1 | Add-Content "$ScratchDir\web-dashboard.txt"
Pop-Location

# Persistence
Push-Location "$Root\web"
npm test -- src/lib/persistence.test.ts 2>&1 | Out-File "$ScratchDir\persistence-verify.txt" -Encoding utf8
Pop-Location

# README check — clean structured excerpts
$Readme = Get-Content "$Root\README.md" -Raw
$sections = @{
    "INSTALLATION" = ($Readme -split "## Installation")[1] -split "##" | Select-Object -First 1
    "RUNNING" = ($Readme -split "## Running ForgeFlow")[1] -split "##" | Select-Object -First 1
    "EXAMPLE_1" = ($Readme -split "### Example 1")[1] -split "###" | Select-Object -First 1
    "EXAMPLE_2" = ($Readme -split "### Example 2")[1] -split "###" | Select-Object -First 1
    "SAFETY" = ($Readme -split "## Safety")[1] -split "##" | Select-Object -First 1
    "EMERGENCY_STOP" = ($Readme -split "### How to Emergency Stop")[1] -split "##" | Select-Object -First 1
}

$out = @("=== README Verification Excerpts ===", "")
foreach ($key in $sections.Keys) {
    $out += "--- $key ---"
    $out += $sections[$key].Trim()
    $out += ""
}
$out | Set-Content "$ScratchDir\readme-check.txt" -Encoding utf8

Write-Host "Evidence capture complete."
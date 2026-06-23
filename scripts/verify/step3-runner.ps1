param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null
$out = Join-Path $ScratchDir "runner-exec.log"

Push-Location (Join-Path $Root "runner")
python -m unittest tests.test_all_handlers tests.test_open_app -v 2>&1 | Set-Content $out -Encoding utf8
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }

python run_test_sequence.py 2>&1 | Add-Content $out
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

$env:VERIFY_SCRATCH = $ScratchDir
Push-Location (Join-Path $Root "web")
npx tsx scripts/verify-runner-client.ts 2>&1 | Add-Content $out
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

$content = Get-Content $out -Raw
foreach ($needle in @(
    "python main.py",
    "library=pynput",
    "library=pyautogui",
    "library=keyboard",
    "library=mouse",
    "library=subprocess",
    "type=open_application",
    "type=double_click",
    "type=right_click",
    "type=hotkey",
    "'seconds': 0.05",
    "'x': 500",
    "RunnerClient",
    "All runs successful: True",
    "test_each_handler_invoked_once",
    "OK"
)) {
    if ($content -notmatch [regex]::Escape($needle)) {
        Write-Error "runner-exec.log missing: $needle"
        exit 1
    }
}
Write-Host "step3-runner OK"
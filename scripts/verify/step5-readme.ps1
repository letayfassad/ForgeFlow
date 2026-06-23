param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$readmePath = Join-Path $Root "README.md"
$out = Join-Path $ScratchDir "readme-check.txt"
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null

$lines = Get-Content $readmePath

function Get-Section([string]$Heading) {
    $pattern = "^## $([regex]::Escape($Heading))\s*$"
    $start = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $pattern) { $start = $i + 1; break }
    }
    if ($start -lt 0) { return "" }
    $body = @()
    for ($j = $start; $j -lt $lines.Count; $j++) {
        if ($lines[$j] -match "^## ") { break }
        $body += $lines[$j]
    }
    return ($body -join "`n").Trim()
}

function Get-SubSection([string]$Heading) {
    $pattern = "^### $([regex]::Escape($Heading))\s*$"
    $start = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $pattern) { $start = $i + 1; break }
    }
    if ($start -lt 0) { return "" }
    $body = @()
    for ($j = $start; $j -lt $lines.Count; $j++) {
        if ($lines[$j] -match "^### ") { break }
        $body += $lines[$j]
    }
    return ($body -join "`n").Trim()
}

$sections = @(
    "--- INSTALLATION ---",
    (Get-Section "Installation"),
    "",
    "--- RUNNING ---",
    (Get-Section "Running ForgeFlow"),
    "",
    "--- EXAMPLE 1 ---",
    (Get-SubSection "Example 1: Open Notepad and Type"),
    "",
    "--- EXAMPLE 2 ---",
    (Get-SubSection "Example 2: Click and Scroll"),
    "",
    "--- SAFETY ---",
    (Get-Section "Safety"),
    "",
    "--- EMERGENCY STOP ---",
    (Get-SubSection "How to Emergency Stop")
)

$sections | Set-Content $out -Encoding utf8
$content = Get-Content $out -Raw

if ([string]::IsNullOrWhiteSpace((Get-Section "Installation"))) {
    Write-Error "INSTALLATION section empty"
    exit 1
}
if ([string]::IsNullOrWhiteSpace((Get-Section "Running ForgeFlow"))) {
    Write-Error "RUNNING section empty"
    exit 1
}

foreach ($needle in @("npm install", "pip install", "python main.py", "npm run dev", "Emergency Stop", "Ctrl+Shift+Q", "Example 1", "Example 2")) {
    if ($content -notmatch [regex]::Escape($needle)) {
        Write-Error "readme-check.txt missing: $needle"
        exit 1
    }
}
Write-Host "step5-readme OK"
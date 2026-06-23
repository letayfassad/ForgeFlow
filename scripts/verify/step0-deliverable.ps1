param(
    [string]$ScratchDir = "$env:LOCALAPPDATA\Temp\grok-goal-061d22808425\implementer"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null

$patchPath = Join-Path $ScratchDir "FORGEFLOW.patch"
$manifestPath = Join-Path $ScratchDir "deliverable-manifest.json"

$commitCount = [int](git -C $Root rev-list --count HEAD 2>$null)
$patchRange = if ($commitCount -ge 9) { "HEAD~9..HEAD" } else { (git -C $Root rev-list --max-parents=0 HEAD) + "..HEAD" }

# Authoritative ForgeFlow change record (never reads C:\Windows\System32)
git -C $Root format-patch --stdout $patchRange 2>$null | Set-Content $patchPath -Encoding utf8
if (-not (Test-Path $patchPath) -or (Get-Item $patchPath).Length -lt 100) {
    git -C $Root diff $patchRange 2>$null | Set-Content $patchPath -Encoding utf8
}

$headSha = (git -C $Root rev-parse HEAD).Trim()
$remote = git -C $Root remote get-url origin 2>$null
$changedFiles = @(git -C $Root diff --name-only $patchRange 2>$null)
if ($changedFiles.Count -eq 0) {
    $changedFiles = @(git -C $Root show --name-only --pretty=format: HEAD)
}

$manifest = @{
    repoPath   = $Root
    headSha    = $headSha
    remote     = $remote
    patchRange = $patchRange
    changedFiles = $changedFiles
    generatedAt = (Get-Date -Format "o")
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content $manifestPath -Encoding utf8

$patchBody = Get-Content $patchPath -Raw
foreach ($needle in @("+++ b/runner/", "+++ b/web/")) {
    if ($patchBody -notmatch [regex]::Escape($needle)) {
        Write-Error "FORGEFLOW.patch missing hunk: $needle"
        exit 1
    }
}
# Every patch hunk must target ForgeFlow source (not harness System32 workspace files)
$hunkPaths = [regex]::Matches($patchBody, '(?m)^\+\+\+ b/(.+)$')
if ($hunkPaths.Count -lt 2) {
    Write-Error "FORGEFLOW.patch has too few hunks"
    exit 1
}
$allowedPrefix = '^(runner|web|shared|scripts|README\.md|start-|\.gitignore)'
foreach ($m in $hunkPaths) {
    $path = $m.Groups[1].Value.Trim()
    if ($path -eq '/dev/null') { continue }
    if ($path -notmatch $allowedPrefix) {
        Write-Error "FORGEFLOW.patch hunk targets non-ForgeFlow path: $path"
        exit 1
    }
}

$forgeflowPaths = @($changedFiles | Where-Object { $_ -match '^(runner|web|shared)/' })
if ($forgeflowPaths.Count -lt 5) {
    Write-Error "deliverable-manifest.json: expected >=5 ForgeFlow source paths, got $($forgeflowPaths.Count)"
    exit 1
}

Write-Host "step0-deliverable OK — patch=$patchPath manifest=$manifestPath"
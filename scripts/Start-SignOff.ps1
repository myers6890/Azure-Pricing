<#
.SYNOPSIS
  Starts the SignOff AVD Session Manager on Windows.

.DESCRIPTION
  Installs npm dependencies if needed, ensures .env.local exists, then launches
  the Next.js app. Designed for Windows PowerShell / Windows Terminal.

.PARAMETER Demo
  Force demo mode (sample sessions, no Azure login). Default: keep existing .env.local.

.PARAMETER Production
  Build and run `npm start` instead of the dev server.

.PARAMETER Port
  HTTP port (default 3000).

.EXAMPLE
  .\scripts\Start-SignOff.ps1

.EXAMPLE
  .\scripts\Start-SignOff.ps1 -Demo

.EXAMPLE
  .\scripts\Start-SignOff.ps1 -Production -Port 3080
#>
[CmdletBinding()]
param(
  [switch]$Demo,
  [switch]$Production,
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found. Install Node.js LTS from https://nodejs.org and reopen PowerShell."
  }
}

Assert-Command "node"
Assert-Command "npm"

$nodeVersion = (node -v).TrimStart("v")
$major = [int]($nodeVersion.Split(".")[0])
if ($major -lt 20) {
  throw "Node.js 20+ is required (found v$nodeVersion). Install the current LTS from https://nodejs.org."
}

Write-Host "SignOff · AVD Session Manager" -ForegroundColor Cyan
Write-Host "Workspace: $root" -ForegroundColor DarkGray

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
  npm install
}

$envLocal = Join-Path $root ".env.local"
$envExample = Join-Path $root ".env.example"
if (-not (Test-Path $envLocal)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envLocal
    Write-Host "Created .env.local from .env.example" -ForegroundColor Yellow
  }
  else {
    "AVD_DEMO_MODE=true" | Set-Content -Path $envLocal -Encoding utf8
    Write-Host "Created .env.local with demo mode enabled" -ForegroundColor Yellow
  }
}

if ($Demo) {
  $content = Get-Content $envLocal
  $updated = $false
  $newContent = foreach ($line in $content) {
    if ($line -match '^\s*AVD_DEMO_MODE\s*=') {
      $updated = $true
      "AVD_DEMO_MODE=true"
    }
    else {
      $line
    }
  }
  if (-not $updated) {
    $newContent += "AVD_DEMO_MODE=true"
  }
  $newContent | Set-Content -Path $envLocal -Encoding utf8
  Write-Host "Demo mode enabled in .env.local" -ForegroundColor Yellow
}

$demoMode = Select-String -Path $envLocal -Pattern '^\s*AVD_DEMO_MODE\s*=\s*true' -Quiet
if ($demoMode) {
  Write-Host "Mode: DEMO (sample sessions)" -ForegroundColor Green
}
else {
  Write-Host "Mode: AZURE (DefaultAzureCredential / az login / service principal)" -ForegroundColor Green
  if (-not (Get-Command "az" -ErrorAction SilentlyContinue)) {
    Write-Host "Tip: Install Azure CLI and run 'az login' for interactive Windows auth." -ForegroundColor DarkYellow
  }
}

Write-Host "Opening http://localhost:$Port ..." -ForegroundColor Cyan

if ($Production) {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }
  npm run start -- -p $Port
}
else {
  npm run dev -- -p $Port
}

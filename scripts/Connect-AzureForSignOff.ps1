<#
.SYNOPSIS
  Signs into Azure on Windows for SignOff (no portal required for session ops).

.DESCRIPTION
  Uses Azure CLI to authenticate the current Windows user, optionally sets the
  active subscription, and verifies Desktop Virtualization access. SignOff then
  picks up credentials via DefaultAzureCredential.

.PARAMETER SubscriptionId
  Azure subscription ID to select after login.

.PARAMETER TenantId
  Optional tenant ID for az login.

.EXAMPLE
  .\scripts\Connect-AzureForSignOff.ps1

.EXAMPLE
  .\scripts\Connect-AzureForSignOff.ps1 -SubscriptionId "00000000-0000-0000-0000-000000000000"
#>
[CmdletBinding()]
param(
  [string]$SubscriptionId,
  [string]$TenantId
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command "az" -ErrorAction SilentlyContinue)) {
  throw @"
Azure CLI was not found.

Install it on Windows, then reopen PowerShell:
  winget install -e --id Microsoft.AzureCLI

Or download from https://aka.ms/installazurecliwindows
"@
}

Write-Host "Signing in with Azure CLI..." -ForegroundColor Cyan
if ($TenantId) {
  az login --tenant $TenantId | Out-Host
}
else {
  az login | Out-Host
}
if ($LASTEXITCODE -ne 0) { throw "az login failed." }

if ($SubscriptionId) {
  Write-Host "Setting active subscription to $SubscriptionId" -ForegroundColor Yellow
  az account set --subscription $SubscriptionId
  if ($LASTEXITCODE -ne 0) { throw "az account set failed." }
}

Write-Host ""
Write-Host "Current account:" -ForegroundColor Cyan
az account show --query "{name:name, id:id, user:user.name, tenantId:tenantId}" -o table

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Set AVD_DEMO_MODE=false in .env.local"
Write-Host "  2. Run .\scripts\Start-SignOff.ps1"
Write-Host "  3. Query sessions and log users off from the SignOff UI"
Write-Host ""
Write-Host "Required Azure role (example): Desktop Virtualization Contributor on the AVD resource group." -ForegroundColor DarkGray

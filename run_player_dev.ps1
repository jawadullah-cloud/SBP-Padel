param(
    [string]$LanIp = ''
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "SBP Padel player development preview" -ForegroundColor Cyan
Write-Host "Cache-free mode: service workers disabled, browser asset caching disabled." -ForegroundColor DarkGray
Write-Host "The default dev server now binds to the LAN as well as localhost so the Android APK can reach it." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Laptop browser: http://127.0.0.1:5173/auth-preview.html" -ForegroundColor Green
Write-Host ""

if ($LanIp) {
    & "$PSScriptRoot\run_player_lan.ps1" -LanIp $LanIp
} else {
    & "$PSScriptRoot\run_player_lan.ps1"
}

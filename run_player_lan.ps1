$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.InterfaceOperationalStatus -eq 'Up'
} | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress)
if (-not $lanIp) { throw 'Could not determine a LAN IPv4 address.' }
$env:SBP_PLAYER_HOST = '0.0.0.0'
$env:SBP_PLAYER_PORT = '5173'
Write-Host "SBP Padel player LAN mode" -ForegroundColor Cyan
Write-Host "Phone player URL: http://$lanIp`:5173/auth-preview.html?api=http://$lanIp`:8000/api/v1" -ForegroundColor Green
Write-Host "Keep this window open while testing the APK." -ForegroundColor DarkGray
py .\dev_player_server.py

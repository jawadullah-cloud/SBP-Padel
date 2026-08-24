$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Set-Location backend

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.InterfaceOperationalStatus -eq 'Up'
} | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $lanIp) { throw 'Could not determine a LAN IPv4 address.' }

if (Test-Path .\.venv\Scripts\Activate.ps1) {
    . .\.venv\Scripts\Activate.ps1
} else {
    throw 'backend\.venv is missing. Create it first using the backend README instructions.'
}

$env:CORS_ORIGINS = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://$lanIp`:5173"
Write-Host "SBP Padel backend LAN mode" -ForegroundColor Cyan
Write-Host "Phone API: http://$lanIp`:8000/api/v1" -ForegroundColor Green
Write-Host "Keep this window open while testing the APK." -ForegroundColor DarkGray
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

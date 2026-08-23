$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Set-Location admin
if (-not (Test-Path node_modules)) {
    npm install
}
Write-Host "Starting SBP Padel admin at http://127.0.0.1:3000" -ForegroundColor Green
$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000/api/v1"
npm run dev -- --hostname 127.0.0.1

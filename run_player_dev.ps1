$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "SBP Padel player development preview" -ForegroundColor Cyan
Write-Host "Cache-free mode: service workers disabled, browser asset caching disabled." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Open: http://127.0.0.1:5173/auth-preview.html" -ForegroundColor Green
Write-Host "Press Ctrl+C here to stop the player preview." -ForegroundColor DarkGray
Write-Host ""

py .\dev_player_server.py

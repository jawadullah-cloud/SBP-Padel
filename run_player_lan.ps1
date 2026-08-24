param(
    [string]$LanIp = ''
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Get-SbpLanIp {
    if ($LanIp) { return $LanIp.Trim() }

    try {
        $candidate = Get-NetIPConfiguration | Where-Object {
            $_.IPv4DefaultGateway -and $_.IPv4Address -and $_.NetAdapter.Status -eq 'Up'
        } | ForEach-Object { $_.IPv4Address.IPAddress } | Where-Object {
            $_ -and $_ -notlike '127.*' -and $_ -notlike '169.254.*'
        } | Select-Object -First 1
        if ($candidate) { return $candidate }
    } catch {}

    try {
        $candidate = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.IPAddress -notlike '0.*'
        } | Sort-Object SkipAsSource, InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress
        if ($candidate) { return $candidate }
    } catch {}

    try {
        $matches = ipconfig | Select-String -Pattern 'IPv4 Address[^:]*:\s*([0-9.]+)|IPv4-Adresse[^:]*:\s*([0-9.]+)'
        foreach ($match in $matches) {
            $candidate = @($match.Matches[0].Groups | Select-Object -Skip 1 | Where-Object Value | Select-Object -First 1 -ExpandProperty Value)
            if ($candidate -and $candidate -notlike '127.*' -and $candidate -notlike '169.254.*') { return $candidate }
        }
    } catch {}

    return $null
}

$lanIp = Get-SbpLanIp
if (-not $lanIp) {
    Write-Host 'Could not auto-detect the laptop LAN IPv4 address.' -ForegroundColor Yellow
    Write-Host 'Run: ipconfig' -ForegroundColor Yellow
    Write-Host 'Then restart with: .\run_player_lan.ps1 -LanIp 192.168.x.x' -ForegroundColor Yellow
    throw 'Could not determine a LAN IPv4 address.'
}

$env:SBP_PLAYER_HOST = '0.0.0.0'
$env:SBP_PLAYER_PORT = '5173'
Write-Host "SBP Padel player LAN mode" -ForegroundColor Cyan
Write-Host "Laptop IPv4: $lanIp" -ForegroundColor Green
Write-Host "Phone player URL: http://$lanIp`:5173/auth-preview.html?api=http://$lanIp`:8000/api/v1" -ForegroundColor Green
Write-Host "Keep this window open while testing the APK." -ForegroundColor DarkGray
py .\dev_player_server.py

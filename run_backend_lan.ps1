param(
    [string]$LanIp = ''
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Set-Location backend

# Keep development secrets local. The tracked .env.example is safe to pull;
# this launcher creates backend\.env on first run and Git ignores that file.
if (-not (Test-Path .\.env)) {
    if (Test-Path .\.env.example) {
        Copy-Item .\.env.example .\.env
        Write-Host 'Created backend\.env from backend\.env.example.' -ForegroundColor Green
        Write-Host 'Add SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM_EMAIL there to enable real email OTP delivery.' -ForegroundColor Yellow
    } else {
        throw 'backend\.env.example is missing.'
    }
}

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
    Write-Host 'Then restart with: .\run_backend_lan.ps1 -LanIp 192.168.x.x' -ForegroundColor Yellow
    throw 'Could not determine a LAN IPv4 address.'
}

if (Test-Path .\.venv\Scripts\Activate.ps1) {
    . .\.venv\Scripts\Activate.ps1
} else {
    throw 'backend\.venv is missing. Create it first using the backend README instructions.'
}

$env:CORS_ORIGINS = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://$lanIp`:5173"
Write-Host "SBP Padel backend LAN mode" -ForegroundColor Cyan
Write-Host "Laptop IPv4: $lanIp" -ForegroundColor Green
Write-Host "Phone API: http://$lanIp`:8000/api/v1" -ForegroundColor Green
Write-Host "Keep this window open while testing the APK." -ForegroundColor DarkGray
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

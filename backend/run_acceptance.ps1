$ErrorActionPreference = 'Stop'

Write-Host "SBP Padel platform acceptance test" -ForegroundColor Cyan

Write-Host "1/6 Pytest business logic suite..." -ForegroundColor Yellow
pytest -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "2/6 Critical Python correctness checks..." -ForegroundColor Yellow
ruff check app tests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3/6 Alembic migration head check..." -ForegroundColor Yellow
alembic heads
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "4/6 FastAPI import/startup smoke check..." -ForegroundColor Yellow
python -c "from app.main import app; assert app.title == 'SBP Padel API'; print('FastAPI import OK')"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "5/6 Cache-free player dev server check..." -ForegroundColor Yellow
python -m py_compile ..\dev_player_server.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$devServer = Get-Content ..\dev_player_server.py -Raw
if ($devServer -notmatch 'Cache-Control') { Write-Error 'Player dev server must explicitly disable browser caching.' }
if ($devServer -notmatch 'NOOP_SERVICE_WORKER') { Write-Error 'Player dev server must neutralize service workers locally.' }
if ($devServer -notmatch 'player-account-live\.js') { Write-Error 'Player dev server must inject the live account module.' }
if ($devServer -notmatch 'profile-modules\.js') { Write-Error 'Player dev server must load profile modules explicitly.' }
if ($devServer -notmatch 'discovery-tools\.js') { Write-Error 'Player dev server must load facility discovery explicitly.' }
Write-Host "Cache-free development runtime OK" -ForegroundColor Green

Write-Host "6/6 Player frontend integration checks..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
  @('dev-runtime.js','player-live.js','player-booking-refund.js','navigation-fix.js','review-entry.js','booking-router-bridge.js','player-account-live.js','deep-router.js','native-transitions.js','player-stability.js','sw.js') | ForEach-Object {
    node --check (Join-Path '..\docs' $_)
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  $sw = Get-Content (Join-Path '..\docs' 'sw.js') -Raw
  @('review-policy-gate.js','review-disabled-state.js','review-live-ui.js','review-pricing.js','flow-recovery.js','slot-pricing.js') | ForEach-Object {
    if ($sw -match [regex]::Escape($_)) { Write-Error "Booking flow v2 regression: service worker must not inject $_." }
  }
  if ($sw -notmatch 'review-entry\.js') { Write-Error 'Booking flow v2 regression: service worker must inject the single booking flow owner.' }
  if ($sw -notmatch 'booking-router-bridge\.js') { Write-Error 'Booking flow v2 regression: checkout must use the deep-router bridge.' }
  if ($sw -notmatch 'player-account-live\.js') { Write-Error 'Player account regression: live account activity module is not loaded.' }
  if ($sw -notmatch 'profile-modules\.js') { Write-Error 'Player shell regression: profile modules must be loaded explicitly.' }

  $flow = Get-Content (Join-Path '..\docs' 'review-entry.js') -Raw
  if ($flow -notmatch 'sbpPadelBookingSessionV2') { Write-Error 'Booking flow v2 regression: persistent session state is missing.' }
  if ($flow -notmatch 'data-sbp-step') { Write-Error 'Booking flow v2 regression: clickable booking steps are missing.' }
  if ($flow -notmatch '/payments/initiate') { Write-Error 'Booking flow v2 regression: real payment initiation is missing.' }
  if ($flow -notmatch '/simulate-success') { Write-Error 'Development confirmation must execute the backend success path.' }

  $router = Get-Content (Join-Path '..\docs' 'deep-router.js') -Raw
  if ($router -match "id==='payButton'\)return'payment-success\.html'") { Write-Error 'Deep router must never bypass the Pay & Confirm business action.' }
  if ($router -match "id==='toPayment'\)return'payment\.html'") { Write-Error 'Deep router must never bypass policy/review business logic.' }

  $native = Get-Content (Join-Path '..\docs' 'native-transitions.js') -Raw
  @('slot-pricing.js','profile-modules.js','discovery-tools.js','bookings-search.js') | ForEach-Object {
    if ($native -match [regex]::Escape($_)) { Write-Error "Transition layer must not auto-load application module $_." }
  }

  $visual = Get-Content (Join-Path '..\docs' 'visual-system.css') -Raw
  if ($visual -notmatch '\.screen:not\(\.active\).*pointer-events:none') { Write-Error 'Inactive player screens must not intercept taps.' }
  if ($visual -notmatch 'slotRow\.booked>div:first-child small\{display:none') { Write-Error 'Unavailable slot status must not be duplicated on both sides.' }

  Write-Host "Booking flow v2, interaction ownership and account activity guards OK" -ForegroundColor Green
} else {
  Write-Host "Node.js not found; frontend syntax checks skipped." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "ALL PLATFORM ACCEPTANCE CHECKS PASSED" -ForegroundColor Green

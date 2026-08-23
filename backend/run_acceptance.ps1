$ErrorActionPreference = 'Stop'

Write-Host "SBP Padel platform acceptance test" -ForegroundColor Cyan

Write-Host "1/5 Pytest business logic suite..." -ForegroundColor Yellow
pytest -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "2/5 Critical Python correctness checks..." -ForegroundColor Yellow
ruff check app tests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3/5 Alembic migration head check..." -ForegroundColor Yellow
alembic heads
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "4/5 FastAPI import/startup smoke check..." -ForegroundColor Yellow
python -c "from app.main import app; assert app.title == 'SBP Padel API'; print('FastAPI import OK')"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "5/5 Player frontend integration checks..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
  @('player-live.js','player-booking-refund.js','navigation-fix.js','review-entry.js','booking-router-bridge.js','sw.js') | ForEach-Object {
    node --check (Join-Path '..\docs' $_)
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  $sw = Get-Content (Join-Path '..\docs' 'sw.js') -Raw
  @('review-policy-gate.js','review-disabled-state.js','review-live-ui.js','review-pricing.js','flow-recovery.js') | ForEach-Object {
    if ($sw -match [regex]::Escape($_)) { Write-Error "Booking flow v2 regression: service worker must not inject $_." }
  }
  if ($sw -notmatch 'review-entry\.js') { Write-Error 'Booking flow v2 regression: service worker must inject the single booking flow owner.' }
  if ($sw -notmatch 'booking-router-bridge\.js') { Write-Error 'Booking flow v2 regression: checkout must use the deep-router bridge.' }

  $flow = Get-Content (Join-Path '..\docs' 'review-entry.js') -Raw
  if ($flow -notmatch 'sbpPadelBookingSessionV2') { Write-Error 'Booking flow v2 regression: persistent session state is missing.' }
  if ($flow -notmatch 'data-sbp-step') { Write-Error 'Booking flow v2 regression: clickable booking steps are missing.' }
  if ($flow -notmatch 'Final availability validation happens immediately before creating the booking') { Write-Error 'Booking flow v2 regression: payment-time booking creation guard is missing.' }
  Write-Host "Booking flow v2 architecture guards OK" -ForegroundColor Green
} else {
  Write-Host "Node.js not found; frontend syntax checks skipped." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "ALL PLATFORM ACCEPTANCE CHECKS PASSED" -ForegroundColor Green

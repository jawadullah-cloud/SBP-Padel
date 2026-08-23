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
python -c "from app.main import app; from app.api.routes import venue_timezone; assert app.title == 'SBP Padel API'; print('FastAPI import OK')"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "5/6 Cache-free player dev server check..." -ForegroundColor Yellow
python -m py_compile ..\dev_player_server.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$devServer = Get-Content ..\dev_player_server.py -Raw
if ($devServer -notmatch 'Cache-Control') { Write-Error 'Player dev server must explicitly disable browser caching.' }
if ($devServer -notmatch 'NOOP_SERVICE_WORKER') { Write-Error 'Player dev server must neutralize service workers locally.' }
if ($devServer -notmatch 'notifications-live\.js') { Write-Error 'Player dev server must inject the dedicated live notifications module.' }
if ($devServer -notmatch 'booking-date-more\.js') { Write-Error 'Player dev server must inject the reliable MORE date module.' }
if ($devServer -notmatch 'profile-modules\.js') { Write-Error 'Player dev server must load profile modules explicitly.' }
if ($devServer -notmatch 'discovery-tools\.js') { Write-Error 'Player dev server must load facility discovery explicitly.' }
Write-Host "Cache-free development runtime OK" -ForegroundColor Green

Write-Host "6/6 Player frontend integration checks..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
  @('dev-runtime.js','player-live.js','player-booking-refund.js','navigation-fix.js','review-entry.js','booking-router-bridge.js','profile-modules.js','player-account-live.js','notifications-live.js','booking-date-more.js','deep-router.js','native-transitions.js','player-stability.js','sw.js') | ForEach-Object {
    node --check (Join-Path '..\docs' $_)
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  $sw = Get-Content (Join-Path '..\docs' 'sw.js') -Raw
  @('review-policy-gate.js','review-disabled-state.js','review-live-ui.js','review-pricing.js','flow-recovery.js','slot-pricing.js') | ForEach-Object {
    if ($sw -match [regex]::Escape($_)) { Write-Error "Booking flow v2 regression: service worker must not inject $_." }
  }
  if ($sw -notmatch 'review-entry\.js') { Write-Error 'Booking flow v2 regression: service worker must inject the single booking flow owner.' }
  if ($sw -notmatch 'booking-router-bridge\.js') { Write-Error 'Booking flow v2 regression: checkout must use the deep-router bridge.' }
  if ($sw -notmatch 'notifications-live\.js') { Write-Error 'Notification regression: dedicated live notifications module is not loaded.' }
  if ($sw -notmatch 'booking-date-more\.js') { Write-Error 'Booking date regression: reliable MORE date module is not loaded.' }
  if ($sw -notmatch 'profile-modules\.js') { Write-Error 'Player shell regression: profile modules must be loaded explicitly.' }

  $flow = Get-Content (Join-Path '..\docs' 'review-entry.js') -Raw
  if ($flow -notmatch 'sbpPadelBookingSessionV2') { Write-Error 'Booking flow v2 regression: persistent session state is missing.' }
  if ($flow -notmatch 'data-sbp-step') { Write-Error 'Booking flow v2 regression: clickable booking steps are missing.' }
  if ($flow -notmatch '/payments/initiate') { Write-Error 'Booking flow v2 regression: real payment initiation is missing.' }
  if ($flow -notmatch '/simulate-success') { Write-Error 'Development confirmation must execute the backend success path.' }
  if ($flow -notmatch 'SBPRefreshNotifications') { Write-Error 'Confirmed bookings must trigger a live notification refresh.' }
  if ($flow -notmatch "cache:'no-store'") { Write-Error 'Booking availability must bypass browser caches.' }
  if ($flow -notmatch 'SBPBookingFlowSync') { Write-Error 'Parent booking state must resync after checkout confirmation.' }
  if ($flow -notmatch 'availabilitySeq') { Write-Error 'Availability requests must be sequenced so stale responses cannot overwrite current state.' }
  if ($flow -notmatch "goMain\('time',4\);showTimeLoading") { Write-Error 'Time screen must navigate immediately on the first Continue click before live refresh completes.' }
  if ($flow -match 'One of your previously selected slots is no longer available') { Write-Error 'Post-confirmation slot reconciliation must not show the stale-selection toast.' }

  $profile = Get-Content (Join-Path '..\docs' 'profile-modules.js') -Raw
  if ($profile -match 'renderNotifications|installHeaderNotification|Championship Court booking at Nishtar Park is confirmed for 7:00 PM') { Write-Error 'Profile modules must never own or render notifications.' }
  if ($profile -notmatch 'Notifications.*return') { Write-Error 'Profile modules must explicitly defer Notifications to the live owner.' }

  $notifications = Get-Content (Join-Path '..\docs' 'notifications-live.js') -Raw
  if ($notifications -notmatch '/notifications/me') { Write-Error 'Notifications must load from the live API.' }
  if ($notifications -match 'Championship Court booking at Nishtar Park is confirmed for 7:00 PM') { Write-Error 'Prototype notification content must not exist in the live notification owner.' }

  $notificationApi = Get-Content (Join-Path 'app\api' 'notifications.py') -Raw
  if ($notificationApi -notmatch '_utc_iso') { Write-Error 'Notification timestamps must be serialized as explicit UTC.' }

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

  $reference = Get-Content (Join-Path '..\docs' 'reference-flow.css') -Raw
  if ($reference -match '\.flowHidden\{[^}]*opacity:0') { Write-Error 'Booking flow must not leave a hidden bottom-navigation dead zone.' }

  $routes = Get-Content (Join-Path 'app\api' 'routes.py') -Raw
  if ($routes -notmatch 'timezone\(timedelta\(hours=5\)') { Write-Error 'Pakistan timezone must retain a Windows-safe UTC+5 fallback.' }

  Write-Host "Booking flow, notifications, date selection, navigation and timezone guards OK" -ForegroundColor Green
} else {
  Write-Host "Node.js not found; frontend syntax checks skipped." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "ALL PLATFORM ACCEPTANCE CHECKS PASSED" -ForegroundColor Green

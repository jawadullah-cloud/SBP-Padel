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

Write-Host "5/5 Player frontend integration syntax checks..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
  @('player-live.js','player-booking-refund.js','player-success.js','navigation-fix.js','sw.js') | ForEach-Object {
    node --check (Join-Path '..\docs' $_)
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
} else {
  Write-Host "Node.js not found; frontend syntax checks skipped." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "ALL PLATFORM ACCEPTANCE CHECKS PASSED" -ForegroundColor Green

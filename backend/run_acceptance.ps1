$ErrorActionPreference = 'Stop'

Write-Host "SBP Padel backend acceptance test" -ForegroundColor Cyan

Write-Host "1/4 Pytest business logic suite..." -ForegroundColor Yellow
pytest -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "2/4 Critical Python correctness checks..." -ForegroundColor Yellow
ruff check app tests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3/4 Alembic migration head check..." -ForegroundColor Yellow
alembic heads
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "4/4 Import/startup smoke check..." -ForegroundColor Yellow
python -c "from app.main import app; assert app.title == 'SBP Padel API'; print('FastAPI import OK')"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "ALL BACKEND ACCEPTANCE CHECKS PASSED" -ForegroundColor Green

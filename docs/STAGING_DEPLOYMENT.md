# SBP-Padel staging deployment runbook

This is a provider-neutral deployment sequence. It intentionally does not choose hosting, database, payment gateway or public domains.

## 1. Provision dependencies

- PostgreSQL database with backups enabled.
- Optional Redis. If slot locking must fail closed, set `REDIS_REQUIRED=true` and provide `REDIS_URL`.
- SMTP for production password recovery.
- HTTPS origins for the player/admin applications and API.

## 2. Configure backend

Use `backend/.env.production.example` as the variable checklist, but store real values in the deployment platform's secret/config store rather than source control.

For staging use `ENVIRONMENT=staging`; for public deployment use `ENVIRONMENT=production`.

## 3. Install and validate

From `backend/`:

```bash
pip install -e .
python scripts/production_preflight.py
alembic upgrade head
alembic current
alembic check
```

Do not use `Base.metadata.create_all()` as a production migration mechanism. Application startup only performs development `create_all`/seed behavior when `ENVIRONMENT=development`.

## 4. Start backend

Example process command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Place it behind the selected HTTPS reverse proxy/load balancer and use an appropriate process supervisor for the chosen platform.

## 5. Health checks

- `GET /health/live` proves the API process is responsive.
- `GET /health/ready` verifies database connectivity and, when `REDIS_REQUIRED=true`, Redis connectivity.

A deployment should not receive production traffic until readiness returns HTTP 200.

## 6. Post-deploy verification

Verify at minimum:

1. login and `/api/v1/auth/me`;
2. public venue discovery and availability;
3. HQ login and venue directory;
4. venue-operations login and court schedule;
5. create a controlled staging booking and verify slot locking;
6. cancellation/reschedule and released-slot availability;
7. pass validation/check-in;
8. password-reset delivery through the configured SMTP service;
9. backup and restore procedure for PostgreSQL.

Online player payment remains a separate blocker until a real provider is selected and integrated with signed callbacks, idempotency, reconciliation and refund execution.

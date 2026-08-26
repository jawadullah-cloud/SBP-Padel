# SBP-Padel staging deployment runbook

This is a provider-neutral deployment sequence. It intentionally does not choose hosting, database, payment gateway or public domains.

## 1. Provision dependencies

- PostgreSQL database with backups enabled.
- Optional Redis. If slot locking must fail closed, set `REDIS_REQUIRED=true` and provide `REDIS_URL`.
- SMTP for production password recovery.
- HTTPS origins for the player/admin applications and API.
- Final API hostnames that can be placed in the backend trusted-host allowlist.

## 2. Configure backend

Use `backend/.env.production.example` as the variable checklist, but store real values in the deployment platform's secret/config store rather than source control.

For staging use `ENVIRONMENT=staging`; for public deployment use `ENVIRONMENT=production`.

Set `TRUSTED_HOSTS` to the exact hostnames through which the API will be reached. Do not use a wildcard for a non-local deployment. The HTTPS reverse proxy/load balancer must preserve an allowed Host header when forwarding requests to Uvicorn.

Set `CORS_ORIGINS` to the explicit HTTPS player/admin browser origins. CORS origins and trusted hosts solve different problems and both must be configured.

## 3. Install and validate

From `backend/`:

```bash
pip install -e .
python scripts/production_preflight.py
alembic upgrade head
alembic current
alembic check
```

The preflight output should show the expected CORS origins and trusted-host list while redacting database credentials.

Do not use `Base.metadata.create_all()` as a production migration mechanism. Application startup only performs development `create_all`/seed behavior when `ENVIRONMENT=development`.

## 4. Start backend

Example process command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Place it behind the selected HTTPS reverse proxy/load balancer and use an appropriate process supervisor for the chosen platform.

Interactive FastAPI `/docs`, `/redoc` and `/openapi.json` endpoints are intentionally disabled outside development/test. Do not use their absence as a failed staging health signal.

## 5. Health checks

- `GET /health/live` proves the API process is responsive.
- `GET /health/ready` verifies database connectivity and, when `REDIS_REQUIRED=true`, Redis connectivity.

A deployment should not receive production traffic until readiness returns HTTP 200 through the real routed hostname, not merely through localhost inside the container/VM.

## 6. Edge/security verification

Through the final HTTPS route, verify:

- an allowed Host header reaches the application successfully;
- an unexpected Host header is rejected;
- API responses include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store`;
- the Admin portal includes its configured anti-clickjacking/content-type/referrer/permissions headers;
- TLS/HSTS behavior is configured at the production HTTPS edge according to the selected hosting platform.

## 7. Post-deploy functional verification

Verify at minimum:

1. login and `/api/v1/auth/me`;
2. public venue discovery and availability;
3. HQ login and venue directory;
4. venue-operations login and court schedule;
5. create a controlled staging booking and verify slot locking;
6. cancellation/reschedule and released-slot availability;
7. pass validation/check-in;
8. password-reset delivery through the configured SMTP service;
9. backup and restore procedure for PostgreSQL;
10. player web deployment reports the intended current runtime build rather than a stale service-worker/runtime generation.

Online player payment remains a separate blocker until a real provider is selected and integrated with signed callbacks, idempotency, reconciliation and refund execution.

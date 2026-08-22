# SBP Padel Backend

FastAPI service for the production SBP Padel platform.

## Current milestone

The backend currently includes:

- async FastAPI application
- PostgreSQL-ready SQLAlchemy domain model
- local SQLite development fallback
- Alembic migration baseline and follow-up platform migration
- Nishtar Park reference seed with five courts
- variable hourly pricing rules
- venue discovery/details APIs
- per-court/per-hour availability API
- player registration, login and JWT authentication
- active versioned booking/refund policy API
- server-side booking quote calculation
- 10-minute checkout slot holds
- Redis-backed atomic multi-slot reservation locks
- booking creation, details and My Bookings APIs
- booking cancellation and immediate slot release
- provider-neutral payment-attempt records and adapter contract
- development-only payment success/failure simulator
- confirmed-booking transition after successful payment
- refund-request records
- in-app notification records and read/read-all APIs
- central administrator RBAC
- venue manager/operator assignments scoped by venue
- front-desk booking search and check-in
- venue/court closure and maintenance controls
- court Active / Maintenance / Closed controls
- central venue and court creation APIs
- staff account and venue-assignment administration
- central pricing-rule management
- policy publishing and version history
- province-wide booking and refund oversight
- central dashboard metrics
- finance summary and transaction APIs
- persisted reconciliation batches
- automatic audit capture for mutating HQ/operations actions
- venue performance reporting by bookings, booked court-hours and gross paid collections

The approved player UI remains in `../docs/` and is not modified by backend work on `backend-v1-dev`.

The Next.js staff portal is in `../admin/`:

- `/` — venue operations / front desk
- `/hq` — central SBP Padel headquarters administration
- `/hq/finance` — reconciliation and finance
- `/hq/reports` — venue performance reports
- `/hq/audit` — administrative audit history

## Local start

From the `backend` folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e .
uvicorn app.main:app --reload
```

Then open:

- API documentation: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/api/v1/health`
- Venues: `http://127.0.0.1:8000/api/v1/venues`

For availability, copy the venue ID from `/api/v1/venues`, then call:

`GET /api/v1/venues/{venue_id}/availability?date=2026-08-23`

## Development booking/payment flow

1. `POST /api/v1/auth/login`
2. `GET /api/v1/policies/active`
3. `POST /api/v1/bookings/quote`
4. `POST /api/v1/bookings`
5. `POST /api/v1/payments/initiate`
6. In development only: `POST /api/v1/payments/{payment_id}/simulate-success`
7. `GET /api/v1/bookings/me`
8. `GET /api/v1/notifications/me`

The simulator is intentionally hidden from the production OpenAPI schema and is disabled outside `ENVIRONMENT=development`. A real payment gateway implements the provider adapter/callback boundary without changing the booking domain.

## Redis slot locking

PostgreSQL remains the source of truth for bookings. Redis prevents two concurrent checkout requests from reserving the same court/hour before the database transaction is committed.

Development can run without Redis. Production should set:

```text
REDIS_URL=redis://host:6379/0
REDIS_REQUIRED=true
```

Selected slots are acquired atomically using one Redis Lua operation and expire automatically after `SLOT_HOLD_MINUTES`. Locks are also released early on cancellation, payment failure, expiry and successful payment confirmation.

## Database migrations

Development can still use automatic table creation for convenience. Production deployment must use Alembic.

From `backend/`:

```powershell
alembic upgrade head
```

Future schema changes must be added as new migrations rather than rewriting applied revisions.

## Finance, reconciliation and audit

Headquarters administrators can request finance summaries for a date range, inspect payment transactions, generate immutable reconciliation snapshots, review refund progress and view venue performance.

Every mutating `/admin` and `/operations` request is automatically captured in the audit log with the authenticated actor, role, action path and HTTP result. Sensitive request bodies are deliberately not copied into the generic audit record.

## Production configuration

Development defaults to SQLite to keep local testing simple. Production is designed for PostgreSQL. Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL `postgresql+asyncpg://...` connection string.

For production:

- set `ENVIRONMENT` to a non-development value
- use a strong `JWT_SECRET`
- configure PostgreSQL
- configure Redis and set `REDIS_REQUIRED=true`
- run `alembic upgrade head` before starting the API
- configure allowed CORS origins explicitly
- connect the selected payment provider adapter and verified callback/webhook handler

## Remaining external/integration milestones

1. Select and implement the real payment gateway adapter.
2. Add signed/idempotent payment callback and refund callback processing for that provider.
3. Add venue image/media storage and administration.
4. Add delivery adapters for push notifications, SMS and email.
5. Connect the approved player frontend/Android client to the production APIs.
6. Production deployment, observability, backups and security hardening.

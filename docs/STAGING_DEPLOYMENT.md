# SBP-Padel staging deployment runbook

This is the provider-neutral deployment sequence. PITB/government production hosting remains an external decision. A Vercel deployment may be used as a temporary staging/UAT environment so the application can be exercised over real HTTPS before final infrastructure is agreed.

## Current staging status — 3 September 2026

The connected Vercel team currently contains only the earlier `sbp-padel-live-preview` connectivity-test project. It is not the SBP-Padel application and must not be used as the Android release-candidate target.

A dedicated managed PostgreSQL staging resource has now been provisioned in Neon for SBP-Padel staging:

- project: `SBP-Padel Staging` (`late-scene-06157581`);
- default branch: `staging` (`br-hidden-wave-ax5rz20a`);
- database: `sbp_padel_staging`;
- PostgreSQL 17;
- TLS is required by the issued connection string;
- credentials/connection URI are held only in the connected secret-bearing service and must not be committed to Git.

Connectivity to the new database has been verified. The application schema has not yet been migrated into it because the current connected Vercel/GitHub tool surfaces do not expose a safe path to inject the database secret into a runnable repository checkout or Vercel environment. Run Alembic only after the real API project exists and the `DATABASE_URL` is stored in its deployment secret/config store.

The repository is prepared for separate Vercel API, Player and optional Admin projects, but a real staging deployment still requires:

- Vercel project creation/import for the relevant repository roots;
- deployment environment variables, including the provisioned PostgreSQL `DATABASE_URL`, a strong staging `JWT_SECRET`, exact HTTPS `CORS_ORIGINS` and `TRUSTED_HOSTS`;
- migrations against the provisioned PostgreSQL database;
- an explicit Player-to-API staging URL configuration;
- SMTP if password-recovery delivery is to be tested;
- Redis with `REDIS_REQUIRED=true` if staging is expected to exercise shared locking/rate limiting across more than one backend instance.

The connected Vercel tool surface can inspect/deploy already-linked projects but does not currently expose project creation or environment-variable mutation for this workspace. Do not claim a real SBP-Padel Vercel application environment exists until those projects are actually created/configured and health-tested.

## 1. Provision dependencies

- PostgreSQL database with backups enabled. Do not use ephemeral SQLite for an internet-facing staging environment.
- Redis is optional for a single-instance staging experiment. For horizontally scaled production locking, prefer `REDIS_REQUIRED=true` with `REDIS_URL`.
- SMTP is required in production and recommended in staging for password-recovery testing.
- HTTPS origins for the Player/Admin applications and API.
- Final API hostnames that can be placed in the backend trusted-host allowlist.

## 2. Configure backend

Use `backend/.env.production.example` as the variable checklist, but store real values in the deployment platform's secret/config store rather than source control.

For staging use `ENVIRONMENT=staging`; for public deployment use `ENVIRONMENT=production`.

Set `TRUSTED_HOSTS` to the exact hostnames through which the API will be reached. Do not use a wildcard for a non-local deployment. Set `CORS_ORIGINS` to the explicit HTTPS Player/Admin browser origins. CORS origins and trusted hosts solve different problems and both must be configured.

Security-sensitive defaults include:

- player access tokens carry a server-checked token version;
- HQ, venue-manager and venue-operator tokens use the shorter `STAFF_ACCESS_TOKEN_MINUTES` lifetime;
- password changes/resets and staff administrative resets revoke older access tokens immediately;
- public authentication/recovery routes are rate-limited, using Redis when configured;
- each signed password-reset challenge has its own OTP-attempt limit in addition to endpoint/IP abuse controls;
- production SMTP requires STARTTLS;
- uploaded profile/venue images are decoded and checked against permitted image signatures rather than trusting only the data-URL prefix;
- payment mutation/callback audit records contain route/method/status metadata only, not callback bodies, bearer tokens or provider credentials.

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

Do not use `Base.metadata.create_all()` as a staging/production migration mechanism. Application startup performs `create_all`/seed setup only for local `development` and automated `test` environments. Non-local deployment remains Alembic-driven.

The historical baseline migration creates its baseline tables through model metadata, so later migrations must remain safe when a fresh database already contains a model field represented by a later revision. Backend CI now proves a fresh PostgreSQL `alembic upgrade head` path and the token-version hardening revision explicitly handles both fresh and pre-hardening databases.

## 4. Start backend

Conventional VM/container example:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Place it behind the selected HTTPS reverse proxy/load balancer and use an appropriate process supervisor for the chosen platform.

Interactive FastAPI `/docs`, `/redoc` and `/openapi.json` endpoints are intentionally disabled outside development/test. Do not use their absence as a failed staging health signal.

## 5. Vercel staging experiment

Vercel currently supports Python/FastAPI applications with an `app` entrypoint, so the backend does not need to be rewritten into JavaScript merely for this experiment.

The repository contains Vercel preparation for temporary staging/UAT:

- `backend/pyproject.toml` declares the FastAPI entrypoint `app.main:app`;
- `backend/vercel.json` configures the FastAPI function duration;
- `docs/vercel.json` supplies Player CSP and baseline browser security headers;
- `admin/next.config.mjs` supplies Admin CSP and browser security headers.

Recommended Vercel project separation:

1. `sbp-padel-api-staging` with project root `backend/`;
2. `sbp-padel-player-staging` with project root `docs/`;
3. optionally `sbp-padel-admin-staging` with project root `admin/`.

The backend project must use a persistent PostgreSQL `DATABASE_URL` and secure environment values before it is treated as a real application environment. Minimum staging variables are:

```text
ENVIRONMENT=staging
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=<strong random secret, at least 32 characters>
CORS_ORIGINS=https://<player-host>,https://<admin-host>
TRUSTED_HOSTS=<api-host>
```

Add `REDIS_URL`/`REDIS_REQUIRED=true` if shared locking/rate limiting must fail closed, and SMTP values when recovery delivery is to be tested.

Do not place PayZen credentials into Vercel until the official PayZen contract has been implemented and staging/UAT is intentionally approved for those credentials.

## 6. Health checks

- `GET /health/live` proves the API process is responsive.
- `GET /health/ready` verifies database connectivity and, when `REDIS_REQUIRED=true`, Redis connectivity.

A deployment should not receive UAT or production traffic until readiness returns HTTP 200 through the real routed hostname, not merely through localhost inside a container/VM.

## 7. Edge/security verification

Through the final HTTPS route, verify:

- an allowed Host header reaches the application successfully;
- an unexpected Host header is rejected;
- API responses include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store`;
- the Player and Admin portals serve their configured Content Security Policy and security headers;
- TLS/HSTS behavior is configured at the HTTPS edge according to the selected hosting platform;
- authentication/recovery rate limits return 429 after the configured threshold;
- repeated incorrect OTPs against one signed reset challenge are blocked at the configured reset-code attempt limit;
- a token issued before password reset/change no longer authorizes `/auth/me` afterward.

## 8. Android release-candidate sequencing

The Android project separates three purposes:

- `debug`: LAN/development, cleartext allowed for local testing and signed with the disposable development key;
- `releaseCandidate`: release-like HTTPS-only WebView configuration, still signed with the disposable development key for installable UAT builds;
- `release`: HTTPS-only hardened configuration intended for the eventual SBP-controlled release signing key supplied outside Git.

`versionCode=13` and base `versionName=1.0.0`; the staging candidate is `1.0.0-rc1` when built.

Neither RC nor release now hard-codes the old Vercel connectivity-test URL. RC reads `SBP_PADEL_RC_PLAYER_URL`; release reads `SBP_PADEL_PLAYER_URL`. Android CI refuses the old connectivity-test domains and skips RC production when no real staging Player URL is configured. When RC is enabled, CI requires HTTPS, verifies cleartext is disabled and verifies release-candidate minification output exists.

Do not distribute a debug APK or an RC built for anything other than the actual approved staged Player origin as the staging release candidate.

## 9. Post-deploy functional verification

Verify at minimum:

1. login and `/api/v1/auth/me`;
2. public venue discovery and availability;
3. HQ login and venue directory;
4. venue-operations login and court schedule;
5. create a controlled staging booking and verify slot locking;
6. cancellation/reschedule and released-slot availability;
7. pass validation/check-in;
8. password-reset delivery through the configured SMTP service;
9. reset-code guessing protection and old-token revocation after password change/reset;
10. backup and restore procedure for PostgreSQL;
11. Player web deployment reports the intended current runtime build rather than a stale service-worker/runtime generation;
12. Android release-candidate can load only the approved HTTPS Player origin and blocks cleartext/mixed-content navigation;
13. payment initiation/callback test paths create safe audit entries without retaining raw provider callback bodies or authorization headers.

Online Player payment remains a separate blocker until PayZen's real provider contract is supplied and integrated with authenticated callbacks/status verification, idempotency, reconciliation and the agreed manual refund process.

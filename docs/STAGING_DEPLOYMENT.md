# SBP-Padel staging deployment runbook

This runbook covers the temporary HTTPS staging/UAT path. PITB/government production hosting remains a separate external decision. Vercel staging must not be treated as the final production-hosting decision.

## Current verified staging state — 3 September 2026

A real SBP-Padel staging environment now exists and has been verified end to end.

Canonical staging origins:

- API: `https://sbp-padel-api-staging.vercel.app`
- Player entry: `https://sbp-padel-player-staging.vercel.app/staging-entry.html`
- Admin: `https://sbp-padel-admin-staging.vercel.app`

Dedicated Vercel projects:

- `sbp-padel-api-staging`
- `sbp-padel-player-staging`
- `sbp-padel-admin-staging`

The old `sbp-padel-live-preview` project remains only a historical connectivity test and must never be used as the Android RC target.

Managed staging PostgreSQL:

- Neon project: `SBP-Padel Staging` (`late-scene-06157581`)
- branch: `staging` (`br-hidden-wave-ax5rz20a`)
- database: `sbp_padel_staging`
- PostgreSQL 17
- TLS required
- credentials remain in secret stores only and must never be committed or printed

The staging database has been migrated through Alembic revision `20260903_0006 (head)`. `alembic check` reports no pending upgrade operations.

### Verified workflow evidence

Final full-chain staging workflow:

- workflow: `Vercel Staging Deployment`
- run: `33763320654`
- branch/head used by the deployment: `backend-v1-dev` at `5e1619a052882ad302b69c7041d361145b07004b`
- result: **success**

That run verified, in sequence:

1. required repository secrets present;
2. backend installation and staging preflight;
3. PostgreSQL/Alembic migration state;
4. API deployment;
5. API `/health/live` and `/health/ready` through the canonical HTTPS hostname;
6. deterministic Player staging bootstrap pointing only to the canonical staging API;
7. Player deployment and CSP/browser-security headers;
8. Admin native Next.js deployment and CSP/browser-security headers;
9. direct dispatch of the Android release-candidate workflow;
10. deployment summary generation.

Fresh Android workflow triggered by the successful staging run:

- workflow: `Android APKs`
- run: `33763539038`
- event: `workflow_dispatch`
- head: `5e1619a052882ad302b69c7041d361145b07004b`
- result: **success**

The Android run passed:

- RC target validation;
- debug build;
- secure `releaseCandidate` build;
- release-candidate manifest security verification;
- debug artifact upload;
- RC artifact upload.

Fresh RC artifact:

- name: `sbp-padel-1.0.0-rc1-apk`
- artifact id: `9896586123`
- digest: `sha256:9effe665ce7699e5fd07f1d6547281f6a8d2614e63451ae6690bbf790070bddf`
- workflow retention expiry reported by GitHub: 2 December 2026

A separate debug artifact was also produced. Never substitute the debug artifact for RC/UAT.

## Staging deployment automation

`.github/workflows/staging-vercel.yml` owns the guarded deployment sequence. It is manual by `workflow_dispatch` and also supports the repository staging-trigger file used during development verification.

Required repository secrets:

- `VERCEL_TOKEN`
- `SBP_PADEL_STAGING_DATABASE_URL`
- `SBP_PADEL_STAGING_JWT_SECRET`

The staging JWT secret must be at least 32 characters.

The workflow:

1. runs backend production/staging preflight;
2. upgrades/checks Alembic against the staging database;
3. creates or reuses the dedicated Vercel staging projects;
4. configures API production-environment variables inside the dedicated staging API project;
5. deploys API, Player and Admin;
6. verifies health/security gates through canonical hostnames;
7. dispatches the Android workflow only after all web/API staging gates pass.

Do not reintroduce the earlier attempt to mutate the repository `SBP_PADEL_RC_PLAYER_URL` Actions variable from the staging workflow. GitHub rejected that write for the workflow token. Android CI now has the verified canonical staging Player URL as its safe fallback and validates that the bootstrap points to the canonical staging API before enabling RC.

## Database URL normalization

Neon-issued connection URLs may contain libpq-style query parameters such as `sslmode` and `channel_binding`. SQLAlchemy/`asyncpg` does not accept those parameters in the same form.

The backend now normalizes the PostgreSQL URL centrally for the asyncpg runtime so Alembic and the deployed FastAPI application follow the same compatible path. Do not solve this only in CI while leaving live application startup different.

## Backend deployment configuration

Use `backend/.env.production.example` as the non-secret checklist. Real values belong only in the selected hosting platform's secret/configuration store.

For staging:

```text
ENVIRONMENT=staging
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=<strong random secret, at least 32 characters>
CORS_ORIGINS=https://sbp-padel-player-staging.vercel.app,https://sbp-padel-admin-staging.vercel.app
TRUSTED_HOSTS=sbp-padel-api-staging.vercel.app
```

Current staging deliberately has no production PayZen credentials.

Redis is optional for the present limited staging experiment. If horizontally scaled locking/rate limiting must fail closed, configure `REDIS_URL` and `REDIS_REQUIRED=true`.

SMTP is still required before real password-recovery delivery can be treated as production-ready and is recommended before full staging UAT of recovery email delivery.

## Alembic discipline

From `backend/` the deployment validation sequence is:

```bash
pip install -e .
python scripts/production_preflight.py
alembic upgrade head
alembic current
alembic check
```

Do not use `Base.metadata.create_all()` as the staging/production migration mechanism. Startup schema creation remains limited to local development/test paths. Staging and production remain Alembic-driven.

The fresh PostgreSQL migration chain is CI-tested. Later migrations must remain safe both for fresh databases and older databases being upgraded.

## Vercel backend adapter

The working Vercel API deployment uses an explicit Python function entrypoint under `backend/api/` routing the FastAPI ASGI application. Do not restore the discarded root `index.py` experiment: Vercel treated that file as static content rather than executing it as Python.

The API project's canonical hostname is health-tested after deployment, so an apparently successful Vercel build is not enough by itself.

## Player staging bootstrap

`docs/staging-entry.template.html` is the deterministic staging bootstrap. The deployment workflow generates the served `staging-entry.html` by replacing its API placeholder with:

`https://sbp-padel-api-staging.vercel.app/api/v1`

The bootstrap writes that fixed endpoint into Player local storage before redirecting to the normal Player authentication surface.

Do not replace this with a generic user-controlled `?api=` staging mechanism. A staging bootstrap that accepts an arbitrary remote API could route credentials to an attacker-controlled service.

The existing LAN/debug Android first-run query-API behavior is a separate local-development concern and must not weaken the hardened staging bootstrap.

## Admin staging

The Admin Vercel project must use the `Next.js` framework preset with output directory set to auto detection. An earlier project-level output setting incorrectly expected a static `public/` output folder even though the application builds as Next.js.

Security-header verification must use a normal GET response. Vercel/Next.js may return 404 for the HEAD probe even when GET `/` is healthy and returns the required headers.

Verified Admin headers include the repository CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS and the additional configured browser protections.

## API health and edge checks

Required staging probes:

- `GET /health/live`
- `GET /health/ready`

Interactive `/docs`, `/redoc` and `/openapi.json` are intentionally disabled outside development/test and are not staging health probes.

Continue to verify:

- exact trusted host behavior;
- exact Player/Admin CORS origins;
- API `nosniff`, frame, referrer and no-store controls;
- Player/Admin CSP and browser security headers;
- authentication/recovery abuse controls;
- password-reset challenge attempt limits;
- token revocation after password changes/resets.

## Android release-candidate model

Android variants remain deliberately separate:

- `debug`: LAN/development, cleartext allowed for local testing, disposable stable development signing key;
- `releaseCandidate`: release-like HTTPS-only WebView configuration, disposable development signing key for installable UAT;
- `release`: final hardened build intended for the SBP-controlled release key supplied outside Git.

Current base version is `1.0.0`, versionCode `13`; RC is `1.0.0-rc1`.

RC defaults to the verified staging Player entry when no repository override variable exists. CI still rejects the old Vercel connectivity-test domains, requires HTTPS, verifies the canonical staging bootstrap when using the default target, builds the secure release-candidate variant, verifies cleartext is disabled in the packaged manifest, and requires release-candidate minification output.

The current RC is technically build-verified but still requires manual device/product UAT before being considered accepted for release.

## Post-deploy functional UAT

Before treating staging as application/UAT complete, manually verify at minimum:

1. Player login and `/api/v1/auth/me` behavior;
2. public venue discovery and availability;
3. HQ login and venue directory;
4. venue-operations login and court schedule;
5. controlled staging booking and slot locking;
6. cancellation/reschedule with slot release;
7. pass validation/check-in;
8. staff/HQ flows that are part of the accepted product surface;
9. Android RC first launch/login/navigation on a real device;
10. no stale service-worker/runtime generation on Player;
11. password reset once SMTP staging delivery is configured.

Do not perform real payment-provider transactions in this environment until PayZen UAT credentials and the official integration contract are available and intentionally enabled.

## Production blockers remain external

Successful Vercel staging does **not** remove the final production blockers:

- official PayZen machine-to-machine documentation, UAT credentials and network/onboarding requirements;
- PITB/government production hosting decision and security review;
- final PostgreSQL/backup/restore architecture for production;
- production domains, SSL, exact CORS/trusted hosts and any VPN/OTI/static-IP whitelisting;
- production Redis decision if multi-instance concurrency requires it;
- SMTP provider/credentials;
- SBP-controlled Android release signing key and distribution channel;
- optional object storage before facility/profile image scale grows.

Do not change the technology stack merely because production hosting is undecided. Establish PITB VM/container/Kubernetes and network support requirements first.

## PayZen boundary

Online Player payment remains intentionally unconfigured in staging. The provider abstraction, callback verification boundary, idempotency, server-authoritative pricing, late-payment safety, reconciliation model and manual refund governance remain in place.

Do not invent PayZen endpoints, payloads, signatures or callback rules. Wait for PITB/PayZen's official API pack and UAT credentials before enabling real provider traffic.

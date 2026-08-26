# SBP-Padel — Launch Readiness

Updated: 26 August 2026
Branch: `backend-v1-dev`

This file separates product behavior that is implemented/tested from production decisions that still require configuration, procurement or manual acceptance. It is not a declaration that the product is production-launched.

## Product surfaces already substantially implemented

### Player
- Email/mobile + password account creation and login.
- Password recovery.
- Venue discovery, favourites, real facility gallery/cover images and directions.
- Android native location, Near Me within 15 km and nearby-aware Next Available.
- Date → Court → Time → Review → Payment → Confirmation booking flow.
- Consecutive multi-slot sessions, player count and booking participants.
- My Bookings, booking detail, reschedule, cancellation/refund request and notifications.
- Booking-level digital pass / QR.
- Google sign-in remains intentionally deferred and is not shown in the current player UI.

### Venue Manager / Operator
- Assigned-venue access and per-venue role enforcement.
- Court schedule and general booking views.
- Booking/player search and detail.
- Manual and QR/pass check-in.
- Registered-player lookup and registration.
- Front-desk booking with live availability/pricing and recorded counter payment.
- Manager-managed closures, court status and bookable hours/pricing.
- Venue finance/refund workflow and venue reporting.
- Self-service password change.
- Multi-venue switching treats the selected venue as authoritative; late responses from a previous venue are discarded and transient front-desk selections are cleared when the venue changes.
- Confirmed and rescheduled paid bookings are both valid active bookings for pass validation/check-in.

### HQ
- Province-wide overview and booking review.
- Persistent HQ navigation.
- Venue directory, venue creation/editing, courts, pricing, assignments and facility galleries.
- Staff creation, generated/reset passwords, disable/reactivate/safe-delete and role permissions.
- Policies, refund decisions, finance, reports and management-facing activity trail.
- Exact venue UUID is preserved through Directory → Profile → Management → Gallery navigation.

## Production-hardening implemented 26 Aug 2026

The unattended readiness pass added provider-neutral deployment safeguards without choosing a hosting vendor or payment gateway.

### Runtime configuration fail-fast
Outside `development` / `test`, startup validation now requires:
- an explicitly configured JWT secret of at least 32 characters;
- PostgreSQL rather than the SQLite development fallback;
- explicit HTTPS CORS origins, with wildcard and localhost origins rejected;
- explicit trusted API host names, with wildcard/local/test hosts rejected;
- `REDIS_URL` whenever `REDIS_REQUIRED=true`;
- positive token, slot-hold and password-reset timing values.

`production` additionally requires SMTP host/from configuration because password recovery is a public feature.

`backend/.env.production.example` is the non-secret configuration checklist. `backend/scripts/production_preflight.py` validates deployment configuration before migrations/startup, reports the accepted CORS/trusted-host configuration and redacts database credentials.

### Backend edge hardening
- FastAPI `/docs`, `/redoc` and `/openapi.json` are disabled outside development/test.
- `TrustedHostMiddleware` is enabled outside development/test.
- API responses receive baseline `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store` headers.
- Deployment health must be checked through the real routed hostname, not only localhost inside the host/container.

HSTS remains an HTTPS-edge responsibility because the final deployment platform has not yet been selected.

### Database migration discipline
Alembic remains the production schema mechanism. The initial revision no longer calls unrestricted `Base.metadata.create_all()` against whatever models happen to exist today. Its table set is frozen, so later models cannot silently mutate migration history or collide with later revisions.

Alembic environment metadata explicitly imports the domain, operations, platform and booking-participant model modules.

Backend CI includes a fresh temporary-database `alembic upgrade head`, `alembic current` and `alembic check`, in addition to the revision-graph check. This is intended to catch a migration chain that imports successfully but cannot actually create a new database.

### Deployment health
- `GET /health/live` is a process liveness endpoint.
- `GET /health/ready` verifies database connectivity and also Redis connectivity when `REDIS_REQUIRED=true`.

A deployment should not receive traffic until readiness returns HTTP 200.

### Admin dependency and browser security
The Admin portal direct dependencies are pinned to approved exact versions, including Next.js `15.5.24` and TypeScript `5.9.3`. A committed registry-resolved npm lockfile is still pending an environment where it can be generated and reviewed from the real registry.

Admin Portal CI performs dependency high-severity audit, production build, runtime browser QA and a security-header smoke check. The app disables the default framework identification header and sends baseline anti-clickjacking, content-type, referrer and permissions-policy headers.

Grouped monthly Dependabot checks cover backend Python packages, Admin npm packages, Android Gradle dependencies and GitHub Actions while targeting `backend-v1-dev` with a deliberately low open-PR limit.

### Player production runtime/cache integrity
The production service worker and static player shell now use one canonical build generation: `20260826-production-runtime-v2`.

The service worker:
- injects the canonical production runtime modules while excluding development-only `dev-runtime.js`;
- rewrites same-origin local JS/CSS URLs in navigated HTML to the current build generation;
- uses no-store navigation fetching/response headers;
- masks known prototype booking/player/policy fallback data before live hydration.

`docs/index.html`, `docs/app.js`, dynamically loaded bootstrap assets and service-worker registration use the same generation so the first uncontrolled load and later service-worker-controlled loads cannot silently diverge through old August 24 cache tokens.

Player CI syntax-checks every top-level runtime JavaScript file, asserts the canonical module/build structure and executes the full browser interaction suite. A recovered hosted run for the canonical service-worker alignment completed successfully on 26 August 2026.

### Android release-signing boundary
The committed `dev-signing-key.b64` is a disposable development identity used only for stable debug APK upgrades. Gradle assigns it only to `debug`; `release` has no repository signing configuration. Real release keys, `.keystore`/`.jks`/`.p12` files and `key.properties` are excluded from source control.

`android/RELEASE_SIGNING.md` documents the remaining release-signing procedure. Public release still requires an SBP-controlled signing key stored outside Git, final versioning/distribution and release-certificate verification.

A hosted Android debug APK run completed successfully during the 26 August cleanup pass.

### Repository governance and maintenance
- `SECURITY.md` directs vulnerability reports away from public issues and prohibits committing production secrets/signing material/real user data.
- `docs/REPOSITORY_MAINTENANCE.md` records redundant branches, workflow intent and governance gaps.
- Both `main` and `backend-v1-dev` remain unprotected at repository-settings level because the connected GitHub surface can read but not write protection/rulesets.
- Redundant historical branch refs are classified for deletion but have not been falsely reported deleted because the connected GitHub surface does not expose Git-ref deletion.

### Deployment runbook
`docs/STAGING_DEPLOYMENT.md` provides a provider-neutral sequence for PostgreSQL/Redis/SMTP/HTTPS/trusted-host configuration, preflight, Alembic migration, API startup, health probes, security-header verification and post-deploy acceptance.

## Automated quality gates

The repository has dedicated CI for:
- Backend API/tests and migration/preflight checks.
- Admin/operations Next.js production build, dependency high-severity audit, security-header smoke and Playwright browser QA.
- Player browser/runtime interaction QA.
- Android debug APK build.

Important regressions explicitly covered include:
- manager/operator password changes and separate HQ reset flow;
- two-venue HQ routing context;
- operations pass/check-in for rescheduled bookings;
- operations multi-venue stale-response protection and venue-scoped transient state;
- operator read-only controls versus manager mutation controls;
- player login must not display the deferred Google sign-in option;
- non-development runtime configuration safeguards, trusted hosts and deployment health probes;
- baseline API security headers;
- canonical production player cache generation and removed legacy runtime modules;
- fresh database migration to current Alembic head.

GitHub Actions experienced a transient allocation backlog on 26 August. It later recovered and began processing the queued history. During recovery, older Backend/Admin runs exposed two genuine maintenance issues: one stale backend test still assumed a JWT secret alone made a production config valid, and one Admin dependency pin referenced non-existent TypeScript `5.9.0`. Both were corrected in the repository. Final readiness still requires fresh successful Backend/Admin runs containing those fixes, plus a Player run containing the final unified cache-generation guards.

Implementation and CI are not the same as production acceptance. Do not mark deployment-ready merely because automated checks pass.

## Production blockers / decisions still required

### 1. Real player payment provider — blocking
The online player payment path currently creates a payment with provider `unconfigured`. Development has simulator endpoints, deliberately unavailable outside development. Before public launch, select and integrate the actual payment gateway/provider, including signed callbacks/webhooks, idempotency, provider reconciliation, failure/timeout handling and real refund execution.

Front-desk payments are operational records entered by authorized venue staff and are separate from the online payment-provider integration.

### 2. Production PostgreSQL hosting, backups and recovery — blocking
The application and migration path are PostgreSQL-ready and fail fast against SQLite outside dev/test, but an actual database service has not been selected. Production still needs the chosen PostgreSQL service, credentials/networking, backup retention, restore procedure and a tested recovery objective.

Do not rely on development `create_all` behavior for deployment.

### 3. Production secrets and environment values — blocking
The validation rules and template exist, but real JWT, database, Redis (if required), SMTP and other values must be provisioned through the selected platform's secret/config store.

### 4. Domain, HTTPS, trusted hosts and CORS — blocking
Choose final API/admin/player origins and configure TLS/HTTPS, backend `TRUSTED_HOSTS` and CORS allow-list accordingly. Localhost/LAN values remain development-only.

### 5. Real email delivery — needed for public password recovery
Production validation requires SMTP host/from configuration, but an SMTP provider/account and actual credentials still need to be selected and tested end-to-end.

### 6. Venue image storage — recommended before scale
Facility images currently use database-backed data URLs. The behavior is working and accepted, but production object/blob storage is recommended before large-scale venue/photo growth. The gallery API semantics can remain unchanged while the storage layer changes.

### 7. Android release signing/distribution — blocking for public release
The debug/release signing boundary is documented and guarded, but public distribution still requires the real SBP-controlled release key, release configuration, versioning, certificate custody/recovery and chosen distribution channel.

### 8. Google sign-in — intentionally deferred, not a launch blocker unless product scope changes
Backend verification scaffolding exists, but the player-facing feature is deliberately hidden. It should remain hidden until Google Cloud OAuth configuration, browser/native flows, error states, staff-account isolation and manual acceptance are complete. Any Android OAuth client must use the final release certificate rather than the debug certificate.

## Recommended remaining sequence

1. Obtain fresh green Backend/Admin/Player CI on the final relevant commits after the 26 August cleanup fixes.
2. Select the real online payment provider and define settlement/refund/reconciliation requirements.
3. Choose the production PostgreSQL/hosting architecture and backup/restore policy.
4. Choose final domains, TLS termination and SMTP provider; populate the production secret store and trusted-host/CORS lists.
5. Deploy a production-like staging environment using `docs/STAGING_DEPLOYMENT.md`.
6. Move facility image storage to object storage if launch scale warrants it.
7. Create and secure the final Android release key and distribution configuration.
8. Run staging acceptance across player → payment → venue check-in → refund → HQ reconciliation, including backup/restore and operational failure cases.

Do not mark a surface manually accepted merely because its automated CI is green. Repository state, actual runtime behavior, CI and explicit manual review remain separate sources of truth.

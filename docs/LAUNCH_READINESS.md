# SBP-Padel — Launch Readiness

Updated: 26 August 2026
Branch: `backend-v1-dev`

This file separates product behavior that is implemented/tested from production decisions that still require configuration, procurement, external integration or manual acceptance. It is not a declaration that the product is production-launched.

## Product surfaces already substantially implemented

### Player
- Email/mobile + password account creation and login.
- Password recovery.
- Session-aware splash for logged-in versus logged-out startup.
- Venue discovery, favourites, real facility gallery/cover images and directions.
- Android native location, Near Me within 15 km and nearby-aware Next Available.
- Date → Court → Time → Review → Payment → Confirmation booking flow.
- Six quick dates plus More, Android touch scrolling on booking-flow screens and booking-style reschedule date/court/slot controls.
- Consecutive multi-slot sessions, player count and booking participants.
- My Bookings, booking detail, cross-court reschedule, cancellation/refund request and notifications.
- Saved Players persistence across booking and Profile.
- Booking-level digital pass / QR with cancelled/ineligible pass rejection at both UI and backend layers.
- Google sign-in remains intentionally deferred and is not shown in the current player UI.

### Venue Manager / Operator
- Assigned-venue access and per-venue role enforcement.
- One canonical operations sidebar across the main console, Players and Scan Pass.
- Court schedule and general booking views.
- Booking/player search and detail.
- Manual and QR/pass check-in.
- Registered-player lookup and registration.
- Front-desk booking with live availability/pricing and recorded counter payment.
- Manager/admin operational reschedule and cancellation; operator role remains restricted.
- Manager-managed closures, court status and bookable hours/pricing.
- Manager-only detailed Refund Management; operator can view permitted finance/reporting information but cannot mutate refunds.
- Venue finance and reporting.
- Self-service password change.
- Multi-venue switching treats the selected venue as authoritative; late responses from a previous venue are discarded and transient front-desk selections are cleared when the venue changes.
- Confirmed and rescheduled paid bookings are both valid active bookings for pass validation/check-in.

### HQ
- Province-wide overview and booking review.
- Persistent HQ navigation.
- Venue directory, venue creation/editing, courts, pricing, assignments and facility galleries.
- Canonical Staff Accounts at `/hq/staff` with generated/manual temporary passwords, Show/Hide/Generate/Copy, post-create password visibility, Reset Password, disable/reactivate and safe delete.
- Policies, refund decisions, finance, reports and management-facing activity trail.
- Exact venue UUID is preserved through Directory → Profile → Management → Gallery navigation.
- Checkout service fee is HQ-configurable and persisted.

## Financial integrity and provider preparation

### Service-fee source of truth and snapshots
The HQ-configured checkout service fee is persisted in platform settings. New player quotes and bookings use the latest persisted value. Each booking captures its own service-fee snapshot, so later HQ changes do not rewrite historical financial records.

Targeted backend regression proves:
- an existing booking keeps the fee captured at creation;
- a new quote uses the newly configured fee;
- a front-desk booking also uses the latest persisted HQ fee rather than stale worker-local configuration.

The shared quote path refreshes the persisted fee before operations/front-desk booking creation, preventing a multi-worker process from silently using an older in-memory fee after HQ changes it.

### Payment provider boundary
`backend/app/payments/providers.py` owns a provider-neutral payment interface. `/api/v1/payments/initiate` now calls that provider interface instead of manually constructing an `unconfigured` payment row.

The persisted/returned payment contract can carry:
- provider name;
- provider reference;
- optional redirect URL;
- optional client payload;
- provider metadata required for later reconciliation.

Initiation is idempotent at the booking level while a pending payment exists. Repeated taps return the same pending payment instead of invoking the provider again and generating another bill/reference. `backend/tests/test_payment_provider_boundary.py` locks this behavior.

Development simulator endpoints remain development-only.

### Likely PayZen direction
The department is likely to use PITB PayZen. Public PayZen/PITB information indicates a PSID/1Bill-oriented government collection model with multiple payment channels and real-time payment intimation. Public integration examples are useful only for architecture. They are not authority for the department's production endpoint/signature contract.

Read `docs/PAYZEN_INTEGRATION.md` before implementing the provider. Production activation must wait for the official departmental onboarding pack covering sandbox/production URLs, credentials, service IDs, PSID request/response schema, callback authentication, status codes, retries/idempotency, inquiry, settlement/reconciliation and refund/reversal rules.

Do not invent private PayZen endpoints or signatures.

## Production-hardening implemented 26 Aug 2026

### Runtime configuration fail-fast
Outside `development` / `test`, startup validation requires:
- an explicitly configured JWT secret of at least 32 characters;
- PostgreSQL rather than the SQLite development fallback;
- explicit HTTPS CORS origins, with wildcard and localhost origins rejected;
- explicit trusted API host names, with wildcard/local/test hosts rejected;
- `REDIS_URL` whenever `REDIS_REQUIRED=true`;
- positive token, slot-hold and password-reset timing values.

`production` additionally requires SMTP host/from configuration because password recovery is a public feature.

`backend/.env.production.example` is the non-secret configuration checklist. `backend/scripts/production_preflight.py` validates deployment configuration before migrations/startup, reports accepted CORS/trusted-host configuration and redacts database credentials.

### Backend edge hardening
- FastAPI `/docs`, `/redoc` and `/openapi.json` are disabled outside development/test.
- `TrustedHostMiddleware` is enabled outside development/test.
- API responses receive baseline `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store` headers.
- Deployment health must be checked through the real routed hostname, not only localhost inside the host/container.

HSTS remains an HTTPS-edge responsibility because the final deployment platform has not yet been selected.

### Database migration discipline
Alembic remains the production schema mechanism. The initial revision has a frozen explicit baseline table set rather than calling unrestricted `Base.metadata.create_all()` against whatever models happen to exist today. Later models therefore cannot silently mutate migration history or collide with later revisions.

Alembic environment metadata imports the domain, operations, platform and booking-participant model modules.

Backend CI provisions PostgreSQL and runs fresh `alembic upgrade head`, `alembic current` and `alembic check`, in addition to the full backend tests and Ruff.

### Deployment health
- `GET /health/live` is a process liveness endpoint.
- `GET /health/ready` verifies database connectivity and Redis connectivity when `REDIS_REQUIRED=true`.

A deployment should not receive traffic until readiness returns HTTP 200.

### Admin dependency and browser security
Admin direct dependencies are pinned to the approved security-patched line, including Next.js `15.5.24`, React/ReactDOM `19.1.9`, TypeScript `5.9.3` and the patched PostCSS override. Admin Portal CI blocks on high-severity `npm audit`, then performs the production build, runtime security-header smoke test and complete Playwright Admin/operations QA.

The app disables the default framework identification header and sends baseline anti-clickjacking, content-type, referrer and permissions-policy headers.

Grouped monthly Dependabot checks cover backend Python packages, Admin npm packages, Android Gradle dependencies and GitHub Actions while targeting `backend-v1-dev` with a deliberately low open-PR limit.

### Player production runtime/cache integrity
The production service worker and static player shell use one canonical production runtime generation. The worker injects the canonical production modules while excluding development-only runtime code, rewrites same-origin local JS/CSS asset URLs to the active build generation, uses fresh/no-store navigation behavior and scrubs known stale prototype fallback data before hydration.

Player CI syntax-checks all top-level runtime JavaScript, guards the production loader/build structure and executes the complete browser interaction suite, including locked regressions for previously accepted Android touch scrolling, Profile → My Bookings hydration, navigation recovery, Review flow, lifecycle/pass security, account and themes.

### Android release-signing boundary
`android/dev-signing-key.b64` is a deliberately public, disposable **development-only** fixture. It gives local/CI debug APKs one stable development identity so a newer test APK can install over the previous debug APK without forcing uninstall/reinstall. It is not a production secret and must never be reused for release signing.

Gradle applies the fixture only to `debug`; `release` has no repository signing configuration. Public release requires a separate SBP-controlled key stored outside Git. See `android/RELEASE_SIGNING.md`.

### Repository governance and maintenance
- `SECURITY.md` directs vulnerability reports away from public issues and prohibits committing production secrets, production signing material and real user data.
- `docs/REPOSITORY_MAINTENANCE.md` records redundant branches, workflow intent, completed dead-code cleanup and governance gaps.
- Proven-dead HQ route/shortcut bridges have been removed only where canonical replacements are established.
- Player/runtime bridge files are not deleted merely because their names look historical; several still own accepted WebView/navigation/service-worker behavior.
- Both `main` and `backend-v1-dev` remain unprotected at repository-settings level because the connected GitHub surface can read but not write protection/rulesets.
- Redundant branch refs are classified for deletion but remain because the connected mutation surface does not expose Git ref deletion.

### Deployment runbook
`docs/STAGING_DEPLOYMENT.md` provides a provider-neutral sequence for PostgreSQL/Redis/SMTP/HTTPS/trusted-host configuration, preflight, Alembic migration, API startup, health probes, security-header verification and post-deploy acceptance.

## Automated quality gates

The repository has dedicated CI for:
- Backend API/tests and PostgreSQL migration/preflight checks.
- Admin/operations Next.js production build, dependency audit, security-header smoke and Playwright browser QA.
- Player browser/runtime interaction QA.
- Android debug APK build.

Important regressions explicitly covered include:
- HQ Reset Password canonical navigation and staff lifecycle;
- manager/operator self-service password changes and separate HQ reset flow;
- two-venue HQ routing context;
- manager/admin cancellation and slot release;
- manager-only refund mutation versus operator denial;
- operations pass/check-in for rescheduled bookings;
- operations multi-venue stale-response protection and venue-scoped transient state;
- one canonical operations sidebar on Players and Scan Pass;
- player slot/date Android touch scrolling;
- Profile → My Bookings hydration;
- cancelled/ineligible pass rejection;
- service-fee persistence and historical snapshots;
- front-desk use of the latest persisted service fee;
- payment-provider invocation and pending-payment initiation idempotency;
- player login must not display the deferred Google sign-in option;
- non-development runtime configuration safeguards, trusted hosts and deployment health probes;
- baseline API security headers;
- canonical production player cache generation and removed legacy runtime modules;
- fresh PostgreSQL migration to current Alembic head.

The relevant Backend, Admin, Player and Android hosted workflows were green after the 26 August audit/cleanup changes. Implementation and CI remain distinct from manual acceptance and production deployment.

## Production blockers / decisions still required

### 1. PayZen production integration and UAT — blocking
PayZen is the likely provider direction, but SBP-Padel does not yet contain a production PayZen provider implementation. Obtain the authoritative departmental PayZen onboarding/integration pack and UAT credentials before coding provider-specific requests/callback verification.

Required launch work includes authenticated provider initiation, PSID/reference handling, authoritative payment-status confirmation, duplicate callback/idempotency behavior, expired-hold reconciliation, settlement/reconciliation, failure/timeout handling and provider-side refund/reversal execution where supported.

Front-desk payments remain separate operational counter records entered by authorized venue staff.

### 2. Production PostgreSQL hosting, backups and recovery — blocking
The application and migration path are PostgreSQL-ready and fail fast against SQLite outside dev/test, but an actual database service has not been selected. Production still needs the chosen PostgreSQL service, credentials/networking, backup retention, restore procedure and tested recovery objectives.

Do not rely on development `create_all` behavior for deployment.

### 3. Production secrets and environment values — blocking
The validation rules and template exist, but real JWT, database, Redis if required, SMTP and PayZen values must be provisioned through the selected platform's secret/config store.

### 4. Domain, HTTPS, trusted hosts and CORS — blocking
Choose final API/admin/player origins and configure TLS/HTTPS, backend `TRUSTED_HOSTS` and CORS allow-list accordingly. Localhost/LAN values remain development-only.

### 5. Real email delivery — needed for public password recovery
Production validation requires SMTP host/from configuration, but an SMTP provider/account and actual credentials still need to be selected and tested end-to-end.

### 6. Venue image storage — recommended before scale
Facility images currently use database-backed data URLs. The behavior is working and accepted, but production object/blob storage is recommended before large-scale venue/photo growth. Gallery API semantics can remain unchanged while the storage layer changes.

### 7. Android release signing/distribution — blocking for public release
Public distribution still requires the real SBP-controlled release key, release configuration, versioning, certificate custody/recovery and chosen distribution channel.

### 8. Google sign-in — intentionally deferred
Backend verification scaffolding exists, but the player-facing feature is deliberately hidden. It remains deferred unless product scope changes. Any eventual Android OAuth client must use the final release certificate rather than the debug certificate.

## Recommended remaining sequence

1. Obtain the official PayZen technical/onboarding material and UAT credentials.
2. Implement `PayZenPaymentProvider` behind the existing provider boundary, including verified callbacks/status inquiry and reconciliation tests.
3. Update the player payment UI for the confirmed PayZen PSID/hosted flow and complete PayZen UAT.
4. Choose the production PostgreSQL/hosting architecture and backup/restore policy.
5. Choose final domains, TLS termination and SMTP provider; populate the production secret store and trusted-host/CORS lists.
6. Deploy a production-like staging environment using `docs/STAGING_DEPLOYMENT.md`.
7. Move facility image storage to object storage if launch scale warrants it.
8. Create and secure the final Android release key and distribution configuration.
9. Run staging acceptance across player → PayZen payment → venue check-in → cancellation/refund → HQ reconciliation, including backup/restore and operational failure cases.

Do not mark a surface manually accepted merely because its automated CI is green. Repository state, actual runtime behavior, CI and explicit manual review remain separate sources of truth.

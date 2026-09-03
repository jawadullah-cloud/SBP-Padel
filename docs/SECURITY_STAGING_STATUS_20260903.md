# SBP-Padel security and staging status — 3 September 2026

Branch: `backend-v1-dev`

This note records the security-hardening and staging facts established from repository source, GitHub Actions and the connected Vercel workspace on 3 September 2026. It supplements `PROJECT_MEMORY.md`, `LAUNCH_READINESS.md`, `STAGING_DEPLOYMENT.md` and `PAYZEN_INTEGRATION.md` and should be treated as a dated implementation/status record, not a declaration of production launch.

## CI regression repairs completed

The previously unresolved Backend CI failure was reproduced from the uploaded pytest diagnostics rather than guessed.

1. Test startup was querying `platform_settings` before the SQLite test schema existed because local schema initialization ran only for `development`; test initialization now runs for both `development` and `test`.
2. Development payment simulator endpoints are available in automated `test` as well as local `development`, while remaining unavailable outside those environments.
3. Fresh PostgreSQL migration smoke exposed a duplicate `users.token_version` addition. Security migration `20260903_0006` now safely handles both a fresh schema that already contains that model field and an existing pre-hardening database that needs the column added.

After those fixes the backend test suite, Ruff, Python dependency audit and fresh PostgreSQL Alembic smoke are green.

Admin CI was also corrected. The CSP/security-header gate now checks the actual configured `Referrer-Policy: no-referrer`, and Playwright runs against the built production Next.js runtime (`next start`) rather than the development runtime. This preserves CSP while testing the deployment-mode application. Admin dependency audit, production build, security-header smoke and the full Admin/operations Playwright suite are green.

## Security hardening completed/verified

- Login, registration, token and password-recovery abuse controls are present.
- Each signed password-reset challenge now has its own OTP-attempt limit in addition to request/IP rate limiting, preventing unlimited guessing of the same challenge from changing client IPs.
- Password change/reset and staff reset paths use token-version revocation so older bearer tokens become invalid.
- Privileged staff tokens use the shorter staff session duration.
- Actual avatar and venue-gallery image bytes are validated as supported JPEG/PNG/WebP content rather than trusting only a declared data-URL MIME prefix.
- Backend runtime validation requires strong JWT configuration, PostgreSQL, explicit HTTPS CORS origins and explicit trusted hosts outside development/test, with SMTP/STARTTLS requirements for production.
- FastAPI interactive docs are disabled outside development/test and baseline API security headers are enabled.
- Admin has CSP and browser security headers; Player Vercel staging configuration now also supplies CSP, anti-framing, content-type, referrer, permissions, COOP and CORP protections.
- Python dependency audit, Admin npm security audit and complete Git-history Gitleaks scanning are CI gates.
- Mutating payment API operations, including the provider-callback route after the provider verification boundary, now produce audit records containing route/method/status metadata only. Raw callback bodies, bearer headers and provider credentials are deliberately not written into those audit records.
- PayZen-specific callback authentication has not been invented. It remains blocked until PITB supplies the official signature/HMAC/token/certificate contract.

## Android release-candidate boundary

Base Android version is `1.0.0`, `versionCode=13`; the release-candidate build is `1.0.0-rc1` when enabled.

The Android wrapper already enforces release-like WebView controls: cleartext disabled outside debug, mixed-content disabled, trusted-origin navigation restriction, release WebView debugging disabled, file access disabled, and JavaScript/native bridges restricted to trusted content in non-debug builds.

Neither release candidate nor final release now hard-codes the old Vercel connectivity-test page. RC reads `SBP_PADEL_RC_PLAYER_URL`; final release reads `SBP_PADEL_PLAYER_URL`. Android CI refuses the old connectivity-test domains and refuses non-HTTPS RC targets. If no genuine staging Player URL is configured, it builds/uploads only the debug APK and deliberately skips the RC artifact. When RC is enabled, CI verifies the release-candidate APK, minification mapping and cleartext-disabled manifest state.

The disposable development signing key remains acceptable only for debug/RC UAT. The final SBP release key remains outside Git under SBP custody.

## Vercel staging facts

The connected Vercel team currently contains only the earlier `sbp-padel-live-preview` connectivity-test project. It is not the SBP-Padel application and must not be reported or used as the application staging URL.

Repository preparation exists for separate API, Player and optional Admin Vercel projects. FastAPI remains Python and does not need to be rewritten into JavaScript merely for Vercel.

A genuine staging deployment is currently blocked by resources that the connected Vercel tool surface cannot create/configure in this workspace:

- import/create the real SBP-Padel Vercel project(s) with the appropriate repository root(s);
- provision a persistent PostgreSQL staging database;
- set the real staging environment variables/secrets (`DATABASE_URL`, strong `JWT_SECRET`, exact HTTPS `CORS_ORIGINS`, exact `TRUSTED_HOSTS`, plus Redis/SMTP when used);
- run Alembic migrations against that database;
- configure the Player API origin;
- then set `SBP_PADEL_RC_PLAYER_URL` to the genuine HTTPS Player staging origin and build the RC.

Do not introduce real PayZen credentials into this experimental environment until the official provider contract and intentional PayZen UAT scope exist.

## Remaining security findings / follow-up

1. Player bearer-token persistence still uses browser `localStorage` across multiple accepted static Player modules. Replacing it safely with an HttpOnly cookie/BFF model, or otherwise removing script-readable persistent bearer storage, requires an intentional authentication-transport pass because a piecemeal change would break accepted Player/Android flows. Treat this as a remaining browser-session hardening item.
2. Full reproducible dependency locking is not yet complete. Admin direct dependencies are exact-pinned and audits are green, but the repository currently does not commit the CI-generated `admin/package-lock.json`; backend Python dependencies are bounded in `pyproject.toml` rather than represented by a committed fully resolved lock/constraints file. This remains a supply-chain hardening item.
3. Facility images are database-backed data URLs. This is persistent for current staging semantics and avoids Vercel ephemeral-filesystem loss, but object/blob storage remains recommended before image volume grows materially.
4. For horizontally scaled/serverless staging, use shared Redis with `REDIS_REQUIRED=true` so distributed slot-lock/rate-limit coordination does not silently fall back to process-local state.
5. Final HSTS/TLS policy remains an HTTPS-edge deployment responsibility.

## External blockers that remain authoritative

- PITB/PayZen: official endpoints/methods, PSID-generation contract, schemas, callback authentication and acknowledgement, inquiry/status semantics, expiry rules, UAT credentials/service IDs, Client API meaning, VPN/OTI/IP whitelisting, settlement/reconciliation and go-live requirements.
- PITB hosting: whether externally developed departmental apps are accepted; VM/container/Kubernetes model; Python/FastAPI and Node/Next.js support; PostgreSQL/Redis/SMTP/DNS/SSL; VPN/OTI/static network identity; VAPT/security review; source-code handover; PayZen connectivity; Android distribution/signing responsibility.
- Staging infrastructure: real Vercel projects, persistent PostgreSQL and secret/environment configuration as listed above.

Do not mark PayZen production integration, real Vercel staging, or Android RC distribution complete until their respective runtime/credential prerequisites are actually present and tested.

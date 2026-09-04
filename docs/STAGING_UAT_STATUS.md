# SBP-Padel live staging UAT status

Last verified: 4 September 2026.

This file records runtime/UAT evidence only. `docs/STAGING_DEPLOYMENT.md` remains the deployment runbook and PayZen/PITB production decisions remain external.

## Canonical staging

- API: `https://sbp-padel-api-staging.vercel.app`
- Player entry: `https://sbp-padel-player-staging.vercel.app/staging-entry.html`
- Admin: `https://sbp-padel-admin-staging.vercel.app`
- Neon database: `sbp_padel_staging` in project `SBP-Padel Staging`

Staging reference data is intentionally limited to Nishtar Park Sports Complex, five courts, reference pricing bands and policy version `2026-staging-uat-1`. The guarded reference bootstrap creates no users/passwords and refuses non-staging environments.

## Proven live browser/authentication state

`Staging Auth Smoke` run `33843390933` on head `edd36b560221a00faa64a3ffc91105ab271dec37` completed **success**.

It proved over the canonical public HTTPS deployments:

1. ephemeral HQ admin creation with generated masked credentials;
2. live admin login and protected HQ APIs;
3. ephemeral Player registration/authenticated identity and active staging policy;
4. deployed Player staging bootstrap binds the canonical staging API;
5. deployed Player UI login succeeds, persists an access token and hydrates Nishtar Park/court data from the live API;
6. deployed Admin Operations sign-in succeeds and loads the staging venue;
7. deployed HQ sign-in succeeds, renders Central Dashboard and live court totals, and receives the live `/admin/dashboard` response;
8. temporary admin/player accounts are deleted after the test;
9. deleted credentials are verified to return 401 afterward.

Security CI run `33843390871` for the same head also completed **success**.

The browser harness intentionally treats `net::ERR_ABORTED` requests caused by deliberate page navigation as browser cancellation rather than a network failure, while page errors, console errors and other failed requests remain hard failures. Admin navigation waits for Next.js client hydration before interacting so CI does not click an SSR form before handlers are attached.

Earlier browser-smoke failures on 3/4 September were test-contract/race defects, not evidence of broken live Player hydration: diagnostics showed successful Player login plus live `/venues`, venue-detail and availability responses, and later showed the HQ dashboard itself healthy. Those false assumptions were corrected rather than weakening application behavior.

## Already-proven deployment/Android state

The guarded Vercel staging pipeline has previously completed end to end, including Neon/Alembic checks, API health, Player/Admin security headers and Android RC dispatch. A genuine `1.0.0-rc1` APK was produced and its release-candidate manifest security checks passed. See `docs/STAGING_DEPLOYMENT.md` for the exact deployment and Android workflow/artifact evidence.

## Remaining UAT / external blockers

Automated live staging now covers infrastructure, auth, reference-data hydration and the main Player/Admin/HQ entry surfaces. Still required before production acceptance:

- controlled staging booking lifecycle/slot-locking/cancellation/reschedule/pass/check-in UAT where compatible with the deliberately unconfigured payment provider;
- real-device Android RC product UAT;
- SMTP staging configuration before password-recovery delivery can be accepted;
- official PayZen API/onboarding/UAT material before any real payment traffic;
- PITB/government production hosting/network/security decision;
- SBP-controlled Android production signing/distribution.

Do not introduce permanent demo credentials merely to simplify UAT. Continue using generated ephemeral accounts with unconditional cleanup for automated live tests.

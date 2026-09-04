# SBP-Padel live staging UAT status

Last verified: 4 September 2026.

This file records runtime/UAT evidence only. `docs/STAGING_DEPLOYMENT.md` remains the deployment runbook and PayZen/PITB production decisions remain external.

## Canonical staging

- API: `https://sbp-padel-api-staging.vercel.app`
- Player entry: `https://sbp-padel-player-staging.vercel.app/staging-entry.html`
- Admin: `https://sbp-padel-admin-staging.vercel.app`
- Neon database: `sbp_padel_staging` in project `SBP-Padel Staging`

Staging reference data is intentionally limited to Nishtar Park Sports Complex, five courts, reference pricing bands and policy version `2026-staging-uat-1`. The guarded reference bootstrap creates no users/passwords and refuses non-staging environments.

## Proven live browser/authentication and booking state

`Staging Auth Smoke` run `33844787329` on head `4ef39732edfad5855c8c3e7f7bd2aa6e80c57c0c` completed **success**.

It proved over the canonical public HTTPS deployments and staging Neon database:

1. ephemeral HQ admin creation with generated masked credentials;
2. live admin login and protected HQ APIs;
3. ephemeral Player registration/authenticated identity and active staging policy;
4. a real future Player quote can be obtained from the deployed API;
5. a real pending-payment booking can be created and its selected slot becomes unavailable;
6. the new booking appears in authenticated `My Bookings` and its persisted status is `pending_payment`;
7. cancelling that unpaid booking succeeds without creating a refund;
8. the cancelled booking releases the slot and the same slot becomes available again;
9. deployed Player staging bootstrap binds the canonical staging API;
10. deployed Player UI login succeeds, persists an access token and hydrates Nishtar Park/court data from the live API;
11. deployed Admin Operations sign-in succeeds and loads the staging venue;
12. deployed HQ sign-in succeeds, renders Central Dashboard and live court totals, and receives the live `/admin/dashboard` response;
13. temporary admin/player accounts and their unpaid booking fixtures are deleted after the test;
14. deleted credentials are verified to return 401 afterward.

The lifecycle harness reported: `Live staging booking lifecycle passed for 2026-09-07: quote -> hold -> booking history -> cancellation -> slot release.` The deployed browser harness reported: `Deployed Player, Admin operations and HQ browser smoke passed.`

The ephemeral cleanup helper is deliberately conservative: it operates only in `ENVIRONMENT=staging`, only for generated `@sbp-padel-uat.invalid` accounts with the explicit UAT confirmation flag, refuses to remove an account that has payment records, and removes only its unpaid booking fixtures before deleting the account.

The browser harness intentionally treats `net::ERR_ABORTED` requests caused by deliberate page navigation as browser cancellation rather than a network failure, while page errors, console errors and other failed requests remain hard failures. Admin navigation waits for Next.js client hydration before interacting so CI does not click an SSR form before handlers are attached.

Earlier browser-smoke failures on 3/4 September were test-contract/race defects, not evidence of broken live Player hydration: diagnostics showed successful Player login plus live `/venues`, venue-detail and availability responses, and later showed the HQ dashboard itself healthy. Those false assumptions were corrected rather than weakening application behavior.

## Already-proven deployment/Android state

The guarded Vercel staging pipeline has previously completed end to end, including Neon/Alembic checks, API health, Player/Admin security headers and Android RC dispatch. A genuine `1.0.0-rc1` APK was produced and its release-candidate manifest security checks passed. See `docs/STAGING_DEPLOYMENT.md` for the exact deployment and Android workflow/artifact evidence.

## Remaining UAT / external blockers

Automated live staging now covers infrastructure, authentication, reference-data hydration, the main Player/Admin/HQ entry surfaces, and the unpaid booking hold/cancellation/slot-release lifecycle. Still required before production acceptance:

- paid/confirmed booking, refund, reschedule, pass and check-in live UAT once a real PayZen-compatible staging payment path exists; do not use the development-only payment simulator in staging;
- real-device Android RC product UAT;
- SMTP staging configuration before password-recovery delivery can be accepted;
- official PayZen API/onboarding/UAT material before any real payment traffic;
- PITB/government production hosting/network/security decision;
- SBP-controlled Android production signing/distribution.

Do not introduce permanent demo credentials merely to simplify UAT. Continue using generated ephemeral accounts with unconditional cleanup for automated live tests.

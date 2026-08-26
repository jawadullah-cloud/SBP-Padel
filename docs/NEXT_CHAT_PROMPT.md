# SBP-Padel — Next Chat Handoff Prompt

Continue `jawadullah-cloud/SBP-Padel` on `backend-v1-dev`. Inspect HEAD, read this file, `docs/PROJECT_MEMORY.md`, `docs/LAUNCH_READINESS.md`, `docs/PAYZEN_INTEGRATION.md` and `docs/REPOSITORY_MAINTENANCE.md`, inspect relevant implementation/recent commits, and treat repository/runtime/CI as source of truth.

## Current accepted state — 27 Aug 2026
Player discovery/location/gallery, booking lifecycle, six-day date rail + More+, the latest HQ / Venue Directory / Venue Management pass, and the reviewed Venue Manager / Operator console are manually accepted unless a new regression is reproduced.

Accepted operations behavior now includes persistent sidebar navigation on Players and Scan Pass, return to the authenticated console without login flash, multi-venue stale-response protection, manager/operator permission boundaries, Change Password, rescheduled-booking QR/check-in, closure safety, manager/admin rescheduling and cancellation of active bookings, and manager-only refund management.

HQ staff credential management is canonical at `/hq/staff`. Reset Password, generated/manual temporary passwords, Show/Hide, Generate, Copy, Disable/Reactivate and safe Delete must remain available there. Old `/hq?tab=staff` navigation resolves to the canonical page rather than exposing an incomplete duplicate Staff UI.

## Player Home / bottom-navigation stability
An intermittent player bug was reproduced where Home looked visible but did not accept taps while the bottom navigation still worked. The cause was stale inline interaction state on an inactive bottom-tab screen (`Home`, `Bookings`, `Courts/Venues`, or `Profile`) combined with deep-route cleanup ordering. An invisible inactive screen could retain `pointer-events:auto` and sit over Home. Calling deep-route cleanup before the destination screen became active could also restore interaction to the screen being left.

Current invariant:
- `docs/main-navigation-hardening.js` wraps `SBPNavigate` only for persistent bottom-tab destinations: `home`, `bookings`, `venues`, `profile`.
- Normal `SBPNavigate(target)` runs first.
- Recovery runs after the destination is active.
- The destination gets active pointer/touch scrolling state.
- Other bottom-tab screens have stale inline pointer/touch values cleared so normal inactive-screen CSS (`pointer-events:none`) owns them again.
- Any stale deep-route layer is closed only after the destination screen is active.
- Booking-flow screens such as select/time/review/confirm/pass are deliberately not reset by this guard; their existing transition choreography remains authoritative.

`qa/player_navigation_recovery_browser.mjs` deliberately corrupts Home/deep-route interaction state and verifies recovery. Player Flow CI also retains the existing native Review 5→4→3→4→5 stress navigation, booking lifecycle, account and theme suites. Do not weaken these guards.

## Staff-side booking changes — accepted on surface
Venue manager/admin can open an active confirmed/rescheduled booking and use **Reschedule Booking**. Staff may move a booking even inside the player's normal 12-hour self-service cutoff, which is required for operational closures/maintenance. The replacement must currently have the same total price; price-adjusted staff rescheduling is intentionally not implemented yet. Player notification is generated and the booking remains the same booking with status `rescheduled` rather than creating a duplicate.

Venue manager/admin can also cancel an active operational booking. Venue cancellation releases the slots, marks the booking `venue_cancelled`, notifies the player and creates a refund request for a paid booking. Operators remain unable to cancel or process refunds. Manager-only Refund Management exposes the detailed venue refund decision workflow; HQ retains province-wide refund governance.

Backend regression `backend/tests/test_operations_staff_reschedule_release.py` explicitly proves availability integrity: after staff reschedule, the original slot becomes available again and the replacement slot becomes unavailable with reason `Booked`. Cancellation/refund role and slot-release behavior also has targeted backend/Admin QA.

## Closure / maintenance safety — accepted
Do not silently strand active bookings:
- creating a venue/court closure that overlaps pending-payment, confirmed or rescheduled bookings is refused;
- changing a court to Maintenance/Closed is refused while current/future active bookings conflict;
- HQ venue deactivation is refused while current/future active bookings conflict;
- staff must reschedule or cancel affected bookings first.

Automatic cancellation/refund is intentionally not performed by a closure action.

## Operations utility routes — accepted
Players and Scan Pass remain dedicated routes but must display one complete canonical venue-operations sidebar. Their operations/back links restore the authenticated console state rather than causing a login flash. Do not restore the old utility-page mini menus above the operations navigation. `admin/tests/operations.spec.ts` covers these routes together with blank staff-login credentials, stale multi-venue response rejection, role-scoped controls, My Account visibility and venue-switch state clearing.

## Rescheduled booking check-in — accepted
A paid booking with status `rescheduled` is an active booking. Both operations check-in and pass/QR validation accept `confirmed` and `rescheduled`. Targeted backend regression covers pay → reschedule → replacement-date pass validation → operator check-in.

Cancelled bookings must never retain a usable pass. Past/completed/cancelled booking detail must not expose inappropriate Cancel/Reschedule/Pass actions, including a first-paint flash before hydration.

## Player booking date rail / mobile scroll — accepted
The quick booking rail must show exactly six dates plus a seventh **More +** control on one row. `booking-date-more.js` uses `quick.slice(6)`. Player Flow CI guards this so seven quick dates plus More cannot silently wrap onto a second line again.

Android Date/Court and Time/slot screens are explicit owners in the mobile touch-scroll fallback. Locked Player QA uses real touch swipes, not only programmatic `scrollTop`, so those screens must remain vertically scrollable in the WebView.

Profile → My Bookings must activate/refresh the bookings data loader regardless of entry path and must not remain on `Loading your bookings...`.

## Player authentication UI invariant
Google sign-in remains deferred and must not be advertised until a real Google authentication flow is intentionally implemented and accepted. Password/email/mobile authentication and recovery remain active. Player Flow CI fails if `Continue with Google` reappears in `docs/auth-preview.html`.

Already-authenticated Android/player cold start shows the branded splash without Sign In/Create Account, then enters the app. Logged-out users retain the auth actions.

## Venue-context routing — accepted
The current route UUID is authoritative:
- `/hq/provisioning/profile?venue=<id>` edits exactly `<id>`.
- Back to Venue Management targets `/hq/provisioning/manage?venue=<same-id>`.
- Venue Directory Manage/Edit and Facility Photos navigation preserve each card's exact venue ID.
- All Venues returns to `/hq/provisioning` without inventing a venue context.

`admin/tests/venue-context.spec.ts` covers two distinct venues and must fail on any cross-venue fallback.

## HQ staff credentials and account security — accepted
`/hq/staff` retains generated/manual temporary passwords, Show/Hide, Generate, Copy, post-create visibility, HQ Reset Password, Disable/Reactivate/Delete and safe-delete rules. Inactive staff cannot authenticate.

Authenticated HQ admins, venue managers and venue operators can use **My Account → Change Password** via `POST /auth/change-password`. Backend QA verifies wrong current password rejection, policy rejection, successful change, old-password login failure, new-password login success and later independent HQ admin reset.

## Persistent HQ navigation / venue actions — accepted
Dedicated HQ routes retain Overview, Bookings, Staff, Policies, Refunds, Venue Directory, Reports, Finance and Activity Trail. Venue Directory/Venue Management/Facility Photos action alignment is accepted. Do not reintroduce floating/stacked profile/gallery actions.

HQ → Finance & Reconciliation owns the persisted checkout service fee. The fee is not a hard-coded player UI constant. New quotes/bookings use the latest persisted HQ value, while each existing booking retains the service-fee snapshot captured when it was created. Front-desk booking must follow the same persisted fee source even in multi-worker deployments.

## Player discovery/location/gallery — accepted
- `discovery-tools.js` owns Find Your Court search/filter UI.
- Android native Fused Location Provider is primary; WebView geolocation is fallback.
- Accepted Android wrapper: `0.12-debug`, versionCode 12.
- Near Me means active venues within 15 km only, sorted by distance.
- Next Available uses real availability within the same 15 km radius when location exists.
- Facility Photos supports up to 12 images; cover images propagate across accepted player surfaces.

## Booking policy
Player cancellation/rescheduling cutoff remains 12 hours before the first slot, with started/checked-in bookings blocked. Eligible paid cancellation creates a refund request. Player and staff rescheduling currently require the replacement total to equal the existing booking total. Staff operational rescheduling may bypass the player's 12-hour cutoff but still must preserve availability and financial integrity.

## Payment provider direction — PayZen likely, integration not yet activated
The department is likely to use PITB PayZen. Read `docs/PAYZEN_INTEGRATION.md` before payment work. Public information indicates a PSID/1Bill-oriented government payment model with multiple payment channels, but the production implementation must wait for the department's authoritative PayZen onboarding pack, credentials, service IDs, sandbox/production URLs, callback authentication, status codes, settlement/reconciliation and refund/reversal rules.

Do not invent private PayZen endpoints or signatures from public examples.

The backend payment boundary is provider-oriented:
- `/payments/initiate` calls `backend/app/payments/providers.py` instead of manually creating an `unconfigured` provider row;
- provider reference (expected to accommodate PSID), optional redirect URL, client payload and provider metadata are persisted/returned;
- repeating initiation for the same pending booking returns the existing payment and must not generate a duplicate provider bill/PSID;
- provider callback authentication/parsing is normalized through the provider abstraction;
- verified `paid` confirms only when the booking can still safely own its held inventory;
- a late verified payment after hold expiry records receipt but must not resurrect/reclaim the slot and enters refund/reconciliation instead;
- verified `failed` moves a still-pending booking to payment-failed and releases held inventory;
- duplicate verified callbacks are idempotent;
- the development simulator remains development-only;
- client return/success pages are never authoritative proof of payment.

### Player configured-provider regression — green 27 Aug 2026
`docs/payment-methods-live.js` is loaded on `payment.html` by both the development injector and the production service-worker runtime. It capture-intercepts `#payButton` so the provider-aware checkout path owns the tap ahead of the older `review-entry.js` development handler.

The configured-provider Player regression initially timed out waiting for `#providerAwaiting`. Runtime diagnostics proved the provider script was loaded and active. The actual blocker was an incomplete test mock: `booking-participants-live.js` wraps successful booking creation and waits for `PUT /bookings/{booking_id}/participants`, but the provider test had not mocked that established request. Checkout therefore correctly stopped before `/payments/initiate`.

`qa/player_provider_payment_browser.mjs` now follows the real runtime contract and proves:
- booking participant persistence occurs;
- configured `/payments/initiate` returns provider metadata/reference without invoking the development simulator;
- provider PSID/reference is shown with Copy UI;
- Check Status/polling remains waiting until backend payment/booking state is verified;
- a provider redirect/reference is not treated as proof of payment;
- verified backend `paid` + confirmed booking state is required before success navigation;
- already-confirmed booking recovery does not create a duplicate booking or initiate another payment.

Player Flow CI run **401** completed green at commit `cede06ddceb4fa429055a524f4c280949dcb8ce4`, including all established Player browser suites plus this configured-provider regression. Backend CI run **255** for `be9f113caa331d05fc2be77e4e2c3939e4e28d93` (`Lock failed payment callback slot release`) also completed green. Later work in this handoff only touched Player QA/documentation, not backend behavior.

Exact PayZen callback/reconciliation/refund execution still depends on official PITB documentation and credentials.

## Production-readiness hardening — implemented 26 Aug 2026
Read `docs/LAUNCH_READINESS.md` and `docs/STAGING_DEPLOYMENT.md` before deployment work.

The backend fails fast outside development/test unless core deployment configuration is safe: strong explicit JWT secret, PostgreSQL database URL, explicit HTTPS/non-local CORS origins, explicit trusted hosts, and Redis URL when Redis is required. Production additionally requires SMTP host/from configuration. `backend/.env.production.example` is the non-secret checklist and `backend/scripts/production_preflight.py` is the deployment preflight command.

Migration history is deliberately frozen: Alembic revision `20260823_0001` has an explicit baseline table list rather than creating whatever happens to exist in current ORM metadata. Future model additions must be new revisions. Backend CI runs a fresh PostgreSQL `alembic upgrade head`, `alembic current` and `alembic check` in addition to the full backend tests.

Deployment probes are `/health/live` and `/health/ready`; readiness checks the database and required Redis.

Admin direct dependencies are pinned to the approved security-patched line. Admin Portal CI blocks on high-severity `npm audit` findings before build/browser QA.

Android debug signing remains intentionally separate from release signing. `dev-signing-key.b64` is a deliberately public/disposable stable-debug fixture so CI/local debug APKs remain upgrade-compatible; it is not a production secret. Gradle applies it only to `debug`, while `release` has no repository signing configuration. Real release keys must remain outside Git and under SBP custody. See `android/RELEASE_SIGNING.md`.

## Repository maintenance state
Read `docs/REPOSITORY_MAINTENANCE.md` before cleanup work.

The remote branch set is intentionally reduced to exactly three branches:
- `backend-v1-dev` — current development source of truth;
- `main` — release/Pages branch, intentionally behind until accepted for release;
- `ui-preview` — retained archive of unique early prototype history.

The previously verified redundant `tmp-visual-assets-staging`, `pages-fix`, and `visual-system-implementation*` remote branches were removed and local remote-tracking refs were pruned. Both `main` and `backend-v1-dev` remain unprotected because the connected mutation surface does not expose protection/ruleset writes. Do not falsely report protection as configured.

Proven-dead HQ bridges `HQHomeRouteBridge.tsx` and `HQVenueEditShortcut.tsx` have been removed. Do not over-clean player/runtime bridge files merely because their names look old; many still own accepted WebView/navigation/service-worker behavior.

### Remaining external decisions/blockers
PayZen is the likely online payment direction, but production integration still requires the official departmental API/onboarding material, credentials and UAT. Other external choices still required are the production PostgreSQL/hosting and backup architecture, final domains/HTTPS/CORS/trusted hosts, SMTP provider/credentials, SBP-controlled Android release key/distribution, and optional object storage before image scale grows.

Do not choose these vendor/business decisions implicitly during unrelated work.

## Verification discipline
Distinguish implementation, green CI and manual acceptance. Treat repository and actual runtime behavior as source of truth. When the user reports a visible runtime discrepancy, inspect the effective loading path before layering more fixes. Preserve the locked regressions in `docs/REGRESSION_LOCKS_20260826.md` and the dedicated browser/backend tests added for previously accepted flows.

The repository currently has no root `AGENTS.md`; do not assume one exists. If it is added later, read and follow it before changes.

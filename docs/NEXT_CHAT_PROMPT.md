# SBP-Padel — Next Chat Handoff Prompt

Continue `jawadullah-cloud/SBP-Padel` on `backend-v1-dev`. Inspect HEAD, read this file, `docs/PROJECT_MEMORY.md` and `docs/LAUNCH_READINESS.md`, inspect relevant implementation/recent commits, and treat repository/runtime/CI as source of truth.

## Current accepted state — 26 Aug 2026
Player discovery/location/gallery, booking lifecycle, six-day date rail + More+, the latest HQ / Venue Directory / Venue Management pass, and the reviewed Venue Manager / Operator console are manually accepted unless a new regression is reproduced.

Accepted operations behavior now includes persistent sidebar navigation on Players and Scan Pass, return to the authenticated console without login flash, multi-venue stale-response protection, manager/operator permission boundaries, Change Password, rescheduled-booking QR/check-in, closure safety, and manager/admin rescheduling of active bookings.

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

## Staff-side booking reschedule — accepted on surface
Venue manager/admin can open an active confirmed/rescheduled booking and use **Reschedule Booking**. Staff may move a booking even inside the player's normal 12-hour self-service cutoff, which is required for operational closures/maintenance. The replacement must currently have the same total price; price-adjusted staff rescheduling is intentionally not implemented yet. Player notification is generated and the booking remains the same booking with status `rescheduled` rather than creating a duplicate.

Backend regression `backend/tests/test_operations_staff_reschedule_release.py` explicitly proves availability integrity: after staff reschedule, the original slot becomes available again and the replacement slot becomes unavailable with reason `Booked`.

## Closure / maintenance safety — accepted
Do not silently strand active bookings:
- creating a venue/court closure that overlaps pending-payment, confirmed or rescheduled bookings is refused;
- changing a court to Maintenance/Closed is refused while current/future active bookings conflict;
- HQ venue deactivation is refused while current/future active bookings conflict;
- staff must reschedule or cancel affected bookings first.

Automatic cancellation/refund is intentionally not performed by a closure action.

## Operations utility routes — accepted
Players and Scan Pass remain dedicated routes but must display the complete venue-operations sidebar. Their operations/back links restore the authenticated console state rather than causing a login flash. `admin/tests/operations.spec.ts` covers these routes together with blank staff-login credentials, stale multi-venue response rejection, role-scoped controls, My Account visibility and venue-switch state clearing.

## Rescheduled booking check-in — accepted
A paid booking with status `rescheduled` is an active booking. Both operations check-in and pass/QR validation accept `confirmed` and `rescheduled`. Targeted backend regression covers pay → reschedule → replacement-date pass validation → operator check-in.

## Player booking date rail — accepted
The quick booking rail must show exactly six dates plus a seventh **More +** control on one row. `booking-date-more.js` uses `quick.slice(6)`. Player Flow CI guards this so seven quick dates plus More cannot silently wrap onto a second line again.

## Player authentication UI invariant
Google sign-in remains deferred and must not be advertised until a real Google authentication flow is intentionally implemented and accepted. Password/email/mobile authentication and recovery remain active. Player Flow CI fails if `Continue with Google` reappears in `docs/auth-preview.html`.

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

## Player discovery/location/gallery — accepted
- `discovery-tools.js` owns Find Your Court search/filter UI.
- Android native Fused Location Provider is primary; WebView geolocation is fallback.
- Accepted Android wrapper: `0.12-debug`, versionCode 12.
- Near Me means active venues within 15 km only, sorted by distance.
- Next Available uses real availability within the same 15 km radius when location exists.
- Facility Photos supports up to 12 images; cover images propagate across accepted player surfaces.

## Booking policy
Player cancellation/rescheduling cutoff remains 12 hours before the first slot, with started/checked-in bookings blocked. Eligible paid cancellation creates a refund request. Player and staff rescheduling currently require the replacement total to equal the existing booking total. Staff operational rescheduling may bypass the player's 12-hour cutoff but still must preserve availability and financial integrity.

## Production readiness
Read `docs/LAUNCH_READINESS.md` before calling the system production-ready. Major remaining decisions/blockers include real online payment provider + callbacks/idempotency/reconciliation/refunds, production database/migrations/backups, domains/HTTPS/CORS, SMTP, production secrets, Android release signing/distribution and optional object storage before facility-image scale grows.

The backend refuses to start outside development/test with the repository default JWT secret. Do not weaken this protection. Admin dependency audit warnings should be handled as a separate dependency-maintenance task rather than mixed into unrelated functional fixes.

## Verification discipline
Distinguish implementation, green CI and manual acceptance. Treat repository and actual runtime behavior as source of truth. When the user reports a visible runtime discrepancy, inspect the effective loading path before layering more fixes.

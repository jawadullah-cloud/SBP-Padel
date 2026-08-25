# SBP-Padel — Next Chat Handoff Prompt

Continue `jawadullah-cloud/SBP-Padel` on `backend-v1-dev`. Inspect HEAD, read this file, `docs/PROJECT_MEMORY.md` and `docs/LAUNCH_READINESS.md`, inspect relevant implementation/recent commits, and treat repository/runtime/CI as source of truth.

## Current accepted state — 26 Aug 2026
Player discovery/location/gallery and the previously reviewed booking lifecycle are manually accepted. The latest HQ / Venue Directory / Venue Management pass is also manually accepted, including persistent HQ navigation, editable venue profiles and amenities, facility gallery, staff credential/lifecycle controls, manager/operator Change Password visibility, venue-action alignment and exact venue-context navigation. Do not reopen accepted behavior without a reproduced regression.

## Unattended Venue Manager / Operator hardening — ready for manual review
After the accepted HQ pass, an unattended operations review found and corrected objective consistency/safety issues without redesigning the accepted operations UI.

### Rescheduled booking check-in
A paid booking with status `rescheduled` is an active booking. Previously the operations UI offered check-in for it while the backend check-in/pass validator accepted only `confirmed`, so a legitimately rescheduled player could be rejected at the venue.

Now:
- `backend/app/api/operations.py` allows check-in for `confirmed` and `rescheduled`.
- `backend/app/api/operations_passes.py` validates both statuses as active paid passes.
- `backend/tests/test_operations_rescheduled_checkin.py` covers player booking → payment → reschedule → pass validation on the replacement date → operator check-in → operations feed confirmation.

Preserve this invariant.

### Multi-venue operations context
The operations console can serve staff assigned to more than one venue. The selected venue is now authoritative:
- late API responses from a previously selected venue are discarded instead of overwriting current venue data;
- switching venue clears venue-scoped selections/state including selected booking, player search/selection, booking court/slots/quote/payment reference/policy acknowledgement, availability, closure court and pricing court;
- manager/operator role controls are reevaluated against the newly selected venue;
- the staff login form no longer embeds/prefills the development manager password or email.

`admin/tests/operations.spec.ts` provides browser regression coverage for blank login credentials, delayed stale-response rejection, operator read-only controls, My Account visibility and front-desk state clearing across venue switches. Keep it in Admin Portal CI.

These operations hardening changes are implementation/CI state until manually reviewed on the running UI.

## Player authentication UI invariant
Google sign-in remains deferred and must not be advertised on the player login screen until a real Google authentication flow is intentionally implemented and accepted. Password/email/mobile authentication and password recovery remain the active player authentication UI.

`docs/GOOGLE_SIGNIN.md` now explicitly documents the integration as deferred. Player Flow CI contains a guard that fails if `Continue with Google` returns to `docs/auth-preview.html`.

## Production readiness
Read `docs/LAUNCH_READINESS.md` before calling the system production-ready. Major remaining production decisions/blockers include:
- real online player payment provider and provider callbacks/idempotency/reconciliation/refund execution;
- production database, migrations, backups and recovery;
- production domains/HTTPS/CORS;
- SMTP for real password-reset delivery;
- production secrets and environment configuration;
- Android release signing/distribution;
- optional object storage migration before facility-image scale grows.

The backend now refuses to start outside `development`/`test` if the repository default `JWT_SECRET` is still in use. Do not weaken this protection.

Google sign-in is intentionally deferred and is not itself a launch blocker unless product scope changes.

## Venue-context routing — accepted
The route UUID is authoritative:
- `/hq/provisioning/profile?venue=<id>` edits exactly `<id>`.
- Back to Venue Management targets `/hq/provisioning/manage?venue=<same-id>`.
- Venue Directory Manage/Edit actions preserve each card's exact ID.
- Venue Management → Facility Photos and gallery → Venue Management preserve the same ID.
- All Venues returns to `/hq/provisioning` without inventing venue context.

`admin/tests/venue-context.spec.ts` covers two distinct venue IDs and must remain in Admin Portal CI.

## HQ staff credentials and self-service account security — accepted baseline
Staff management remains at `/hq/staff`. Generated temporary passwords, Show/Hide, Generate, Copy, post-create visibility, HQ Reset Password, Disable/Reactivate/Delete and safe-delete rules remain accepted behavior.

Authenticated HQ admins, venue managers and venue operators use **My Account → Change Password** via `POST /auth/change-password`. Backend QA verifies wrong-current rejection, password-policy rejection, successful manager/operator changes, old-password login failure, new-password login success and subsequent separate HQ admin reset.

## Persistent HQ navigation and venue action alignment — accepted
Dedicated HQ routes retain Overview, Bookings, Staff, Policies, Refunds, Venue Directory, Reports, Finance and Activity Trail. Bookings/Policies/Refunds return through HQ `?tab=` routing. Venue Directory/Venue Management/Facility Photos action alignment is accepted; do not reintroduce floating/stacked controls.

## Player discovery/location/gallery — accepted
- `discovery-tools.js` owns Find Your Court. Search is live; All/Near Me are visible; city choices come from active venues.
- Android native Fused Location Provider is primary; WebView geolocation is fallback.
- Current accepted Android wrapper is `0.12-debug` / versionCode 12.
- Near Me = active venues within 15 km only, sorted by distance.
- Next Available = real availability within the same 15 km radius when location is available.
- Facility Photos supports up to 12 images, captions, cover, reorder and delete; cover images propagate across accepted player surfaces.

## Booking policy and HQ review screens
Player cancellation/rescheduling cutoff remains 12 hours before first slot. HQ Refunds and HQ Bookings remain compact/collapsible with detailed decision/context views and semantic status colors.

## Suggested morning review
1. Pull/restart backend and admin frontend.
2. Log in as a venue manager and confirm the operations login is blank rather than prefilled.
3. Review Court Schedule, Bookings, New Booking, Payments & Refunds, Bookable Hours & Pricing, Closures, Courts and Reports.
4. If the manager has multiple assigned venues, switch between them while moving through New Booking and confirm no player/court/slot state carries to the next venue.
5. Log in as an operator and confirm Pricing/Closures/Courts are view-only while booking/search/check-in remain usable.
6. If convenient, exercise My Account → Change Password with a disposable staff account; backend behavior is already regression-tested.
7. For a rescheduled paid booking, confirm the operations UI/QR flow permits check-in on the replacement date.

## Verification discipline
Distinguish implementation, green CI and manual acceptance. Treat repository and actual runtime as source of truth. Do not call the unattended operations hardening manually accepted until it has been reviewed on the running console.

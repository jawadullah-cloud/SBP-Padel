# SBP-Padel — Next Chat Handoff Prompt

Continue `jawadullah-cloud/SBP-Padel` on `backend-v1-dev`. Inspect HEAD, read this file and `docs/PROJECT_MEMORY.md`, inspect relevant implementation/recent commits, and treat repository/runtime/CI as source of truth.

## Current accepted state — 26 Aug 2026
Player discovery/location/gallery and the previously reviewed booking lifecycle are manually accepted. The latest HQ / Venue Directory / Venue Management pass is also generally manually accepted, including persistent HQ navigation, editable venue profiles and amenities, facility gallery, staff credential/lifecycle controls, manager/operator Change Password visibility, and the venue-action alignment pass. Do not reopen accepted behavior without a reproduced regression.

## Venue-context routing fix — completed
A cross-venue navigation bug was found in **HQ → Venue Directory → Edit Profile & Amenities → Back to Venue Management**. The profile editor previously derived its venue context from client-side URL parsing/local component state, which could leave stale context when route query state changed.

The profile route now resolves `searchParams.venue` at the Next.js route boundary and passes that exact venue UUID into the client editor. The route UUID is authoritative. Do not choose the first venue, a previously selected venue or stale local state.

Required invariant:
- `/hq/provisioning/profile?venue=<id>` edits exactly `<id>`.
- **Back to Venue Management** always links to `/hq/provisioning/manage?venue=<same-id>`.
- Venue Directory **Manage Venue** and **Edit Profile & Amenities** keep each card's exact venue ID.
- Venue Management → **Facility Photos** and gallery → **Venue Management** preserve the same venue ID.
- **All Venues** returns to `/hq/provisioning` without inventing a venue context.

`admin/tests/venue-context.spec.ts` provides targeted browser regression coverage with two distinct venue IDs representing Multan and Rawalpindi. It traverses Directory → Profile → Manage → Gallery for both and must fail if one venue ever returns to the other venue's context. Admin Portal CI now runs this test together with the existing scan-pass runtime QA.

### Editable venue profiles and amenities
Venue information is not create-once. HQ exposes `/hq/provisioning/profile?venue=<id>` and `PATCH /admin/venues/{venue_id}`. Admin can correct name, city, address, description, latitude/longitude, opening/closing hours and amenities. Common amenities and custom amenities are supported. Profile edits must preserve courts, bookings, pricing, staff assignments, gallery and history. Coordinate changes intentionally affect Near Me/Next Available.

The earlier globally floated **Edit Venue Profile & Amenities** shortcut remains removed. Do not reintroduce it as a floating global control.

### HQ staff credentials and self-service account security
Staff management remains at `/hq/staff`. Generated temporary passwords, Show/Hide, Generate, Copy, post-create visibility, HQ Reset Password, Disable/Reactivate/Delete and safe-delete rules remain accepted behavior.

Authenticated HQ admins, venue managers and venue operators use **My Account → Change Password** via `POST /auth/change-password`. The backend requires the current password, applies the shared password policy, rejects reuse of the current password and stores only the replacement hash. HQ admin reset via `PATCH /admin/staff/{user_id}/password` remains a separate recovery/admin path.

Targeted backend QA explicitly verifies manager and operator accounts: wrong-current rejection, weak-password rejection, successful self-service update, old password no longer authenticating, new password authenticating, and a later separate HQ admin reset succeeding. The user has not manually exercised manager/operator password change with real credentials, but the implementation must not be removed/redesigned without a reproduced issue.

### HQ venue action alignment — accepted
The previously reported floating/stacked venue actions, Facility Photos placement and Venue Directory card action sizing were manually reviewed and accepted on 26 Aug 2026. Preserve that layout.

### Persistent HQ navigation — accepted
Dedicated HQ routes must retain Overview, Bookings, Staff, Policies, Refunds, Venue Directory, Reports, Finance and Activity Trail. Bookings/Policies/Refunds return through HQ `?tab=` routing. Do not regress to network-only navigation or login flashes between dedicated HQ routes.

### Player discovery/location — accepted
- `discovery-tools.js` owns Find Your Court. Search is live; All/Near Me are visible; city choices come from active venues.
- Android native Fused Location Provider is primary; WebView geolocation is fallback.
- Current accepted Android wrapper is `0.12-debug` / versionCode 12.
- Near Me = active venues within 15 km only, sorted by distance.
- Next Available = real availability within the same 15 km radius when location is available.

### Venue cover/gallery — accepted
Facility Photos supports up to 12 images, captions, cover, reorder and delete. Reorder uses a temporary collision-free position range. Cover photos propagate across accepted player surfaces. Real photos suppress prototype court overlays.

### Booking policy and HQ review screens
Player cancellation/rescheduling cutoff remains 12 hours before first slot. HQ Refunds and HQ Bookings remain compact/collapsible with detailed decision/context views and semantic status colors.

## Verification discipline
Distinguish implementation, green CI and manual acceptance. Treat the repository and actual runtime as source of truth. For any new venue-navigation change, keep the two-venue context regression test intact so cross-venue fallback cannot silently return.

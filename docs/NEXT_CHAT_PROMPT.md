# SBP-Padel — Next Chat Handoff Prompt

Continue `jawadullah-cloud/SBP-Padel` on `backend-v1-dev`. Inspect HEAD, read this file and `docs/PROJECT_MEMORY.md`, inspect relevant implementation/recent commits, and treat repository/runtime/CI as source of truth.

## Current accepted state — 26 Aug 2026
Player discovery/location/gallery and the previously reviewed booking lifecycle are manually accepted. Do not reopen accepted behavior without a reproduced regression.

## Current HQ pass requiring manual review
The editable venue-profile/staff-credential/navigation pass is implemented. A follow-up pass also addresses the venue action alignment shown in manual screenshots and adds self-service password changes for authenticated staff. Verify final Admin Portal CI and Backend CI before manual review.

### Editable venue profiles and amenities
Venue information is no longer create-once. HQ exposes `/hq/provisioning/profile?venue=<id>` and `PATCH /admin/venues/{venue_id}`. Admin can correct name, city, address, description, latitude/longitude, opening/closing hours and amenities. Common amenities include Parking, Changing Rooms, Washrooms, Seating, Cafeteria, Drinking Water, Floodlights, Equipment Rental, Prayer Area and Lockers; custom amenities are also supported.

Venue Directory separates **Manage Venue** from **Edit Profile & Amenities**. New venue creation redirects to the profile editor before operational setup. Profile edits must preserve courts, bookings, pricing, staff assignments, gallery and history. Coordinate changes intentionally affect Near Me/Next Available.

The earlier globally floated **Edit Venue Profile & Amenities** shortcut was removed after manual review showed it misaligned above Venue Management. Do not reintroduce it as a floating global control. If a direct manage-page shortcut is needed, place it deliberately inside that page's header/action group.

### HQ staff credentials and self-service account security
Staff management is a dedicated `/hq/staff` route. Creating admin/venue-manager/venue-operator accounts provides a generated password by default plus Show/Hide, Generate and Copy controls. After creation, the chosen temporary password remains visible client-side until dismissed or leaving the page. It is never stored readable server-side.

HQ admins can reset any staff password through `PATCH /admin/staff/{user_id}/password`; the replacement is hashed server-side. Reset UI also provides Generate/Copy and preserves the chosen password after success until dismissed/leave.

Authenticated HQ admins, venue managers and venue operators also have **My Account → Change Password** self-service. The shared endpoint is `POST /auth/change-password`; it requires the current password plus a policy-compliant new password and rejects reuse of the current password. HQ reset remains the recovery/admin path. The self-service UI is owned by `admin/app/StaffAccountControl.tsx` and appears across the admin/operations product according to the active HQ or operations token.

Disable/Reactivate/Delete remain available and existing safety rules still apply: accounts with operational history should be disabled rather than deleted; self-disable/delete remains blocked.

### HQ venue action alignment
Manual screenshots exposed floating/stacked venue actions. The follow-up alignment pass removes the global floating venue-edit shortcut, standardizes HQ page toolbar action heights/alignment, gives Venue Directory card actions equal sizing, and constrains Facility Photos so it no longer floats over the page header. These changes require manual visual review before being marked accepted.

### Persistent HQ navigation
Dedicated HQ routes must retain the full navigation set: Overview, Bookings, Staff, Policies, Refunds, Venue Directory, Reports, Finance and Activity Trail. Bookings/Policies/Refunds return to their HQ home tabs through `?tab=` routing. Do not regress to the earlier behavior where dedicated pages showed only Overview/network links.

### Player discovery/location — accepted
- `discovery-tools.js` owns Find Your Court. Search is live; All/Near Me are visible; city choices come from active venues.
- Android native Fused Location Provider is primary; WebView geolocation is fallback.
- Current accepted Android wrapper is `0.12-debug` / versionCode 12.
- Near Me = active venues within 15 km only, sorted by distance.
- Next Available = real availability within the same 15 km radius when location is available.

### Venue cover/gallery — accepted
Facility Photos supports up to 12 images, captions, cover, reorder and delete. Reorder uses a temporary collision-free position range. Cover photos propagate across the player surfaces already accepted. Real photos suppress prototype court overlays.

### Booking policy and HQ review screens
Player cancellation/rescheduling cutoff remains 12 hours before first slot. HQ Refunds and HQ Bookings remain compact/collapsible with detailed decision/context views and semantic status colors.

## Manual review sequence for current HQ pass
1. Pull and restart backend + admin frontend.
2. Venue Directory → Multan → Edit Profile & Amenities. Add/change amenities and save; reload to confirm persistence.
3. Check Venue Directory action alignment and Venue Management top actions/Facility Photos against the earlier screenshots.
4. HQ → Staff: confirm generated-password Copy/Show and admin Reset Password remain correct.
5. Log in as a disposable manager/operator and use **My Account → Change Password**. Confirm a wrong current password is rejected, a valid change succeeds, the old password no longer logs in and the new password does.
6. Confirm the same My Account control is available to an HQ admin.
7. Verify Disable/Reactivate/Delete behavior remains available and safe-delete rules still apply.
8. Navigate Venue Management, Reports, Finance and Activity Trail and confirm the full left sidebar remains present.
9. From a dedicated route, open Bookings/Policies/Refunds and confirm the correct HQ home tab opens without a login flash.

## Verification discipline
Distinguish implementation, green CI and manual acceptance. Do not call the current HQ alignment/self-service pass accepted until the user manually reviews it.

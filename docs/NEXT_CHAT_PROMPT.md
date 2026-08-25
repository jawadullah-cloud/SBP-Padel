# SBP-Padel — Next Chat Handoff Prompt

Continue `jawadullah-cloud/SBP-Padel` on `backend-v1-dev`. Inspect HEAD, read this file and `docs/PROJECT_MEMORY.md`, inspect relevant implementation/recent commits, and treat repository/runtime/CI as source of truth.

## Current accepted state — 26 Aug 2026
Player discovery/location/gallery and the previously reviewed booking lifecycle are manually accepted. Do not reopen accepted behavior without a reproduced regression.

## Current HQ pass requiring manual review
A new HQ venue-profile/staff-credential/navigation pass was implemented after the accepted player work. Verify latest Admin Portal CI and Backend CI before manual review.

### Editable venue profiles and amenities
Venue information is no longer create-once. HQ exposes `/hq/provisioning/profile?venue=<id>` and `PATCH /admin/venues/{venue_id}`. Admin can correct name, city, address, description, latitude/longitude, opening/closing hours and amenities. Common amenities include Parking, Changing Rooms, Washrooms, Seating, Cafeteria, Drinking Water, Floodlights, Equipment Rental, Prayer Area and Lockers; custom amenities are also supported.

Venue Directory separates **Manage Venue** from **Edit Profile & Amenities**. New venue creation redirects to the profile editor before operational setup, and Venue Management provides a direct edit-profile shortcut. Profile edits must preserve courts, bookings, pricing, staff assignments, gallery and history. Coordinate changes intentionally affect Near Me/Next Available.

### HQ staff credentials
Staff management is now a dedicated `/hq/staff` route. The HQ home Staff item routes there.

Creating admin/venue-manager/venue-operator accounts provides a generated password by default plus Show/Hide, Generate and Copy controls. After creation, the chosen temporary password remains visible client-side until dismissed or leaving the page. It is never stored readable server-side.

HQ admins can reset any staff password through `PATCH /admin/staff/{user_id}/password`; the replacement is hashed server-side. Reset UI also provides Generate/Copy and preserves the chosen password after success until dismissed/leave. Disable/Reactivate/Delete remain available and existing safety rules still apply: accounts with operational history should be disabled rather than deleted; self-disable/delete remains blocked.

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
2. Venue Directory → select Multan → Edit Profile & Amenities. Add/change amenities, description/address/hours and save; reload to confirm persistence.
3. Confirm Manage Venue has an Edit Venue Profile & Amenities shortcut.
4. Check an edited venue in the player app to confirm live profile/amenity propagation; if latitude/longitude is changed, verify Near Me ranking accordingly.
5. HQ → Staff: create a disposable manager/operator using Generate + Copy. Confirm the password remains visible after creation until dismissed.
6. Reset an existing admin/manager/operator password and confirm login succeeds with the new password.
7. Verify Disable/Reactivate/Delete behavior remains available and safe-delete rules still apply.
8. Navigate Venue Management, Reports, Finance and Activity Trail and confirm the full left sidebar remains present, including Bookings, Staff, Policies and Refunds.
9. From a dedicated route, open Bookings/Policies/Refunds and confirm the correct HQ home tab opens without a login flash.

## Verification discipline
Distinguish implementation, green CI and manual acceptance. Do not call the current HQ pass accepted until the user manually reviews it.

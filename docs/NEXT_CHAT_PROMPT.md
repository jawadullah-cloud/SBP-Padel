# SBP-Padel — Next Chat Handoff Prompt

Continue `jawadullah-cloud/SBP-Padel` on `backend-v1-dev`. Inspect HEAD, read this file and `docs/PROJECT_MEMORY.md`, inspect relevant implementation/recent commits, and treat repository/runtime/CI as source of truth.

## Current review milestone
A combined governance/gallery pass was implemented on 26 Aug 2026 and requires runtime manual review after CI is green.

### Booking change policy
Player cancellation and rescheduling close **12 hours before the first booked slot**. Both are blocked after check-in or once the session starts. Eligible paid cancellations automatically create a refund request. Rescheduling still requires the new session to have the same total price. Shared logic: `backend/app/core/booking_policy.py`.

### HQ Refunds
Refund review now shows booking code, player/contact, venue/court, date/all slots, payment/amount/reference, cancellation reason/timing, check-in/utilization and the 12-hour policy. Admin can process, reject and complete refunds. Do not reduce this back to UUID-only rows.

### HQ Staff / roles
Fixed roles remain `player`, `venue_operator`, `venue_manager`, `admin`. Do not add arbitrary custom roles unless a real permission-matrix requirement emerges. HQ Staff shows permission summaries and supports Disable/Reactivate. Permanent delete is only for staff with no operational/audit/assignment history; otherwise disable. Self-disable/delete is blocked.

### HQ navigation/auth
Dedicated HQ routes are gated before rendering. Switching between HQ pages must not flash the login screen. HQ uses one left sidebar, no floating global toolbar.

### Activity & Audit Trail
`/hq/audit` is now management-facing. It translates technical events into readable actions. Raw API/action/entity/payload data is available only under optional Technical details.

### Venue photos
Venue Management exposes **FACILITY PHOTOS**. `/hq/provisioning/gallery?venue=<id>` allows up to 12 images, optional captions, cover selection, reorder and delete. `VenueImage` persists the gallery. Public `/venues/{venue_id}/gallery` feeds the player app. Player venue detail uses horizontal swipe/scroll with cover first and page dots.

### Manual review sequence
1. Restart backend and admin after pulling because backend models/APIs changed.
2. HQ route switching: confirm no login flash.
3. HQ Bookings: verify semantic status colours.
4. HQ Staff: permission cards, disable/reactivate, safe-delete rejection for historical accounts.
5. Player cancellation >12h: cancellation succeeds and creates refund request; <12h: blocked; checked-in/started: blocked.
6. Player reschedule >12h: same-price available session succeeds; <12h/checked-in/started: blocked.
7. HQ Refunds: verify complete decision context and process/reject flow.
8. Activity Trail: readable default entries; technical details expand only on request.
9. Venue Directory → Manage Venue → Facility Photos: upload 2–3 images, set cover, reorder, delete.
10. Player app venue detail: uploaded images appear and swipe horizontally; cover is first.
11. Recheck accepted booking/payment/pass/My Bookings flow for regression.

## Locked accepted milestones
Player booking lifecycle and venue/front-desk operations were manually accepted on 25 Aug 2026. Do not reopen them without a reproduced regression. Consecutive slots are one booking/session/pass; player count is independent; QR/check-in is booking-level.

## Verification discipline
Distinguish implementation, green CI and manual acceptance. Do not call this new governance/gallery pass accepted until CI is green and the user manually reviews it.

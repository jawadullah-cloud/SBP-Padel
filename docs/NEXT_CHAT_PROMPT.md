# SBP-Padel — Next Chat Handoff Prompt

Continue active development of **SBP-Padel** from the current `backend-v1-dev` branch.

## Mandatory startup

Use the connected GitHub repository immediately:

- Repository: `jawadullah-cloud/SBP-Padel`
- Working branch: `backend-v1-dev`

Before discussing or changing anything:

1. Inspect the current HEAD of `backend-v1-dev`.
2. Read this file (`docs/NEXT_CHAT_PROMPT.md`).
3. Read the repository's durable documentation and implementation relevant to the current task.
4. Inspect recent commits around HEAD.
5. Treat repository state and actual runtime behavior as the source of truth.

This is a continuation of an existing project, not a new project.

## Player runtime milestone accepted

The player runtime investigation established the effective local serving path through `run_player_dev.ps1` and `dev_player_server.py`. The local dev server serves `docs/`, disables caching, neutralizes legacy service workers, and injects a visible `DEV <sha>` build badge.

The user manually reviewed and accepted the fixes for the earlier critical runtime defects, including:

- app-wide first-click navigation/interactions;
- Court 4 selection;
- unavailable slot duplicate text;
- 6 quick dates + MORE;
- MORE date selection;
- checkout first-click routing;
- Pakistan timezone handling for elapsed slots;
- live booking confirmation notifications;
- notification timestamp handling;
- stale availability races;
- booking bottom navigation dead space;
- fresh booking date/court reset with explicit court selection;
- notification page closing through normal navigation/logo;
- venue favourite heart persistence.

Do not reopen these areas without a concrete reproduced regression.

## Booking flow ownership

`docs/review-entry.js` remains the single owner of the Venue → Date → Court → Time → Review → Payment → Confirmation booking state and actions.

`docs/notifications-live.js` is the only notification owner.

`docs/player-bookings-live.js` is now the dedicated live My Bookings owner.

`docs/player-booking-detail-live.js` is now the dedicated live booking-detail lifecycle owner. `booking-detail.html` must not be owned by legacy `player-live.js` or `player-booking-refund.js` in the effective runtime.

## Active milestone: player booking lifecycle

The current work moved from initial booking creation into a complete player-side lifecycle review:

1. My Bookings
2. booking detail
3. reschedule
4. cancellation
5. refund state
6. payment receipt/history linkage
7. lifecycle notifications

### Implemented in the current milestone

- `docs/player-bookings-live.js` loads `/bookings/me` and real booking details from the API and renders Upcoming / Past / Cancelled groups.
- `docs/player-booking-detail-live.js` hydrates booking, venue, court, payment and refund data from live APIs.
- cancellation now uses the real `/bookings/{id}/cancel` endpoint and requests a refund through the real payment endpoint when required.
- a real player reschedule API was added at `/bookings/{id}/reschedule` in `backend/app/api/reschedules.py`.
- reschedule revalidates live availability/pricing, moves the stored booking slots, retains blocking status, and creates a `booking_rescheduled` notification.
- price-adjusted rescheduling is intentionally rejected for now if the new booking total differs from the already-paid amount. Do not silently change a paid booking total without implementing a payment adjustment workflow.
- booking quote/create validation now has the same Windows-safe Pakistan UTC+05:00 fallback used by availability.

### QA added

- `backend/tests/test_player_booking_lifecycle.py` covers confirm → reschedule → old/new slot availability → cancellation → refund → lifecycle notifications/payment history.
- `qa/player_booking_lifecycle_browser.mjs` covers My Bookings → Manage Booking → live payment detail → reschedule → cancel → refund state → return to updated booking lists.
- `.github/workflows/player-flow-ci.yml` now runs both the original player runtime browser QA and the lifecycle browser QA.
- `backend/run_acceptance.ps1` includes ownership/lifecycle regression guards.

## Important verification status

The connected chat environment can edit/read GitHub but cannot clone GitHub into its container because outbound GitHub DNS is blocked. Therefore new lifecycle code and QA may be committed before their GitHub Actions results are visible through the connector.

Always distinguish:

- implementation committed;
- automated CI actually green;
- user's Windows runtime manually accepted.

For the lifecycle milestone, inspect the newest Backend CI and Player Flow CI runs first if available. Fix any failures before asking the user to review.

## Next work after lifecycle acceptance

After My Bookings / detail / reschedule / cancellation / refund are manually accepted, continue the player product review through:

- payment history and wallet;
- saved players;
- favourite venues consistency;
- profile/account/auth/logout;
- help/support;
- full light/dark theme functional review;
- final player regression.

Then lock the player web runtime milestone and begin the venue/admin operational product.

## Working style

Work autonomously through investigation → implementation → runtime/CI QA → fixes → regression QA.

Do not add speculative click interceptors, CSS patches or duplicate feature owners.

Do not claim behavior is fixed merely because code exists in Git. State clearly what was code-reviewed, automatically tested, and manually verified.

When a manual review is required, provide only the minimal PowerShell pull/restart commands and the exact flow to inspect.

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

## Accepted player runtime / booking lifecycle

The user has manually accepted the major player booking/runtime fixes through the booking lifecycle review, including first-click behavior, date/court/time selection, live notifications, Pakistan timezone handling, My Bookings tabs/navigation, booking detail transitions, reschedule, pending-payment cancellation, confirmed cancellation/refund state, favourite-heart behavior, and the booking-detail push transition.

Do not reopen these areas without a concrete reproduced regression.

## Runtime ownership

- `docs/review-entry.js` owns Venue → Date → Court → Time → Review → Payment → Confirmation.
- `docs/notifications-live.js` owns Notifications.
- `docs/player-bookings-live.js` owns My Bookings.
- `docs/player-booking-detail-live.js` owns booking detail / reschedule / cancellation / refund state.
- `docs/player-profile-live.js` owns live profile/auth/menu/logout behavior.
- `docs/player-payment-history-live.js` owns Payment History.
- `docs/player-wallet-live.js` owns Wallet presentation/activity.
- `docs/profile-modules.js` owns only Saved Players, Favourite Venues and Help & Support sub-screens plus favourite persistence. It must not seed prototype people or own Appearance/Notifications/auth.

Legacy `docs/player-account-live.js` must not be loaded by the effective runtime.

## Active milestone: player account/product review

Implemented but awaiting manual acceptance:

- profile identity/contact now hydrates from `/auth/me` instead of the hard-coded Adeel Raza prototype;
- Sign Out clears player auth/session state and returns to `auth-preview.html`;
- Appearance uses the shared theme bridge and persisted theme;
- Payment History has a dedicated API-only owner using `/payments/me` and no hard-coded sample transactions;
- Wallet no longer invents a PKR 2,450 balance or fake top-ups. Because the backend has no wallet ledger/funding workflow yet, the screen explicitly reports that spendable wallet balance/top-up is not enabled, while showing real payment/refund activity from `/payments/me`;
- Saved Players no longer seeds Sara Khan / Hamza Ali / Mariam Shah. A new browser starts empty and local saved-player persistence remains functional;
- Favourite Venues and Help & Support remain local preference/product modules;
- `qa/player_account_browser.mjs` covers live profile identity, empty saved-player state, appearance switching, live payment/refund history, truthful wallet state and logout;
- Player Flow CI now runs runtime QA, booking lifecycle QA and player account QA, and guards against legacy account ownership/prototype data returning.

## Important verification status

The connected chat environment can edit/read GitHub but cannot clone GitHub into its container because outbound GitHub DNS is blocked. New QA can therefore be committed before its Actions results are visible through the connector.

Always distinguish:

- implementation committed;
- automated CI actually green;
- user's Windows runtime manually accepted.

## Next work after account acceptance

After the account/product review is accepted:

1. full light/dark functional and visual review across the complete player app;
2. final player regression and milestone lock;
3. begin venue/admin operational product review and implementation.

## Working style

Work autonomously through investigation → implementation → runtime/CI QA → fixes → regression QA.

Do not add speculative click interceptors, CSS patches or duplicate feature owners.

Do not claim behavior is fixed merely because code exists in Git. State clearly what was code-reviewed, automatically tested, and manually verified.

When a manual review is required, provide only the minimal PowerShell pull/restart commands and the exact flow to inspect.

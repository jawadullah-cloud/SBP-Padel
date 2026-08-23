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

## Accepted player runtime / lifecycle / account review

The user has manually accepted the major player runtime and booking lifecycle fixes, including first-click behavior, date/court/time selection, live notifications, Pakistan timezone handling, My Bookings tabs/navigation, booking detail transitions, reschedule, pending-payment cancellation, confirmed cancellation/refund state, favourite-heart behavior and smooth booking-detail push transitions.

The user has also manually accepted the player account review through Wallet/Payment History/Profile, including live profile identity, payment history, truthful wallet state, saved players/favourites/help, semantic profile icons and account-backed profile-picture upload/removal.

Do not reopen accepted areas without a concrete reproduced regression.

## Runtime ownership

- `docs/review-entry.js` owns Venue → Date → Court → Time → Review → Payment → Confirmation.
- `docs/notifications-live.js` owns Notifications.
- `docs/player-bookings-live.js` owns My Bookings.
- `docs/player-booking-detail-live.js` owns booking detail / reschedule / cancellation / refund state.
- `docs/player-profile-live.js` owns live profile/auth/menu/logout/avatar behavior.
- `docs/player-payment-history-live.js` owns Payment History.
- `docs/player-wallet-live.js` owns Wallet presentation/activity.
- `docs/profile-modules.js` owns only Saved Players, Favourite Venues and Help & Support sub-screens plus favourite persistence.
- `docs/theme-bridge.js` is the single shared player theme owner. It owns stored theme application, the global header theme toggle, Profile Appearance delegation and cross-document/deep-route theme state.

Legacy `docs/player-account-live.js` must not be loaded by the effective runtime.

## Account/backend notes

- `/payments/me` must be registered before generic `/payments/{payment_id}` routes in `backend/app/main.py` so `me` is never parsed as a UUID.
- Player avatars are account-backed through `UserProfile.avatar_data_url` and `/auth/me/avatar`. The frontend resizes/crops the image before sending it.
- Wallet balance/top-up remains intentionally disabled until a real wallet ledger/funding workflow exists. Do not simulate a spendable balance.

## Active milestone: full light/dark review and final player regression

Current implementation work:

- `docs/theme-bridge.js` now owns `#themeToggle`; the previously orphaned header moon/sun control switches theme on the first click and persists it.
- Profile Appearance delegates to `SBPToggleTheme()` instead of maintaining a second theme implementation.
- light-theme coverage was expanded for the player shell, stage, phone, navigation, dynamic profile modules, payment/refund surfaces, modals and inputs while retaining intentional photographic/court artwork.
- `qa/player_theme_browser.mjs` was added. It verifies dark→light switching from the global header, stored theme persistence, Profile state agreement, and light/dark inheritance inside deep-routed Wallet/Payment History frames.
- Player Flow CI now includes the dedicated player-theme browser QA and theme-ownership guards in addition to runtime, booking lifecycle and account QA.

Manual light/dark review is still required before locking the player milestone. Inspect both themes across Home, Courts/Venue, booking flow, My Bookings/detail, Notifications, Profile modules, Wallet/Payment History and deep-routed pages. Only fix reproduced issues.

## Important verification status

The connected chat environment can edit/read GitHub but cannot clone GitHub into its container because outbound GitHub DNS is blocked. New QA can therefore be committed before its Actions results are visible through the connector.

Always distinguish:

- implementation committed;
- automated CI actually green;
- user's Windows runtime manually accepted.

## After final player acceptance

1. lock the player web runtime milestone;
2. begin the venue/admin operational product review and implementation.

## Working style

Work autonomously through investigation → implementation → runtime/CI QA → fixes → regression QA.

Do not add speculative click interceptors, CSS patches or duplicate feature owners.

Do not claim behavior is fixed merely because code exists in Git. State clearly what was code-reviewed, automatically tested, and manually verified.

When a manual review is required, provide only the minimal PowerShell pull/restart commands and the exact flow to inspect.

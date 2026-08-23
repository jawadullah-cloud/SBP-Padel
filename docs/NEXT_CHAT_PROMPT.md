# SBP-Padel — Next Chat Handoff Prompt

Continue active development of **SBP-Padel** from the current `backend-v1-dev` branch.

## Mandatory startup

Use the connected GitHub repository immediately:

- Repository: `jawadullah-cloud/SBP-Padel`
- Working branch: `backend-v1-dev`

Before discussing or changing anything:

1. Inspect the current HEAD of `backend-v1-dev`.
2. Read this file (`docs/NEXT_CHAT_PROMPT.md`).
3. Read the repository's durable documentation and current implementation relevant to the player app, booking flow, navigation, notifications, and QA.
4. Inspect recent commits around the current HEAD rather than assuming previous fixes worked.
5. Treat the repository and actual runtime behavior as the source of truth.

This is a continuation of an existing project, **not a new project**. Do not redesign from scratch and do not ask the user to repeat information already available in the repository.

## Critical current state

The player frontend still has unresolved interaction/runtime defects. Several attempted fixes in the previous chat were reported by the user as producing **no visible improvement**. Therefore, do **not** assume recent commits fixed the runtime merely because the code looks plausible.

Recent work touched files including:

- `docs/visual-system.css`
- `docs/deep-router.js`
- `docs/player-account-live.js`
- `docs/native-transitions.js`
- `docs/sw.js`
- `backend/run_acceptance.ps1`

Recent commits included attempts to:

- remove the duplicate left-side `Unavailable` text from unavailable time slots;
- constrain the booking date selector to 6 dates + MORE on one row;
- prevent inactive screens from intercepting taps;
- stop the deep router from bypassing real checkout/payment actions;
- improve notification ownership/live loading;
- add regression guards.

**User's latest report: none of this visibly changed the running app.** Treat that report as authoritative evidence that there may be a loader/runtime/versioning/served-file problem or that the changes are targeting the wrong effective code path.

## Immediate priority for the new chat

Do not start by applying more speculative CSS/JS patches.

First establish exactly what code the browser is actually executing and why the user's runtime does not reflect repository changes.

Investigate systematically:

1. Inspect current HEAD and recent commit history.
2. Inspect `run_player_dev.ps1` and `dev_player_server.py` to determine exactly what directory/files are served and what scripts/styles are injected.
3. Inspect `docs/index.html`, `docs/sw.js`, all script/style loading paths, service-worker behavior, cache headers, query-string/build versioning, and any duplicate/legacy modules.
4. Trace the effective ownership of:
   - main navigation and screen activation;
   - booking venue/court/date/time selection;
   - unavailable slot rendering;
   - checkout/review/payment navigation;
   - notifications.
5. Search for duplicate implementations and stale prototype markup. Do not merely override them with higher-specificity CSS or additional event listeners. Consolidate ownership where appropriate.
6. Verify whether the local dev server actually serves the modified `docs/*` files and whether injected modules match the repository HEAD.
7. Add a visible/runtime build identifier or diagnostic only if useful to prove which commit/build is loaded.
8. Use automated browser/runtime QA if available in the repository. The key requirement is to test actual click behavior, not just syntax/static assertions.
9. Only after proving the runtime path, fix the defects at their real source.

## User-visible defects that must be verified

### A. App-wide click/tap reliability

The user reported controls often require multiple clicks and may start working only after scrolling. This affects more than one screen. A correct fix must prove that normal controls respond on the first click/tap without scrolling tricks.

At minimum verify:

- Home → Book a Court
- bottom navigation
- venue/facility actions
- court selection including Court 4
- date selector and MORE
- time-slot selection
- Continue actions
- checkout/payment actions
- notifications/profile actions

### B. Unavailable time-slot presentation

An unavailable time slot was showing `Unavailable` twice, once on the left and once on the right. Desired presentation:

- left: time/details only
- right: a single `UNAVAILABLE` status

Do not claim this is fixed until actual rendered runtime behavior is verified.

### C. Booking date selector

Desired compact presentation is **6 quick dates + MORE on one row**. MORE must remain usable and must not create overlapping/invisible hit areas.

### D. Notifications/payment lifecycle

A newly completed booking should generate and display its real booking notification. Verify the actual backend call and notification creation, not just navigation to a success page. Existing prototype/stale notifications must not replace live API data.

## Working style

The user is frustrated by repeated speculative fixes. Work autonomously and return only after meaningful investigation and implementation.

Do not say a defect is fixed merely because a commit was made. Distinguish clearly between:

- code changed;
- automated/static checks passed;
- actual browser/runtime behavior verified.

Prefer root-cause simplification over adding more patches, event interceptors, injected modules, or CSS overrides.

Do not stop after finding the first plausible cause. Follow the effective runtime end-to-end and check for secondary ownership conflicts.

When implementation is complete:

1. Run all relevant targeted QA.
2. Inspect failures and fix them.
3. Confirm current branch HEAD.
4. Give the user exact minimal PowerShell commands required to pull/restart/test.
5. State anything that still requires manual verification without pretending it was tested.

## Important warning from previous chat

The previous chat repeatedly inferred root causes and committed fixes, but the user's runtime reportedly did not change. The next chat must therefore begin with **runtime provenance and effective-code-path verification**, not another inferred UI patch.

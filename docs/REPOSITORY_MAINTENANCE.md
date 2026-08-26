# Repository Maintenance

Last updated: 27 August 2026

This file records repository-level cleanup that is separate from product feature acceptance.

## Active branches

The remote branch set has now been intentionally reduced to three branches:

- `backend-v1-dev` — current development source of truth.
- `main` — release/Pages branch. It is currently behind active development and must not be advanced until the active branch is accepted for release.
- `ui-preview` — retained archive of four unique early prototype commits. Its product implementation is superseded, but the branch is intentionally kept for historical reference rather than deleting unique history solely to reduce branch count.

## Completed branch cleanup — 27 Aug 2026

The user removed the previously verified redundant remote refs and pruned the local remote-tracking list. Deleted branches were:

- `tmp-visual-assets-staging`
- `pages-fix`
- `visual-system-implementation`
- `visual-system-implementation-2`
- `visual-system-implementation-3`
- `visual-system-implementation-4`
- `visual-system-implementation-5`
- `visual-system-implementation-6`
- `visual-system-implementation-7`
- `visual-system-implementation-8`
- `visual-system-implementation-9`
- `visual-system-implementation-10`
- `visual-system-implementation-11`
- `visual-system-implementation-12`
- `visual-system-implementation-13`
- `visual-system-implementation-14`
- `visual-system-implementation-15`
- `visual-system-implementation-16`

Final verified local/remote view after `git fetch --prune` contained only `backend-v1-dev`, `origin/backend-v1-dev`, `origin/main`, `origin/ui-preview`, and `origin/HEAD -> origin/main`.

## Workflows

The active workflow set is intentionally limited to:

- Backend CI
- Admin Portal CI
- Player Flow CI
- Android Debug APK
- GitHub Pages player-web deployment

The Pages workflow is not redundant; it is the only publisher for the static `docs/` player surface.

All four development CI workflows use read-only repository permissions, per-workflow concurrency with cancellation of superseded runs, and hard job timeouts. The Pages workflow uses only the additional Pages and OIDC permissions required for deployment.

## Branch governance

At the time of this audit both `main` and `backend-v1-dev` are unprotected. The connected GitHub mutation surface exposes protection reads but not protection/ruleset writes.

Before production release, configure protection/rulesets appropriate to the workflow, at minimum preventing accidental force-push/deletion of `main` and requiring the intended release checks before merge.

## Dependency and security maintenance

- `.github/dependabot.yml` performs grouped monthly update checks for backend Python packages, Admin npm packages, Android Gradle dependencies and GitHub Actions, targeting `backend-v1-dev` with a low open-PR limit.
- `SECURITY.md` directs vulnerability reports away from public issues and prohibits committing production secrets, production signing material and real user data.
- Admin direct dependencies are pinned to approved exact versions; Admin CI blocks on high-severity `npm audit` findings.
- The stable Android debug signing fixture is deliberately public and development-only so test APKs remain upgrade-compatible across machines/CI. Production release signing remains external to Git and must use a separate SBP-controlled key.

## Repository hygiene completed

- obsolete duplicate Saved Player runtime modules removed;
- broken deferred-Google loader reference resolved and ambiguously named old shim removed;
- superseded `HQHomeRouteBridge.tsx` removed after canonical Staff routing moved into `HQTabBridge`;
- unused `HQVenueEditShortcut.tsx` removed after Venue Directory became the accepted Manage/Edit entry point;
- redundant historical remote branches removed and local remote refs pruned;
- `.gitignore` expanded for Python, Node/Next, Android, IDE, log and OS-generated files;
- root README updated from prototype-era planning language to the actual mature architecture;
- direct Admin dependencies pinned to approved exact versions;
- Player CI syntax-checks every top-level runtime JavaScript file automatically and guards against removed legacy modules returning;
- production player service-worker loader aligned with the canonical runtime and stale prototype fallback data scrubbed before hydration;
- production backend edge hardened with explicit trusted hosts, hidden API documentation, baseline response security headers and production preflight coverage;
- Admin portal configured with baseline browser security headers and CI smoke checks;
- grouped dependency maintenance and a repository security-reporting policy added;
- payment initiation routed through the provider abstraction instead of hard-coding an `unconfigured` payment row in the API route;
- PayZen preparation documented separately in `docs/PAYZEN_INTEGRATION.md` without guessing private departmental endpoints or credentials;
- service-fee financial snapshot regression coverage added for historical bookings and new quotes;
- shared quote path refreshes the persisted HQ service fee before front-desk booking creation so worker-local fee state cannot drift after an HQ update.

## Do not over-clean runtime bridges

The player and operations applications still contain small bridge/runtime modules because some of them own accepted navigation, hydration, Android WebView or service-worker behavior. Delete a bridge only after proving it is not imported/injected and its behavior has moved to a canonical replacement. File-name age alone is not sufficient evidence.

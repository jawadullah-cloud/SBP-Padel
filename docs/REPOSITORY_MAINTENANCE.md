# Repository Maintenance

Last updated: 26 August 2026

This file records repository-level cleanup that is separate from product feature acceptance.

## Active branches

- `backend-v1-dev` — current development source of truth.
- `main` — release/Pages branch. It is currently behind active development and must not be advanced until the active branch is accepted for release.

## Branches verified as redundant

The following branches have no unique work ahead of `backend-v1-dev`, or only contain old Pages setup already superseded by the active tree. They are safe repository-cleanup candidates:

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

The connected GitHub tool can inspect and edit repository content but does not expose Git ref deletion, so these refs have not been falsely reported as deleted.

`ui-preview` has four unique early prototype commits even though its files are superseded by the current product. Keep it as an archive until branch deletion can intentionally preserve or discard that prototype history.

## Workflows

The active workflow set is intentionally limited to:

- Backend CI
- Admin Portal CI
- Player Flow CI
- Android Debug APK
- GitHub Pages player-web deployment

The Pages workflow is not redundant; it is the only publisher for the static `docs/` player surface.

All four development CI workflows use read-only repository permissions, per-workflow concurrency with cancellation of superseded runs, and hard job timeouts. The Pages workflow uses only the additional Pages and OIDC permissions required for deployment.

## GitHub Actions infrastructure status

GitHub Actions experienced a transient runner/allocation disruption on 26 August 2026. Backend runs showed `startup_failure` before job allocation and later commits temporarily received no new run objects. Actions subsequently resumed allocating Player CI jobs. A recovered Player run passed checkout, Node setup, all top-level player JavaScript syntax checks, architecture guards and Playwright installation before entering browser interaction QA.

Treat the earlier startup failures as infrastructure noise, but do not mark final production readiness green until fresh Backend, Admin, Player and Android runs complete successfully on commits containing the final relevant code for each surface.

## Branch governance

At the time of this audit both `main` and `backend-v1-dev` are unprotected. The connected GitHub tool exposes protection reads but not protection writes.

Before production release, configure protection/rulesets appropriate to the workflow, at minimum preventing accidental force-push/deletion of `main` and requiring the intended release checks before merge.

## Dependency and security maintenance

- `.github/dependabot.yml` performs grouped monthly update checks for backend Python packages, Admin npm packages, Android Gradle dependencies and GitHub Actions, targeting `backend-v1-dev` with a low open-PR limit.
- `SECURITY.md` directs vulnerability reports away from public issues and prohibits committing production secrets, signing material and real user data.
- Admin direct dependencies are pinned to approved exact versions; a registry-resolved lockfile should still be generated when npm registry access is available.

## Repository hygiene completed

- obsolete duplicate Saved Player runtime modules removed;
- broken deferred-Google loader reference resolved and ambiguously named old shim removed;
- `.gitignore` expanded for Python, Node/Next, Android, IDE, log and OS-generated files;
- root README updated from prototype-era planning language to the actual mature architecture;
- direct Admin dependencies pinned to approved exact versions pending generation of a real registry-resolved lockfile;
- Player CI now syntax-checks every top-level runtime JavaScript file automatically and guards against removed legacy modules returning;
- production player service-worker loader aligned with the canonical runtime and stale prototype fallback data scrubbed before hydration;
- production backend edge hardened with explicit trusted hosts, hidden API documentation, baseline response security headers and production preflight coverage;
- Admin portal configured with baseline browser security headers and CI smoke checks;
- grouped dependency maintenance and a repository security-reporting policy added.

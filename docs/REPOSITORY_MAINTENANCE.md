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

On 26 August 2026 GitHub stopped creating usable new jobs for later `backend-v1-dev` pushes. Earlier runs showed `startup_failure` before job allocation, and later commits received no new workflow-run/status objects at all. This is classified as repository/Actions infrastructure state, not a successful or failed product test.

Do not mark the final production-readiness pass green until fresh Backend, Admin, Player and Android runs execute on the final branch state.

## Branch governance

At the time of this audit both `main` and `backend-v1-dev` are unprotected. The connected GitHub tool exposes protection reads but not protection writes.

Before production release, configure protection/rulesets appropriate to the workflow, at minimum preventing accidental force-push/deletion of `main` and requiring the intended release checks before merge.

## Repository hygiene completed

- obsolete duplicate Saved Player runtime modules removed;
- broken deferred-Google loader reference resolved and ambiguously named old shim removed;
- `.gitignore` expanded for Python, Node/Next, Android, IDE, log and OS-generated files;
- root README updated from prototype-era planning language to the actual mature architecture;
- direct Admin dependencies pinned to approved exact versions pending generation of a real registry-resolved lockfile;
- production player service-worker loader aligned with the canonical runtime and stale prototype fallback data scrubbed before hydration;
- production backend edge hardened with explicit trusted hosts, hidden API documentation, baseline response security headers and production preflight coverage;
- Admin portal configured with baseline browser security headers and CI smoke checks.

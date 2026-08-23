# Local Player Testing

Local player-app QA must use the repository's cache-free development server rather than `python -m http.server`.

## Why

The production prototype uses a service worker to compose some player modules. During rapid development an older worker can continue controlling a browser tab after source files have changed, which makes manual QA unreliable. Local development therefore deliberately disables service workers and browser asset caching.

## Start the player preview

From the repository root in PowerShell:

```powershell
.\run_player_dev.ps1
```

Open:

```text
http://127.0.0.1:5173/auth-preview.html
```

The development server:

- serves HTML, JavaScript and CSS with `Cache-Control: no-store`;
- serves a no-op `sw.js` so localhost cannot acquire a persistent application worker;
- injects the current booking, router and live account modules directly into HTML responses;
- causes `dev-runtime.js` to unregister any legacy service worker and clear Cache Storage left by older builds.

The first visit after switching from the old server may reload once automatically while the previous service worker is removed. After that, normal browser refreshes should always reflect the current checked-out files.

## Backend

Run the API separately from `backend/`:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The player preview expects the API at `http://127.0.0.1:8000/api/v1` by default.

## Mobile viewport

For rapid visual QA use Chrome DevTools device emulation (for example Pixel 7). A full Android emulator is reserved for later device-level QA and is not needed to solve browser cache/service-worker issues.

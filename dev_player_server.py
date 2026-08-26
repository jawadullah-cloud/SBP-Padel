from __future__ import annotations

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import mimetypes
import os
import subprocess

ROOT = Path(__file__).resolve().parent / "docs"
REPO_ROOT = ROOT.parent
HOST = os.environ.get("SBP_PLAYER_HOST", "127.0.0.1")
PORT = int(os.environ.get("SBP_PLAYER_PORT", "5173"))

COMMON_SCRIPTS = [
    "runtime-api.js",
    "venue-cover-runtime.js",
    "booking-participants-live.js",
    "theme-bridge.js",
    "dev-runtime.js",
    "native-transitions.js",
    "navigation-fix.js",
    "deep-route-smooth.js",
    "review-entry.js",
    "booking-contiguous-slots.js",
    "review-native.js",
    "saved-players-sync.js",
    "pass-route-live.js",
    "android-back.js",
    "back-icons.js",
    "app-branding.js",
]
PAGE_SCRIPTS = {
    "index.html": ["player-venues-live.js", "player-discovery-live.js", "favourites-migration.js", "player-profile-live.js", "profile-modules.js", "notifications-live.js", "booking-date-more.js", "player-bookings-live.js", "discovery-tools.js", "bookings-search.js", "visual-live.js", "player-stability.js", "native-pass-qr-live.js"],
    "review-booking.html": ["review-players-live.js"],
    "payment.html": ["payment-methods-live.js"],
    "payment-success.html": ["booking-success-live.js"],
    "payment-history.html": ["player-payment-history-live.js"],
    "wallet.html": ["player-wallet-live.js"],
    "digital-pass.html": ["digital-pass-live.js"],
    "auth-preview.html": ["player-live.js", "auth-enhancements.js", "google-auth-disabled.js"],
    "booking-detail.html": ["player-booking-detail-live.js", "player-booking-integrity.js"],
}

NOOP_SERVICE_WORKER = """\
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.registration.unregister();await self.clients.claim();})()));
"""

EARLY_RUNTIME_BOOTSTRAP = """<script>
(()=>{try{
  localStorage.removeItem('sbpPadelBookingDatePicker');
  const host=location.hostname;if(!host)return;
  const api=`${location.protocol}//${host}:8000/api/v1`;
  localStorage.setItem('sbpPadelApiBase',api);
  window.SBPApiBase=()=>`${location.protocol}//${location.hostname}:8000/api/v1`;
}catch(e){console.warn('SBP early runtime bootstrap',e)}})();
</script>"""

CANONICAL_REVIEW_BOOTSTRAP = (
    '<script src="deep-router.js?dev=canonical-review"></script>'
    '<script src="review-native.js?dev=canonical-review"></script>'
)


def current_build_id() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short=10", "HEAD"],
            cwd=REPO_ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return "unknown"


def mask_prototype_booking_content(page: str, html: str) -> str:
    """Do not flash prototype identities/bookings before the live runtime hydrates."""
    if page == "review-booking.html":
        html = html.replace("<div class=\"avatar\">AR</div><div><h3>Adeel Raza</h3>", "<div class=\"avatar\">P</div><div><h3>Player</h3>")
    elif page == "payment-success.html":
        html = html.replace("PDL-002381", "—")
        html = html.replace("Saturday, 22 Aug 2026", "Loading…")
        html = html.replace("7:00 PM – 8:00 PM", "Loading…")
        html = html.replace("Nishtar Park Sports Complex", "Loading booking…")
        html = html.replace("Court 01", "Loading…")
    elif page == "digital-pass.html":
        html = html.replace("PDL-002381", "—")
        html = html.replace("SATURDAY, 22 AUG 2026", "LOADING…")
        html = html.replace("7:00 PM – 8:00 PM", "LOADING…")
        html = html.replace("NISHTAR PARK SPORTS COMPLEX", "LOADING BOOKING…")
        html = html.replace("COURT 01", "LOADING…")
    return html


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
        self.send_header("X-SBP-Padel-Build", current_build_id())
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        relative = unquote(parsed.path).lstrip("/") or "index.html"
        if relative == "sw.js":
            payload = NOOP_SERVICE_WORKER.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        target = (ROOT / relative).resolve()
        try:
            target.relative_to(ROOT.resolve())
        except ValueError:
            self.send_error(403)
            return
        if target.is_dir():
            target = target / "index.html"
            relative = str(target.relative_to(ROOT)).replace("\\", "/")
        if target.suffix.lower() == ".html" and target.is_file():
            html = target.read_text(encoding="utf-8")
            page = target.name
            html = mask_prototype_booking_content(page, html)
            if 'SBP early runtime bootstrap' not in html:
                html = html.replace("<head>", "<head>" + EARLY_RUNTIME_BOOTSTRAP, 1)
            mobile_bootstrap = '<script src="mobile-runtime.js?dev=1"></script>'
            if 'src="mobile-runtime.js' not in html and "src='mobile-runtime.js" not in html:
                html = html.replace("</head>", mobile_bootstrap + "</head>")
            if page == "index.html":
                if 'native-tall-layout.css' not in html:
                    html = html.replace("</head>", '<link rel="stylesheet" href="native-tall-layout.css?dev=1"></head>')
                if 'canonical-review' not in html:
                    marker = '<script src="app.js'
                    if marker in html:
                        html = html.replace(marker, CANONICAL_REVIEW_BOOTSTRAP + marker, 1)
                    else:
                        html = html.replace("</head>", CANONICAL_REVIEW_BOOTSTRAP + "</head>")
            scripts: list[str] = []
            for name in [*COMMON_SCRIPTS, *PAGE_SCRIPTS.get(page, [])]:
                if name not in scripts and f'src="{name}' not in html and f"src='{name}" not in html:
                    scripts.append(name)
            if scripts:
                html = html.replace("</body>", "".join(f'<script src="{name}?dev=1"></script>' for name in scripts) + "</body>")
            build = current_build_id()
            diagnostic = f'''<script>window.__SBP_DEV_BUILD__={build!r};document.documentElement.dataset.sbpBuild=window.__SBP_DEV_BUILD__;console.info('[SBP-Padel dev build]',window.__SBP_DEV_BUILD__,location.pathname);</script><div id="sbpDevBuild" aria-label="Development build {build}" style="position:fixed;right:6px;top:6px;z-index:2147483647;padding:3px 6px;border-radius:7px;background:#07120fe6;color:#b9f52a;border:1px solid #b9f52a55;font:700 8px ui-monospace,monospace;pointer-events:none">DEV {build}</div>'''
            html = html.replace("</body>", diagnostic + "</body>")
            payload = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if not target.is_file():
            self.send_error(404)
            return
        payload = target.read_bytes()
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main() -> None:
    build = current_build_id()
    server = ThreadingHTTPServer((HOST, PORT), NoCacheHandler)
    display_host = "127.0.0.1" if HOST == "0.0.0.0" else HOST
    print(f"SBP Padel cache-free player dev server: http://{display_host}:{PORT}")
    if HOST == "0.0.0.0":
        print("LAN mode enabled: the player preview is reachable from devices on the same network.")
    print(f"Repository build: {build}")
    print("HTML/JS/CSS are always served with Cache-Control: no-store.")
    print("Legacy service workers are disabled and automatically removed in local development.")
    print("A DEV <sha> badge is injected into every HTML page so the running checkout is visible.")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

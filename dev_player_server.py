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
    "theme-bridge.js",
    "dev-runtime.js",
    "native-transitions.js",
    "navigation-fix.js",
    "deep-route-smooth.js",
    "review-entry.js",
    "back-icons.js",
    "app-branding.js",
]
PAGE_SCRIPTS = {
    "index.html": [
        "booking-router-bridge.js",
        "player-venues-live.js",
        "favourites-migration.js",
        "player-profile-live.js",
        "profile-modules.js",
        "notifications-live.js",
        "booking-date-more.js",
        "player-bookings-live.js",
        "discovery-tools.js",
        "bookings-search.js",
        "visual-live.js",
        "player-stability.js",
        "native-pass-qr-live.js",
    ],
    "review-booking.html": ["booking-router-bridge.js", "review-players-live.js"],
    "payment.html": ["booking-router-bridge.js"],
    "payment-success.html": ["booking-router-bridge.js"],
    "payment-history.html": ["player-payment-history-live.js"],
    "wallet.html": ["player-wallet-live.js"],
    "digital-pass.html": ["digital-pass-live.js"],
    "auth-preview.html": ["player-live.js", "auth-enhancements.js", "google-auth-disabled.js"],
    "booking-detail.html": ["player-booking-detail-live.js"],
}

NOOP_SERVICE_WORKER = """\
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.registration.unregister();await self.clients.claim();})()));
"""


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

            mobile_bootstrap = '<script src="mobile-runtime.js?dev=1"></script>'
            if 'src="mobile-runtime.js' not in html and "src='mobile-runtime.js" not in html:
                html = html.replace("</head>", mobile_bootstrap + "</head>")

            if page == "index.html" and 'native-tall-layout.css' not in html:
                html = html.replace(
                    "</head>",
                    '<link rel="stylesheet" href="native-tall-layout.css?dev=1"></head>',
                )

            scripts: list[str] = []
            for name in [*COMMON_SCRIPTS, *PAGE_SCRIPTS.get(page, [])]:
                if name not in scripts and f'src="{name}' not in html and f"src='{name}" not in html:
                    scripts.append(name)
            if scripts:
                injected = "".join(f'<script src="{name}?dev=1"></script>' for name in scripts)
                html = html.replace("</body>", injected + "</body>")
            build = current_build_id()
            diagnostic = f'''<script>
window.__SBP_DEV_BUILD__={build!r};
document.documentElement.dataset.sbpBuild=window.__SBP_DEV_BUILD__;
console.info('[SBP-Padel dev build]',window.__SBP_DEV_BUILD__,location.pathname);
</script><div id="sbpDevBuild" aria-label="Development build {build}" style="position:fixed;right:6px;top:6px;z-index:2147483647;padding:3px 6px;border-radius:7px;background:#07120fe6;color:#b9f52a;border:1px solid #b9f52a55;font:700 8px ui-monospace,monospace;pointer-events:none">DEV {build}</div>'''
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

from __future__ import annotations

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import mimetypes

ROOT = Path(__file__).resolve().parent / "docs"
HOST = "127.0.0.1"
PORT = 5173

COMMON_SCRIPTS = [
    "theme-bridge.js",
    "dev-runtime.js",
    "native-transitions.js",
    "navigation-fix.js",
    "review-entry.js",
]
PAGE_SCRIPTS = {
    "index.html": [
        "booking-router-bridge.js",
        "profile-modules.js",
        "player-account-live.js",
        "discovery-tools.js",
        "bookings-search.js",
        "visual-live.js",
        "player-stability.js",
    ],
    "review-booking.html": ["booking-router-bridge.js"],
    "payment.html": ["booking-router-bridge.js"],
    "payment-success.html": ["booking-router-bridge.js"],
    "payment-history.html": ["player-account-live.js"],
    "auth-preview.html": ["player-live.js"],
    "booking-detail.html": ["player-live.js", "player-booking-refund.js"],
}

NOOP_SERVICE_WORKER = """\
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.registration.unregister();await self.clients.claim();})()));
"""


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
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
            scripts: list[str] = []
            for name in [*COMMON_SCRIPTS, *PAGE_SCRIPTS.get(page, [])]:
                if name not in scripts and f'src="{name}' not in html and f"src='{name}" not in html:
                    scripts.append(name)
            if scripts:
                injected = "".join(f'<script src="{name}?dev=1"></script>' for name in scripts)
                html = html.replace("</body>", injected + "</body>")
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
    server = ThreadingHTTPServer((HOST, PORT), NoCacheHandler)
    print(f"SBP Padel cache-free player dev server: http://{HOST}:{PORT}")
    print("HTML/JS/CSS are always served with Cache-Control: no-store.")
    print("Legacy service workers are disabled and automatically removed in local development.")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
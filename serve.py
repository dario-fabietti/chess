#!/usr/bin/env python3
"""Tiny static file server for the chess app.

Plain `python3 -m http.server` mostly works too, but this one guarantees the
correct MIME types for .wasm (streaming compilation) and .js (ES modules).

Usage: python3 serve.py [port]   (default port 8000)
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.wasm': 'application/wasm',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.svg': 'image/svg+xml',
    }

    def end_headers(self):
        # Engine WASM never changes within a session; everything else is tiny.
        if self.path.endswith('.wasm'):
            self.send_header('Cache-Control', 'max-age=86400')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the console quiet


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print(f'Chess Coach running at http://localhost:{port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass

#!/usr/bin/env python3
"""Static file server for the chess app + local Claude coach bridge.

Static serving: guarantees correct MIME types for .wasm (streaming
compilation) and .js (ES modules); plain `python3 -m http.server` mostly
works too but misses those on some setups.

Claude bridge: POST /api/explain shells out to the Claude Code CLI
(`claude -p`), which authenticates with your Claude subscription — no API
key needed. Requires Claude Code installed and logged in on this machine
(https://claude.com/claude-code). The endpoint only accepts requests from
localhost, so LAN visitors can use the app but not your Claude plan.

Environment overrides:
  CLAUDE_BIN    path to the claude executable (default: "claude" on PATH)
  CLAUDE_MODEL  optional model override passed as `--model <value>`

Usage: python3 serve.py [port]   (default port 8000)
"""
import json
import os
import shutil
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

CLAUDE_BIN = os.environ.get('CLAUDE_BIN', 'claude')
CLAUDE_MODEL = os.environ.get('CLAUDE_MODEL', '')
MAX_PROMPT_BYTES = 32 * 1024
CLAUDE_TIMEOUT_S = 180


def claude_available():
    return shutil.which(CLAUDE_BIN) is not None


def run_claude(prompt):
    """Run `claude -p` with the prompt on stdin; return the reply text."""
    cmd = [CLAUDE_BIN, '-p', '--output-format', 'text']
    if CLAUDE_MODEL:
        cmd += ['--model', CLAUDE_MODEL]
    proc = subprocess.run(
        cmd, input=prompt, capture_output=True, text=True,
        timeout=CLAUDE_TIMEOUT_S,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or '').strip()[-500:]
        raise RuntimeError(f'claude exited with {proc.returncode}: {detail}')
    return proc.stdout.strip()


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.wasm': 'application/wasm',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.svg': 'image/svg+xml',
    }

    def _is_local(self):
        return self.client_address[0] in ('127.0.0.1', '::1', '::ffff:127.0.0.1')

    def _send_json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/api/claude-status':
            self._send_json({'available': claude_available() and self._is_local()})
            return
        super().do_GET()

    def do_POST(self):
        if self.path != '/api/explain':
            self._send_json({'error': 'not found'}, 404)
            return
        if not self._is_local():
            self._send_json({'error': 'the Claude bridge only accepts local requests'}, 403)
            return
        if not claude_available():
            self._send_json({'error': f'Claude Code CLI ("{CLAUDE_BIN}") not found on this '
                             'machine — install it from https://claude.com/claude-code '
                             'and log in, then restart serve.py'}, 503)
            return
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0 or length > MAX_PROMPT_BYTES:
            self._send_json({'error': 'prompt missing or too large'}, 400)
            return
        try:
            payload = json.loads(self.rfile.read(length))
            prompt = str(payload.get('prompt', '')).strip()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json({'error': 'invalid JSON body'}, 400)
            return
        if not prompt:
            self._send_json({'error': 'empty prompt'}, 400)
            return
        try:
            text = run_claude(prompt)
            self._send_json({'text': text})
        except subprocess.TimeoutExpired:
            self._send_json({'error': 'Claude took too long to answer'}, 504)
        except Exception as err:  # surface CLI failures to the UI
            self._send_json({'error': str(err)}, 502)

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
    bridge = 'available' if claude_available() else f'unavailable ("{CLAUDE_BIN}" not on PATH)'
    print(f'Chess Coach running at http://localhost:{port}  (Claude bridge: {bridge})')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass

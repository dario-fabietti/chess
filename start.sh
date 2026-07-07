#!/bin/sh
# Start the chess app on http://localhost:8000 (or pass a port as $1)
cd "$(dirname "$0")"
exec python3 serve.py "${1:-8000}"

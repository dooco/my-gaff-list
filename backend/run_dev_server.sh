#!/bin/bash
# Development server with WebSocket support

source venv/bin/activate
echo "Starting development server with Daphne (WebSocket support enabled)..."
daphne -b 0.0.0.0 -p 8000 my_gaff_list.asgi:application

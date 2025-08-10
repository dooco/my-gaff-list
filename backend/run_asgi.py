#!/usr/bin/env python
"""
Development server runner for Django Channels
"""
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "my_gaff_list.settings")
    
    # Use Daphne for development with WebSocket support
    from daphne.cli import CommandLineInterface
    
    # Default to port 8000 if not specified
    if len(sys.argv) == 1:
        sys.argv.extend(["-b", "127.0.0.1", "-p", "8000", "my_gaff_list.asgi:application"])
    elif "-p" not in sys.argv and "--port" not in sys.argv:
        # If no port specified, use 8000
        sys.argv.extend(["-p", "8000"])
        sys.argv.append("my_gaff_list.asgi:application")
    else:
        sys.argv.append("my_gaff_list.asgi:application")
    
    # Run Daphne
    CommandLineInterface.entrypoint()
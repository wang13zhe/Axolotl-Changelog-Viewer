#!/usr/bin/env python3
"""Axolotl Changelog Viewer launcher - starts HTTP server and opens browser."""

import os
import sys
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8765

# Handle PyInstaller bundled mode
if getattr(sys, 'frozen', False):
    ROOT = sys._MEIPASS
else:
    ROOT = os.path.dirname(os.path.abspath(__file__))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def main():
    os.chdir(ROOT)
    server = HTTPServer(('127.0.0.1', PORT), Handler)
    url = f'http://127.0.0.1:{PORT}/index.html'

    # Open browser after server starts
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()

    print(f'Axolotl Changelog Viewer')
    print(f'Serving at {url}')
    print(f'Press Ctrl+C to stop')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down...')
        server.shutdown()

if __name__ == '__main__':
    main()

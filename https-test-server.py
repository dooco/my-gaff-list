#!/usr/bin/env python3
"""
Simple HTTPS server for testing Stripe Identity locally
"""
import ssl
import http.server
import socketserver
import os
import sys

PORT = 8443
HOST = "localhost"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def create_self_signed_cert():
    """Create a self-signed certificate if it doesn't exist"""
    cert_dir = "certificates"
    cert_file = os.path.join(cert_dir, "localhost.crt")
    key_file = os.path.join(cert_dir, "localhost.key")
    
    if not os.path.exists(cert_dir):
        os.makedirs(cert_dir)
    
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("Generating self-signed certificate...")
        os.system(f"""
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout {key_file} \
            -out {cert_file} \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        """)
    
    return cert_file, key_file

def main():
    # Create certificate if needed
    cert_file, key_file = create_self_signed_cert()
    
    # Set up HTTPS server
    Handler = MyHTTPRequestHandler
    
    with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
        # Create SSL context
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert_file, key_file)
        
        # Wrap socket with SSL
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        
        print(f"\n🔒 HTTPS Server running at https://{HOST}:{PORT}/")
        print(f"📁 Serving files from: {os.getcwd()}")
        print(f"\n✅ Access your Stripe test at: https://{HOST}:{PORT}/test-stripe-identity.html")
        print("\n⚠️  Note: You may need to accept the self-signed certificate in your browser")
        print("   (Click 'Advanced' > 'Proceed to localhost' in Chrome)\n")
        print("Press Ctrl+C to stop the server\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")
            sys.exit(0)

if __name__ == "__main__":
    main()
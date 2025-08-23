#!/bin/bash

# Script to set up local HTTPS for testing Stripe Identity

echo "Setting up local HTTPS for Stripe Identity testing..."

# Create certificates directory
mkdir -p certificates

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certificates/localhost.key \
  -out certificates/localhost.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "Certificates generated in ./certificates/"
echo ""
echo "To run Django with HTTPS:"
echo "python manage.py runserver_plus --cert certificates/localhost.crt --key certificates/localhost.key 0.0.0.0:8000"
echo ""
echo "Or use the simple HTTPS server for testing:"
echo "python -m http.server 8443 --directory . --bind localhost --protocol https"
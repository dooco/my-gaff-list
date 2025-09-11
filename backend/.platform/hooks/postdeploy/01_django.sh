#!/bin/bash

# Exit on error
set -e

# Activate virtual environment
source /var/app/venv/*/bin/activate

# Change to app directory
cd /var/app/current

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create cache table if using database cache
python manage.py createcachetable || true

# Load initial data if needed
echo "Loading Irish locations data..."
python manage.py load_irish_locations || true

# Set proper permissions
chmod -R 755 /var/app/current/static || true
chmod -R 755 /var/app/current/media || true

echo "Post-deployment tasks completed successfully!"
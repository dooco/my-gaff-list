# Eircode Geocoding Setup Guide

## Overview

This application uses the Autoaddress API to accurately geocode Irish Eircodes to latitude/longitude coordinates for map display.

## Why Autoaddress?

- **Accurate**: Official Eircode data provider with precise coordinates
- **Reliable**: Professional API with high uptime
- **Complete**: Covers all valid Irish Eircodes
- **Cost-effective**: Pay-per-use model, cached results minimize costs

## Setup Instructions

### 1. Sign Up for Autoaddress API

1. Go to [https://autoaddress.com](https://autoaddress.com)
2. Click "Sign Up" or "Get Started"
3. Create a business account
4. Request API access for the Eircode geocoding service

### 2. Get Your API Key

Once your account is approved:

1. Log into your Autoaddress dashboard
2. Navigate to API Keys section
3. Generate a new API key
4. Copy the key for the next step

### 3. Configure the Application

Add your API key to the `.env` file:

```bash
# In /backend/.env
AUTOADDRESS_API_KEY=your api key
AUTOADDRESS_API_URL=https://api.autoaddress.ie/2.0
```

### 4. Test the Configuration

Run the geocoding command in dry-run mode to test:

```bash
cd backend
source venv/bin/activate
python manage.py geocode_with_autoaddress --dry-run --limit 5
```

### 5. Geocode Existing Properties

Once testing is successful, geocode all properties:

```bash
# Geocode properties without coordinates
python manage.py geocode_with_autoaddress

# Or geocode ALL properties (including already geocoded)
python manage.py geocode_with_autoaddress --all
```

## How It Works

### Automatic Geocoding

- When a property is saved with a new Eircode, it's automatically geocoded
- Coordinates are stored in the database
- Maps display using stored coordinates (no client-side API calls)

### Caching

- Results are cached for 30 days to minimize API calls
- Each unique Eircode is only geocoded once
- Cache is stored in Django's cache backend

### Frontend Integration

- Maps only display when coordinates are available
- Shows "awaiting geocoding" message for pending properties
- No client-side geocoding attempts

## Cost Estimation

- Typical cost: €0.01-0.05 per lookup
- One-time geocoding per property
- Example: 100 properties ≈ €1-5 initial cost
- Ongoing: Only new/changed Eircodes

## Fallback Options

If you cannot obtain an Autoaddress API key, consider these alternatives:

### Option 1: Manual Coordinate Entry

Add latitude/longitude fields to the property edit form and allow landlords to manually enter coordinates using Google Maps.

### Option 2: Static Database

Create a JSON file with known Eircode-to-coordinate mappings for your specific properties.

### Option 3: Alternative Providers

- DirectAddress (https://directaddress.ie)
- Loqate (https://www.loqate.com)
- VisionNet API (https://api.vision-net.ie)

## Troubleshooting

### "AUTOADDRESS_API_KEY not configured"

- Ensure the API key is in your `.env` file
- Restart the Django server after adding the key

### "Failed to geocode" errors

- Check your API key is valid
- Verify you have sufficient API credits
- Check the Eircode format is valid (e.g., "D02 XH98")

### Maps not showing

- Run the geocoding command to populate coordinates
- Check browser console for errors
- Verify coordinates exist in database

## Support

For Autoaddress API issues:

- Email: support@autoaddress.com
- Documentation: https://developer.autoaddress.ie

For application issues:

- Check the logs in `/backend/logs/`
- Review geocoding errors in Django admin

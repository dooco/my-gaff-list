# HERE Maps API Setup Guide

This guide will help you set up geocoding for your properties so they display on the map.

## Problem
Properties need latitude/longitude coordinates to appear on the map. Your current HERE_API_KEY is invalid/expired, so geocoding is failing.

## Solution: Get a New HERE Maps API Key

### Step 1: Create HERE Developer Account

1. **Visit HERE Developer Portal:**
   - Go to: https://developer.here.com/
   - Click **"Sign In"** (top right) or **"Get started for free"**

2. **Sign Up:**
   - Use your email to create an account
   - Verify your email address

3. **Accept Terms:**
   - Review and accept the HERE Developer Terms

### Step 2: Create a Project and Generate API Key

1. **Access Dashboard:**
   - After logging in, you'll be on the HERE Developer Dashboard
   - Click **"Projects"** in the left sidebar

2. **Create New Project:**
   - Click **"Create a project"**
   - Name it: `MyGaffList Geocoding` (or any name you prefer)
   - Click **"Create"**

3. **Generate REST API Key:**
   - In your project, click **"Create credentials"**
   - Select **"API Key"**
   - **Important:** Choose **"REST"** (NOT JavaScript)
   - Give it a name like `Geocoding Key`
   - Click **"Create"**

4. **Copy Your API Key:**
   - You'll see a long string like: `AbCdEf123456789...`
   - **Copy this entire key** - you'll need it in the next step

5. **Verify Permissions:**
   - Make sure your key has **"Geocoding and Search"** permissions enabled
   - This should be enabled by default for REST API keys

### Step 3: Test Your New API Key

Before adding it to your .env file, test that it works:

```bash
cd /Users/clodaghbarry/my-gaff-list/backend
source venv/bin/activate
python test_geocoding.py YOUR_API_KEY_HERE
```

Replace `YOUR_API_KEY_HERE` with your actual key.

If the test passes, you'll see:
```
✅ API KEY IS VALID!
```

### Step 4: Add API Key to .env File

1. **Open your .env file:**
   ```bash
   cd /Users/clodaghbarry/my-gaff-list/backend
   open .env
   ```

2. **Update the HERE_API_KEY line:**
   ```
   HERE_API_KEY=YOUR_NEW_API_KEY_HERE
   ```
   Replace the old key with your new one.

3. **Save the file**

### Step 5: Restart Your Django Server

If your Django development server is running, restart it:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd /Users/clodaghbarry/my-gaff-list/backend
source venv/bin/activate
python manage.py runserver
```

Or if using the run script:
```bash
./run_dev_server.sh
```

### Step 6: Verify It's Working

Test that geocoding now works:

```bash
cd /Users/clodaghbarry/my-gaff-list/backend
source venv/bin/activate
python test_geocoding.py
```

You should see all tests pass.

### Step 7: Re-geocode Existing Properties

You have 3 properties that don't have coordinates. Fix them with:

```bash
cd /Users/clodaghbarry/my-gaff-list/backend
source venv/bin/activate
python manage.py geocode_properties
```

This will:
- Find all properties without coordinates
- Geocode them using their eircodes/addresses
- Save the coordinates to the database

To see what it will do first (without saving):
```bash
python manage.py geocode_properties --dry-run
```

### Step 8: Test the Map

1. **Restart your frontend** (if running):
   ```bash
   cd /Users/clodaghbarry/my-gaff-list
   npm run dev
   ```

2. **Check the map view:**
   - Navigate to your properties map
   - You should now see all 5 properties displayed
   - They should have markers at their correct locations

## Understanding the Geocoding System

### How It Works

1. **When a property is created:**
   - User enters eircode (e.g., `D02 X285`)
   - Django automatically calls the geocoding service
   - HERE Maps returns latitude/longitude
   - Coordinates are saved to the database

2. **When properties are displayed on map:**
   - Map API endpoint filters: `latitude__isnull=False`
   - Only properties with coordinates appear
   - Markers show at the correct GPS coordinates

### Files Involved

- **Geocoding Service:** `backend/apps/core/services/geocoding.py:244-285`
- **Property Model:** `backend/apps/core/models.py:389-419` (auto-geocoding on save)
- **Map Endpoint:** `backend/apps/core/views.py:536-670`
- **Management Command:** `backend/apps/core/management/commands/geocode_properties.py`

## Free Tier Limits

**HERE Maps Free Tier:**
- 250,000 geocoding requests per month
- No credit card required
- Perfect for development and small applications

**What uses a request:**
- Each property creation = 1-2 requests
- Re-geocoding = 1-2 requests per property

## Troubleshooting

### "apiKey invalid" Error
- Your key is wrong or expired
- Make sure you copied the entire key
- Verify it's a REST API key (not JavaScript)
- Check permissions include "Geocoding and Search"

### Properties Still Don't Show on Map
```bash
# Check if they have coordinates
python manage.py shell -c "from apps.core.models import Property; props = Property.objects.all(); [print(f'{p.title}: {p.latitude}, {p.longitude}') for p in props]"

# If coordinates are NULL, re-geocode:
python manage.py geocode_properties
```

### Test Fails with Network Error
- Check your internet connection
- Verify no firewall is blocking HERE Maps API
- Try again in a few minutes (rate limiting)

### Need to Re-geocode All Properties
```bash
python manage.py geocode_properties --all
```

### Only Re-geocode Properties with Eircodes
```bash
python manage.py geocode_properties --eircode-only
```

## Alternative: Google Maps API

If you prefer Google Maps instead of HERE Maps:

1. Go to: https://console.cloud.google.com/
2. Create a new project
3. Enable **Geocoding API**
4. Create credentials (API key)
5. Add to .env:
   ```
   GOOGLE_MAPS_API_KEY=your_google_key_here
   ```

Your app will automatically use Google as a fallback if HERE fails.

## Support

- **HERE Maps Docs:** https://developer.here.com/documentation/geocoding-search-api/dev_guide/index.html
- **Test Script:** `python test_geocoding.py`
- **Management Command Help:** `python manage.py geocode_properties --help`

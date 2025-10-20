#!/usr/bin/env python
"""
Test script for geocoding functionality

Usage:
    python test_geocoding.py                    # Test with configured API key
    python test_geocoding.py YOUR_API_KEY      # Test with a new API key before saving
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_gaff_list.settings')
django.setup()

from apps.core.services.geocoding import geocoder, IrelandGeocoder
from apps.core.models import Property

def test_direct_geocoding(test_geocoder=None):
    """Test geocoding service directly"""
    geo = test_geocoder if test_geocoder else geocoder

    print("\n" + "="*60)
    print("TESTING GEOCODING SERVICE DIRECTLY")
    print("="*60)

    # Test Eircodes - using real Irish eircodes
    test_eircodes = [
        "D02 XH98",  # Dublin 2 - Temple Bar area
        "T12 T85F",  # Cork - City center
        "H91 AX3K",  # Galway - City center
    ]

    print("\n📮 Testing Eircode Geocoding:")
    eircode_success = 0
    for eircode in test_eircodes:
        print(f"\n  Testing: {eircode}")
        result = geo.geocode_eircode(eircode)
        if result:
            print(f"    ✅ Success!")
            print(f"    📍 Coordinates: {result['latitude']}, {result['longitude']}")
            print(f"    📍 Address: {result['formatted_address']}")
            print(f"    🔧 Source: {result['source']}")
            eircode_success += 1
        else:
            print(f"    ❌ Failed to geocode")

    # Test full address
    print("\n\n🏠 Testing Address Geocoding:")
    test_addresses = [
        "1 Grafton Street, Dublin 2, Ireland",
        "Cork City Hall, Cork, Ireland",
    ]

    address_success = 0
    for address in test_addresses:
        print(f"\n  Testing: {address}")
        result = geo.geocode_address(address)
        if result:
            print(f"    ✅ Success!")
            print(f"    📍 Coordinates: {result['latitude']}, {result['longitude']}")
            print(f"    🔧 Source: {result['source']}")
            address_success += 1
        else:
            print(f"    ❌ Failed to geocode")

    total_tests = len(test_eircodes) + len(test_addresses)
    total_success = eircode_success + address_success

    print(f"\n{'='*60}")
    print(f"Results: {total_success}/{total_tests} tests passed")
    print(f"{'='*60}")

    return total_success == total_tests

def test_property_geocoding():
    """Test geocoding of actual properties"""
    print("\n\n" + "="*60)
    print("TESTING PROPERTY GEOCODING")
    print("="*60)
    
    # Get a few properties with eircodes
    properties = Property.objects.exclude(
        eircode__contains='0000'
    ).exclude(
        eircode=''
    ).exclude(
        eircode__isnull=True
    )[:3]
    
    print(f"\n📦 Found {properties.count()} properties with valid eircodes")
    
    for prop in properties:
        print(f"\n  Property: {prop.title}")
        print(f"    Eircode: {prop.eircode}")
        print(f"    Current coords: {prop.latitude}, {prop.longitude}")
        
        # Test geocoding
        from apps.core.services.geocoding import geocode_property
        success = geocode_property(prop)
        if success:
            prop.refresh_from_db()
            print(f"    ✅ Geocoded successfully!")
            print(f"    📍 New coords: {prop.latitude}, {prop.longitude}")
        else:
            print(f"    ❌ Geocoding failed")

def check_configuration():
    """Check if geocoding is properly configured"""
    print("\n" + "="*60)
    print("CONFIGURATION CHECK")
    print("="*60)
    
    from django.conf import settings
    
    print("\n🔧 API Keys Configuration:")
    if settings.HERE_API_KEY:
        print("  ✅ HERE Maps API key is configured")
        print(f"     Key starts with: {settings.HERE_API_KEY[:10]}...")
    else:
        print("  ❌ HERE Maps API key is NOT configured")
    
    if settings.GOOGLE_MAPS_API_KEY:
        print("  ✅ Google Maps API key is configured")
        print(f"     Key starts with: {settings.GOOGLE_MAPS_API_KEY[:10]}...")
    else:
        print("  ⚠️  Google Maps API key is NOT configured (optional)")
    
    print("\n📦 Geocoder Status:")
    if geocoder.here_geocoder:
        print("  ✅ HERE geocoder is initialized")
    else:
        print("  ❌ HERE geocoder is NOT initialized")
    
    if geocoder.google_geocoder:
        print("  ✅ Google geocoder is initialized")
    else:
        print("  ⚠️  Google geocoder is NOT initialized (optional)")

def test_new_api_key(api_key):
    """Test a new API key before saving it to .env"""
    print("\n" + "="*60)
    print("TESTING NEW API KEY")
    print("="*60)
    print(f"API Key: {api_key[:10]}...{api_key[-5:]}")

    # Create a temporary geocoder with the new key
    from geopy.geocoders import HereV7
    test_geo = IrelandGeocoder()

    try:
        test_geo.here_geocoder = HereV7(apikey=api_key)
        test_geo.here_api_key = api_key
        print("✅ API key format accepted by HERE Maps")
    except Exception as e:
        print(f"❌ Failed to initialize HERE geocoder: {e}")
        return False

    # Test geocoding
    print("\nTesting geocoding with this key...")
    success = test_direct_geocoding(test_geo)

    if success:
        print("\n" + "="*60)
        print("✅ API KEY IS VALID!")
        print("="*60)
        print("\nTo use this key:")
        print("1. Open your .env file")
        print("2. Update the line: HERE_API_KEY=" + api_key)
        print("3. Restart your Django server")
        print("4. Run: python test_geocoding.py")
        print("="*60)
    else:
        print("\n" + "="*60)
        print("❌ API KEY TEST FAILED")
        print("="*60)
        print("The key may be invalid or doesn't have geocoding permissions.")
        print("="*60)

    return success


if __name__ == "__main__":
    # Check if a new API key was provided as command line argument
    if len(sys.argv) > 1:
        new_key = sys.argv[1]
        test_new_api_key(new_key)
    else:
        # Test with configured keys
        check_configuration()
        success = test_direct_geocoding()

        if success:
            test_property_geocoding()

            print("\n\n" + "="*60)
            print("✨ GEOCODING TEST COMPLETE - ALL PASSED!")
            print("="*60)
            print("\nYour geocoding is working correctly!")
            print("Properties will automatically get coordinates when created.")
        else:
            print("\n\n" + "="*60)
            print("⚠️  GEOCODING TEST FAILED")
            print("="*60)
            print("\nTroubleshooting steps:")
            print("1. Get a new HERE Maps API key from https://developer.here.com/")
            print("2. Test it with: python test_geocoding.py YOUR_NEW_KEY")
            print("3. Update your .env file with the working key")
            print("="*60)
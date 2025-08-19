#!/usr/bin/env python
"""
Test script for geocoding functionality
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_gaff_list.settings')
django.setup()

from apps.core.services.geocoding import geocoder
from apps.core.models import Property

def test_direct_geocoding():
    """Test geocoding service directly"""
    print("\n" + "="*60)
    print("TESTING GEOCODING SERVICE DIRECTLY")
    print("="*60)
    
    # Test Eircodes
    test_eircodes = [
        "D02 XH98",  # Dublin 2
        "D15 NY88",  # Dublin 15
        "T12 X2E5",  # Cork
        "H91 AX3K",  # Galway
    ]
    
    print("\n📮 Testing Eircode Geocoding:")
    for eircode in test_eircodes:
        print(f"\n  Testing: {eircode}")
        result = geocoder.geocode_eircode(eircode)
        if result:
            print(f"    ✅ Success!")
            print(f"    📍 Coordinates: {result['latitude']}, {result['longitude']}")
            print(f"    📍 Address: {result['formatted_address']}")
            print(f"    🔧 Source: {result['source']}")
        else:
            print(f"    ❌ Failed to geocode")
    
    # Test full address
    print("\n\n🏠 Testing Address Geocoding:")
    test_addresses = [
        "Trinity College Dublin, Dublin, Ireland",
        "Cork Airport, Cork, Ireland",
        "Cliffs of Moher, County Clare, Ireland",
    ]
    
    for address in test_addresses:
        print(f"\n  Testing: {address}")
        result = geocoder.geocode_address(address)
        if result:
            print(f"    ✅ Success!")
            print(f"    📍 Coordinates: {result['latitude']}, {result['longitude']}")
            print(f"    🔧 Source: {result['source']}")
        else:
            print(f"    ❌ Failed to geocode")

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

if __name__ == "__main__":
    check_configuration()
    test_direct_geocoding()
    test_property_geocoding()
    
    print("\n\n" + "="*60)
    print("✨ GEOCODING TEST COMPLETE!")
    print("="*60)
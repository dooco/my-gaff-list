#!/usr/bin/env python
"""
Script to create sample properties with landlord relationships
"""
import os
import sys
import django

# Setup Django
sys.path.append('/Users/clodaghbarry/my-gaff-list/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_gaff_list.settings')
django.setup()

from apps.core.models import Property, County, Town, Landlord
from datetime import datetime, date

def create_sample_properties():
    """Create sample properties with landlord relationships"""
    
    # Get counties and towns
    dublin = County.objects.get(slug='dublin')
    dublin_2 = Town.objects.get(slug='dublin-2', county=dublin)
    
    cork = County.objects.get(slug='cork')
    cork_city = Town.objects.get(slug='cork-city', county=cork)
    
    galway = County.objects.get(slug='galway')
    galway_city = Town.objects.get(slug='galway-city', county=galway)
    
    limerick = County.objects.get(slug='limerick')
    limerick_city = Town.objects.get(slug='limerick-city', county=limerick)
    
    wicklow = County.objects.get(slug='wicklow')
    bray = Town.objects.get(slug='bray', county=wicklow)
    
    dublin_swords = Town.objects.get(slug='swords', county=dublin)
    
    # Get landlords
    landlords = list(Landlord.objects.all())
    
    # Sample properties data
    properties_data = [
        {
            'title': 'Modern 2-Bed Apartment in Dublin 2',
            'description': 'Spacious and modern 2-bedroom apartment in the heart of Dublin 2. Features include modern kitchen, living area, and excellent transport links.',
            'county': dublin,
            'town': dublin_2,
            'address': 'Grand Canal Dock, Dublin 2',
            'property_type': 'apartment',
            'bedrooms': 2,
            'bathrooms': 2,
            'floor_area': 75,
            'rent_monthly': '2200.00',
            'deposit': '2200.00',
            'furnished': 'furnished',
            'ber_rating': 'B2',
            'ber_number': '123456789',
            'features': ['Parking', 'Balcony', 'Modern Kitchen', 'City Views'],
            'main_image': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=300&fit=crop',
            'image_urls': [],
            'available_from': date(2025, 2, 1),
            'lease_length': '12 months minimum',
            'is_active': True,
            'landlord': landlords[0]  # Property Manager
        },
        {
            'title': 'Cozy 3-Bed House in Cork City',
            'description': 'Beautiful 3-bedroom house in a quiet residential area of Cork City. Perfect for families, with a garden and parking.',
            'county': cork,
            'town': cork_city,
            'address': 'Blackpool, Cork City',
            'property_type': 'house',
            'house_type': 'terraced',
            'bedrooms': 3,
            'bathrooms': 2,
            'floor_area': 120,
            'rent_monthly': '1800.00',
            'deposit': '1800.00',
            'furnished': 'unfurnished',
            'ber_rating': 'C1',
            'ber_number': '987654321',
            'features': ['Garden', 'Parking', 'Quiet Area', 'Family Friendly'],
            'main_image': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&h=300&fit=crop',
            'image_urls': [],
            'available_from': date(2025, 2, 15),
            'lease_length': 'Long term',
            'is_active': True,
            'landlord': landlords[1]  # Cork Properties
        },
        {
            'title': 'Student Room in Galway City',
            'description': 'Single room in shared house near NUIG. Perfect for students. All bills included.',
            'county': galway,
            'town': galway_city,
            'address': 'Newcastle Road, Galway',
            'property_type': 'shared',
            'bedrooms': 1,
            'bathrooms': 1,
            'rent_monthly': '650.00',
            'deposit': '650.00',
            'furnished': 'furnished',
            'ber_rating': 'D1',
            'ber_number': '456789123',
            'features': ['All Bills Included', 'Near University', 'Shared Kitchen', 'WiFi'],
            'main_image': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=300&fit=crop',
            'image_urls': [],
            'available_from': date(2025, 1, 20),
            'lease_length': 'Academic year',
            'is_active': True,
            'landlord': landlords[2]  # Student Accommodation
        },
        {
            'title': 'Luxury 1-Bed Apartment in Limerick City',
            'description': 'Brand new luxury 1-bedroom apartment in the city center. High-end finishes and stunning river views.',
            'county': limerick,
            'town': limerick_city,
            'address': "Arthur's Quay, Limerick City",
            'property_type': 'apartment',
            'bedrooms': 1,
            'bathrooms': 1,
            'floor_area': 55,
            'rent_monthly': '1400.00',
            'deposit': '1400.00',
            'furnished': 'furnished',
            'ber_rating': 'A2',
            'ber_number': '789123456',
            'features': ['River Views', 'City Center', 'Luxury Finishes', 'Concierge'],
            'main_image': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=300&fit=crop',
            'image_urls': [],
            'available_from': date(2025, 1, 15),
            'lease_length': '12 months minimum',
            'is_active': True,
            'landlord': landlords[3]  # Luxury Lettings
        },
        {
            'title': 'Family Home in Bray, Wicklow',
            'description': 'Spacious 4-bedroom family home in Bray. Close to beach, schools, and DART station.',
            'county': wicklow,
            'town': bray,
            'address': 'Seafront, Bray',
            'property_type': 'house',
            'house_type': 'semi_detached',
            'bedrooms': 4,
            'bathrooms': 3,
            'floor_area': 150,
            'rent_monthly': '2800.00',
            'deposit': '2800.00',
            'furnished': 'unfurnished',
            'ber_rating': 'B3',
            'ber_number': '321654987',
            'features': ['Near Beach', 'DART Station', 'Garden', 'Schools Nearby'],
            'main_image': 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=500&h=300&fit=crop',
            'image_urls': [],
            'available_from': date(2025, 3, 1),
            'lease_length': 'Long term preferred',
            'is_active': True,
            'landlord': landlords[4]  # Wicklow Homes
        },
        {
            'title': 'Studio Apartment in Swords, Dublin',
            'description': 'Compact studio apartment perfect for professionals. Modern and well-located near Dublin Airport.',
            'county': dublin,
            'town': dublin_swords,
            'address': 'Main Street, Swords',
            'property_type': 'studio',
            'bedrooms': 0,
            'bathrooms': 1,
            'floor_area': 35,
            'rent_monthly': '1200.00',
            'deposit': '1200.00',
            'furnished': 'furnished',
            'ber_rating': 'C2',
            'ber_number': '654321789',
            'features': ['Near Airport', 'Transport Links', 'Modern', 'Professional Area'],
            'main_image': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=300&fit=crop',
            'image_urls': [],
            'available_from': date(2025, 1, 28),
            'lease_length': '6 months minimum',
            'is_active': True,
            'landlord': landlords[5]  # North Dublin Lets
        },
    ]
    
    # Create properties
    created_count = 0
    for prop_data in properties_data:
        property_obj, created = Property.objects.get_or_create(
            title=prop_data['title'],
            defaults=prop_data
        )
        if created:
            created_count += 1
            print(f"Created property: {property_obj.title}")
        else:
            print(f"Property already exists: {property_obj.title}")
    
    print(f"\nSummary:")
    print(f"Created {created_count} new properties")
    print(f"Total properties: {Property.objects.count()}")
    print(f"Total landlords: {Landlord.objects.count()}")

if __name__ == '__main__':
    create_sample_properties()
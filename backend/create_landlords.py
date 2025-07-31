#!/usr/bin/env python
"""
Script to create landlords for existing properties and establish relationships
"""
import os
import sys
import django

# Setup Django
sys.path.append('/Users/clodaghbarry/my-gaff-list/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_gaff_list.settings')
django.setup()

from apps.core.models import Property, Landlord
from datetime import datetime

def create_landlords_for_properties():
    """Create landlords based on the sample properties fixture data"""
    
    # Sample landlord data based on the fixture
    landlords_data = [
        {
            'name': 'Property Manager',
            'email': 'info@gafflist.ie',
            'phone': '01-234-5678',
            'user_type': 'property_manager',
            'is_verified': True,
            'verification_date': datetime.now(),
            'company_name': 'Dublin Property Management',
            'response_time_hours': 12,
        },
        {
            'name': 'Cork Properties',
            'email': 'cork@gafflist.ie',
            'phone': '021-456-7890',
            'user_type': 'agent',
            'is_verified': False,
            'company_name': 'Cork Properties Ltd',
            'response_time_hours': 24,
        },
        {
            'name': 'Student Accommodation',
            'email': 'student@gafflist.ie',
            'phone': '091-234-5678',
            'user_type': 'landlord',
            'is_verified': False,
            'response_time_hours': 48,
        },
        {
            'name': 'Luxury Lettings',
            'email': 'luxury@gafflist.ie',
            'phone': '061-789-0123',
            'user_type': 'agent',
            'is_verified': True,
            'verification_date': datetime.now(),
            'company_name': 'Luxury Lettings Ltd',
            'license_number': 'PSRA-12345',
            'response_time_hours': 6,
        },
        {
            'name': 'Wicklow Homes',
            'email': 'wicklow@gafflist.ie',
            'phone': '01-987-6543',
            'user_type': 'landlord',
            'is_verified': True,
            'verification_date': datetime.now(),
            'response_time_hours': 12,
        },
        {
            'name': 'North Dublin Lets',
            'email': 'north@gafflist.ie',
            'phone': '01-555-0123',
            'user_type': 'agent',
            'is_verified': False,
            'company_name': 'North Dublin Lettings',
            'response_time_hours': 24,
        }
    ]
    
    # Create landlords
    created_landlords = []
    for landlord_data in landlords_data:
        landlord, created = Landlord.objects.get_or_create(
            email=landlord_data['email'],
            defaults=landlord_data
        )
        created_landlords.append(landlord)
        if created:
            print(f"Created landlord: {landlord.name} ({'Verified' if landlord.is_verified else 'Unverified'})")
        else:
            print(f"Landlord already exists: {landlord.name}")
    
    # Get properties and assign landlords
    properties = Property.objects.all()
    print(f"\nFound {properties.count()} properties to assign landlords to")
    
    # Map properties to landlords based on the fixture data
    property_landlord_mapping = [
        ('Modern 2-Bed Apartment in Dublin 2', created_landlords[0]),
        ('Cozy 3-Bed House in Cork City', created_landlords[1]),
        ('Student Room in Galway City', created_landlords[2]),
        ('Luxury 1-Bed Apartment in Limerick City', created_landlords[3]),
    ]
    
    # If we have more properties than our mapping (e.g., from the fixture)
    additional_properties = list(properties)
    landlord_index = 4  # Start with remaining landlords
    
    for prop in additional_properties:
        # Try to find the property in our mapping first
        assigned = False
        for title_part, landlord in property_landlord_mapping:
            if title_part.lower() in prop.title.lower():
                prop.landlord = landlord
                prop.save()
                print(f"Assigned '{prop.title}' to {landlord.name}")
                assigned = True
                break
        
        # If not found in mapping, assign to remaining landlords cyclically
        if not assigned and landlord_index < len(created_landlords):
            prop.landlord = created_landlords[landlord_index]
            prop.save()
            print(f"Assigned '{prop.title}' to {created_landlords[landlord_index].name}")
            landlord_index += 1
        elif not assigned:
            # If we run out of landlords, cycle back
            prop.landlord = created_landlords[landlord_index % len(created_landlords)]
            prop.save()
            print(f"Assigned '{prop.title}' to {created_landlords[landlord_index % len(created_landlords)].name}")
            landlord_index += 1
    
    print(f"\nSummary:")
    print(f"Total landlords: {Landlord.objects.count()}")
    print(f"Verified landlords: {Landlord.objects.filter(is_verified=True).count()}")
    print(f"Properties with landlords: {Property.objects.filter(landlord__isnull=False).count()}")

if __name__ == '__main__':
    create_landlords_for_properties()
#!/usr/bin/env python
"""
Script to create landlord profile for existing users with user_type='landlord'
"""
import os
import sys
import django

# Setup Django
sys.path.append('/Users/clodaghbarry/my-gaff-list/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_gaff_list.settings')
django.setup()

from apps.users.models import User
from apps.core.models import Landlord
from apps.landlords.models import LandlordProfile

def create_landlord_profiles():
    """Create landlord profiles for users with user_type='landlord' who don't have one"""
    
    # Get all landlord users without profiles
    landlord_users = User.objects.filter(user_type='landlord')
    
    for user in landlord_users:
        # Check if profile already exists
        if LandlordProfile.objects.filter(user=user).exists():
            print(f"Profile already exists for {user.email}")
            continue
        
        # Create landlord object
        landlord = Landlord.objects.create(
            name=user.get_full_name() or user.username,
            email=user.email,
            phone=user.phone_number or '',
            user_type='landlord',
            company_name='',
            preferred_contact_method='both'
        )
        
        # Create landlord profile
        profile = LandlordProfile.objects.create(
            user=user,
            landlord=landlord
        )
        
        print(f"Created landlord profile for {user.email}")
    
    print("\nSummary:")
    print(f"Total landlord users: {landlord_users.count()}")
    print(f"Total landlord profiles: {LandlordProfile.objects.count()}")

if __name__ == '__main__':
    create_landlord_profiles()
#!/usr/bin/env python
"""
Test landlord API access
"""
import os
import sys
import django
import requests

# Setup Django
sys.path.append('/Users/clodaghbarry/my-gaff-list/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_gaff_list.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from apps.users.models import User
from apps.landlords.models import LandlordProfile

# Get user
user = User.objects.get(email='joeblogs45189@gmail.com')
print(f"User: {user.email}")
print(f"User type: {user.user_type}")

# Check profile
try:
    profile = LandlordProfile.objects.get(user=user)
    print(f"Has LandlordProfile: Yes")
    print(f"Landlord ID: {profile.landlord.id}")
except LandlordProfile.DoesNotExist:
    print("Has LandlordProfile: No")

# Generate tokens
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)
print(f"\nAccess token generated")

# Test API endpoints
base_url = "http://localhost:8000"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json"
}

# Test properties endpoint
print("\nTesting /api/landlords/properties/")
response = requests.get(f"{base_url}/api/landlords/properties/", headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Success! Found {data.get('count', len(data))} properties")
else:
    print(f"Error: {response.text[:200]}")

# Test enquiries endpoint
print("\nTesting /api/landlords/enquiries/")
response = requests.get(f"{base_url}/api/landlords/enquiries/", headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Success! Found {data.get('count', len(data))} enquiries")
else:
    print(f"Error: {response.text[:200]}")
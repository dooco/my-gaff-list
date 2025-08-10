#\!/usr/bin/env python
"""
Generate fresh authentication tokens for test landlord accounts.
Usage: python generate_test_tokens.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_gaff_list.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from apps.users.models import User

def generate_tokens_for_user(email):
    """Generate and display tokens for a user."""
    try:
        user = User.objects.get(email=email)
        refresh = RefreshToken.for_user(user)
        
        print(f"\n{'='*60}")
        print(f"Tokens for: {user.email}")
        print(f"Name: {user.get_full_name()}")
        print(f"User Type: {user.user_type}")
        print(f"{'='*60}")
        print(f"\nAccess Token (expires in 1 hour):")
        print(f"{refresh.access_token}")
        print(f"\nRefresh Token (expires in 7 days):")
        print(f"{refresh}")
        print(f"\n{'='*60}")
        
        # Also print a JavaScript snippet for easy browser console use
        print(f"\n// To use in browser console:")
        print(f"localStorage.setItem('access_token', '{refresh.access_token}');")
        print(f"localStorage.setItem('refresh_token', '{refresh}');")
        print(f"localStorage.setItem('user_data', JSON.stringify({{'id': '{user.id}', 'email': '{user.email}', 'first_name': '{user.first_name}', 'last_name': '{user.last_name}', 'user_type': '{user.user_type}'}}));")
        print(f"window.location.reload();")
        
    except User.DoesNotExist:
        print(f"User {email} not found")

if __name__ == "__main__":
    print("Generating fresh authentication tokens for test landlord accounts...")
    
    # Generate tokens for both test landlords
    generate_tokens_for_user('jim@fixit.ie')
    generate_tokens_for_user('joeblogs45189@gmail.com')
    
    print("\n✅ Tokens generated successfully!")
    print("\n📋 Instructions:")
    print("1. Copy the JavaScript code block for your user")
    print("2. Open the browser developer console (F12)")
    print("3. Paste and run the code")
    print("4. The page will reload with fresh authentication")
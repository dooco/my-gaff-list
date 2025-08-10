#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_gaff_list.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from apps.users.models import User

# Get test users
user1 = User.objects.get(email='test1@example.com')
user2 = User.objects.get(email='test2@example.com')

print("=" * 80)
print("TEST USER 1 - test1@example.com")
print("=" * 80)
refresh1 = RefreshToken.for_user(user1)
print(f"Access Token:\n{refresh1.access_token}\n")

print("=" * 80)
print("TEST USER 2 - test2@example.com")
print("=" * 80)
refresh2 = RefreshToken.for_user(user2)
print(f"Access Token:\n{refresh2.access_token}\n")

print("=" * 80)
print("Conversation ID: 139cddcd-ab35-401c-bb30-a78896a32314")
print("=" * 80)
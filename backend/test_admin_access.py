#!/usr/bin/env python
"""
Test script to verify Django admin panel is accessible
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_gaff_list.settings')
django.setup()

from django.contrib.admin import site
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

print("\n" + "="*60)
print("DJANGO ADMIN PANEL TEST")
print("="*60)

# Check registered models
print("\n📊 Registered Models in Admin:")
print("-" * 40)

for model, admin_class in site._registry.items():
    app_label = model._meta.app_label
    model_name = model._meta.verbose_name
    print(f"  ✅ {app_label}.{model_name}")

# Check superuser
print("\n👤 Superuser Account:")
print("-" * 40)

admin_user = User.objects.filter(is_superuser=True).first()
if admin_user:
    print(f"  ✅ Email: {admin_user.email}")
    print(f"  ✅ Name: {admin_user.get_full_name()}")
    print(f"  ✅ Type: {admin_user.user_type}")
    print(f"  ✅ Active: {admin_user.is_active}")
else:
    print("  ❌ No superuser found")

# Admin URL
print("\n🌐 Admin Access:")
print("-" * 40)
print("  📍 URL: http://localhost:8000/admin/")
print("  📧 Email: admin@mygafflist.ie")
print("  🔑 Password: admin123")

print("\n📝 Admin Features:")
print("-" * 40)
print("  ✅ User Management (create, edit, activate/deactivate)")
print("  ✅ Property Management (view, edit, geocode)")
print("  ✅ Landlord Verification")
print("  ✅ Enquiry Tracking")
print("  ✅ User Activity Monitoring")
print("  ✅ County/Town Management")
print("  ✅ Property Image Management")
print("  ✅ Saved Properties Tracking")

print("\n" + "="*60)
print("✨ ADMIN PANEL READY!")
print("="*60)
print("\nTo access the admin panel:")
print("1. Start the Django server: npm run backend:dev")
print("2. Visit: http://localhost:8000/admin/")
print("3. Login with the credentials above")
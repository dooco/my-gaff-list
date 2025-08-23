#!/usr/bin/env python3
"""
Test script for Stripe Identity verification API endpoints
"""
import requests
import json
import sys
from urllib3.exceptions import InsecureRequestWarning

# Suppress SSL warnings for self-signed certificate
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Configuration
BASE_URL = "http://localhost:8000"  # Use HTTP for now
EMAIL = "joeblogs45189@gmail.com"
PASSWORD = "password123"

def login():
    """Login and get auth token"""
    print("🔐 Logging in...")
    response = requests.post(
        f"{BASE_URL}/api/users/auth/login/",
        json={"email": EMAIL, "password": PASSWORD},
        verify=False  # Skip SSL verification for self-signed cert
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful!")
        return data.get('access')
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None

def test_verification_status(token):
    """Test verification status endpoint"""
    print("\n📊 Testing verification status...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        f"{BASE_URL}/api/users/verification/identity/status/",
        headers=headers,
        verify=False
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Status retrieved successfully!")
        print(f"   Verification Level: {data.get('verification_level')}")
        print(f"   Trust Score: {data.get('trust_score')}")
        return True
    else:
        print(f"❌ Status check failed: {response.status_code}")
        print(response.text)
        return False

def test_create_session(token):
    """Test creating verification session"""
    print("\n🎯 Testing session creation...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "return_url": "https://localhost:3000/verification/complete",
        "refresh_url": "https://localhost:3000/verification"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/users/verification/identity/create-session/",
        headers=headers,
        json=data,
        verify=False
    )
    
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"✅ Session created successfully!")
        print(f"   Session ID: {data.get('session_id')}")
        print(f"   Status: {data.get('status')}")
        print(f"   Client Secret: {data.get('client_secret')[:20]}...")
        return data
    else:
        print(f"❌ Session creation failed: {response.status_code}")
        print(response.text)
        return None

def test_webhook(token, event_type='verified'):
    """Test webhook endpoint"""
    print(f"\n🔔 Testing webhook ({event_type})...")
    
    # Simulate a Stripe webhook event
    webhook_data = {
        "id": "evt_test_123",
        "object": "event",
        "type": f"identity.verification_session.{event_type}",
        "data": {
            "object": {
                "id": "vs_test_123",
                "object": "identity.verification_session",
                "status": event_type,
                "metadata": {
                    "user_id": "1",
                    "user_email": EMAIL
                }
            }
        }
    }
    
    # Note: Real webhooks need proper signature verification
    # This is just for testing the endpoint exists
    response = requests.post(
        f"{BASE_URL}/api/users/verification/identity/webhook/",
        json=webhook_data,
        verify=False
    )
    
    if response.status_code == 400:
        print(f"⚠️  Webhook endpoint exists but requires valid signature")
        return True
    elif response.status_code == 200:
        print(f"✅ Webhook processed successfully!")
        return True
    else:
        print(f"❌ Webhook test failed: {response.status_code}")
        print(response.text)
        return False

def main():
    print("=" * 50)
    print("🧪 Stripe Identity Verification API Test")
    print("=" * 50)
    
    # Login
    token = login()
    if not token:
        print("\n❌ Cannot proceed without authentication")
        sys.exit(1)
    
    # Test verification status
    status_ok = test_verification_status(token)
    
    # Test session creation
    session = test_create_session(token)
    
    # Test webhook endpoint
    webhook_ok = test_webhook(token)
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    print(f"   ✅ Authentication: Success")
    print(f"   {'✅' if status_ok else '❌'} Verification Status: {'Success' if status_ok else 'Failed'}")
    print(f"   {'✅' if session else '❌'} Session Creation: {'Success' if session else 'Failed'}")
    print(f"   {'✅' if webhook_ok else '❌'} Webhook Endpoint: {'Success' if webhook_ok else 'Failed'}")
    
    if session:
        print("\n💡 Next Steps:")
        print(f"   1. Use the client_secret in your frontend:")
        print(f"      stripe.verifyIdentity('{session.get('client_secret')[:20]}...')")
        print(f"   2. Configure Stripe webhook at:")
        print(f"      {BASE_URL}/api/users/verification/identity/webhook/")
        print(f"   3. Test with Stripe CLI:")
        print(f"      stripe listen --forward-to {BASE_URL}/api/users/verification/identity/webhook/")

if __name__ == "__main__":
    main()
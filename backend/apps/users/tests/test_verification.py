"""
Tests for Stripe Identity verification system
"""

from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
import json
from datetime import datetime, timedelta

from apps.users.models import IdentityVerification

User = get_user_model()


class IdentityVerificationModelTests(TestCase):
    """Test the IdentityVerification model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_create_identity_verification(self):
        """Test creating an identity verification record"""
        verification = IdentityVerification.objects.create(
            user=self.user,
            verification_type='full',
            status='pending',
            provider='stripe',
            stripe_verification_session_id='vs_test_123'
        )
        
        self.assertEqual(verification.user, self.user)
        self.assertEqual(verification.verification_type, 'full')
        self.assertEqual(verification.status, 'pending')
        self.assertFalse(verification.is_valid)
    
    def test_verification_is_valid_property(self):
        """Test the is_valid property"""
        verification = IdentityVerification.objects.create(
            user=self.user,
            verification_type='full',
            status='verified',
            verified_at=timezone.now()
        )
        
        self.assertTrue(verification.is_valid)
        
        # Test expired verification
        verification.expires_at = timezone.now() - timedelta(days=1)
        verification.save()
        self.assertFalse(verification.is_valid)
    
    def test_verification_is_expired_property(self):
        """Test the is_expired property"""
        verification = IdentityVerification.objects.create(
            user=self.user,
            verification_type='full',
            status='verified',
            expires_at=timezone.now() + timedelta(days=30)
        )
        
        self.assertFalse(verification.is_expired)
        
        verification.expires_at = timezone.now() - timedelta(days=1)
        verification.save()
        self.assertTrue(verification.is_expired)


class UserVerificationLevelTests(TestCase):
    """Test user verification level calculations"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_no_verification_level(self):
        """Test user with no verifications"""
        self.assertEqual(self.user.verification_level, 'none')
        self.assertEqual(self.user.trust_score, 0)
        self.assertFalse(self.user.is_verified)
    
    def test_basic_verification_level(self):
        """Test user with email verification only"""
        self.user.is_email_verified = True
        self.user.save()
        self.user.update_verification_level()
        
        self.assertEqual(self.user.verification_level, 'basic')
        self.assertEqual(self.user.trust_score, 40)
        self.assertTrue(self.user.is_verified)
    
    def test_standard_verification_level(self):
        """Test user with email and phone verification"""
        self.user.is_email_verified = True
        self.user.is_phone_verified = True
        self.user.save()
        self.user.update_verification_level()
        
        self.assertEqual(self.user.verification_level, 'standard')
        self.assertEqual(self.user.trust_score, 70)
        self.assertTrue(self.user.is_verified)
    
    def test_premium_verification_level(self):
        """Test user with full verification"""
        self.user.is_email_verified = True
        self.user.is_phone_verified = True
        self.user.identity_verified = True
        self.user.save()
        self.user.update_verification_level()
        
        self.assertEqual(self.user.verification_level, 'premium')
        self.assertEqual(self.user.trust_score, 100)
        self.assertTrue(self.user.has_full_verification)


class StripeIdentityAPITests(APITestCase):
    """Test Stripe Identity API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Generate JWT token for authentication
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    @patch('apps.users.stripe_config.create_verification_session')
    def test_create_verification_session(self, mock_create_session):
        """Test creating a new verification session"""
        mock_session = MagicMock()
        mock_session.id = 'vs_test_123'
        mock_session.client_secret = 'vs_test_secret'
        mock_session.status = 'requires_input'
        mock_create_session.return_value = mock_session
        
        url = reverse('create-identity-session')
        response = self.client.post(url, {
            'return_url': 'http://localhost:3000/verification/complete',
            'refresh_url': 'http://localhost:3000/verification'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['session_id'], 'vs_test_123')
        self.assertEqual(response.data['client_secret'], 'vs_test_secret')
        
        # Check that verification record was created
        verification = IdentityVerification.objects.get(user=self.user)
        self.assertEqual(verification.stripe_verification_session_id, 'vs_test_123')
    
    def test_get_verification_status(self):
        """Test getting verification status"""
        url = reverse('get-identity-status')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('email_verified', response.data)
        self.assertIn('phone_verified', response.data)
        self.assertIn('identity_verified', response.data)
        self.assertIn('verification_level', response.data)
        self.assertIn('trust_score', response.data)
    
    def test_get_verification_benefits(self):
        """Test getting verification benefits"""
        url = reverse('get-verification-benefits')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('current_level', response.data)
        self.assertIn('levels', response.data)
        self.assertIn('basic', response.data['levels'])
        self.assertIn('standard', response.data['levels'])
        self.assertIn('premium', response.data['levels'])
    
    def test_cancel_verification(self):
        """Test canceling a verification session"""
        verification = IdentityVerification.objects.create(
            user=self.user,
            verification_type='full',
            status='pending',
            stripe_verification_session_id='vs_test_123'
        )
        
        url = reverse('cancel-verification', kwargs={'verification_id': verification.id})
        
        with patch('apps.users.stripe_config.cancel_verification_session') as mock_cancel:
            mock_cancel.return_value = MagicMock(status='canceled')
            response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        verification.refresh_from_db()
        self.assertEqual(verification.status, 'canceled')
    
    def test_unauthorized_access(self):
        """Test that unauthenticated users cannot access endpoints"""
        self.client.credentials()  # Remove authentication
        
        url = reverse('create-identity-session')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class StripeWebhookTests(TestCase):
    """Test Stripe webhook handling"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        self.verification = IdentityVerification.objects.create(
            user=self.user,
            verification_type='full',
            status='pending',
            stripe_verification_session_id='vs_test_123'
        )
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_verification_verified(self, mock_construct_event):
        """Test handling successful verification webhook"""
        mock_event = {
            'type': 'identity.verification_session.verified',
            'data': {
                'object': {
                    'id': 'vs_test_123',
                    'status': 'verified',
                    'last_verification_report': 'vr_test_123',
                    'verified_outputs': {
                        'document': {
                            'type': 'passport',
                            'issuing_country': 'US'
                        }
                    }
                }
            }
        }
        mock_construct_event.return_value = mock_event
        
        url = reverse('webhook-stripe-identity-new')
        response = self.client.post(
            url,
            data=json.dumps({}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that verification was updated
        self.verification.refresh_from_db()
        self.assertEqual(self.verification.status, 'verified')
        self.assertIsNotNone(self.verification.verified_at)
        
        # Check that user was updated
        self.user.refresh_from_db()
        self.assertTrue(self.user.identity_verified)
        self.assertEqual(self.user.verification_level, 'basic')  # Only identity verified
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_verification_failed(self, mock_construct_event):
        """Test handling failed verification webhook"""
        mock_event = {
            'type': 'identity.verification_session.failed',
            'data': {
                'object': {
                    'id': 'vs_test_123',
                    'status': 'failed',
                    'last_error': {
                        'reason': 'document_unverified'
                    }
                }
            }
        }
        mock_construct_event.return_value = mock_event
        
        url = reverse('webhook-stripe-identity-new')
        response = self.client.post(
            url,
            data=json.dumps({}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.verification.refresh_from_db()
        self.assertEqual(self.verification.status, 'failed')
        self.assertEqual(self.verification.failure_reason, 'document_unverified')
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_verification_requires_input(self, mock_construct_event):
        """Test handling requires input webhook"""
        mock_event = {
            'type': 'identity.verification_session.requires_input',
            'data': {
                'object': {
                    'id': 'vs_test_123',
                    'status': 'requires_input'
                }
            }
        }
        mock_construct_event.return_value = mock_event
        
        url = reverse('webhook-stripe-identity-new')
        response = self.client.post(
            url,
            data=json.dumps({}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.verification.refresh_from_db()
        self.assertEqual(self.verification.status, 'requires_input')
    
    def test_webhook_invalid_signature(self):
        """Test webhook with invalid signature"""
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.side_effect = stripe.error.SignatureVerificationError('Invalid signature', None)
            
            url = reverse('webhook-stripe-identity-new')
            response = self.client.post(
                url,
                data=json.dumps({}),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='invalid_signature'
            )
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class VerificationIntegrationTests(APITestCase):
    """Integration tests for the complete verification flow"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            user_type='landlord'
        )
        
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    @patch('apps.users.stripe_config.STRIPE_IDENTITY_CONFIG')
    def test_verification_disabled(self, mock_config):
        """Test behavior when Stripe Identity is disabled"""
        mock_config.__getitem__.return_value = False
        
        url = reverse('create-identity-session')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
    
    def test_existing_pending_verification(self):
        """Test that existing pending verification is reused"""
        existing = IdentityVerification.objects.create(
            user=self.user,
            verification_type='full',
            status='pending',
            stripe_verification_session_id='vs_existing_123'
        )
        
        with patch('apps.users.stripe_config.retrieve_verification_session') as mock_retrieve:
            mock_session = MagicMock()
            mock_session.id = 'vs_existing_123'
            mock_session.client_secret = 'existing_secret'
            mock_session.status = 'requires_input'
            mock_retrieve.return_value = mock_session
            
            url = reverse('create-identity-session')
            response = self.client.post(url)
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['session_id'], 'vs_existing_123')
            self.assertTrue(response.data['existing'])
    
    def test_full_verification_flow(self):
        """Test complete verification flow from creation to verified status"""
        # Step 1: Create session
        with patch('apps.users.stripe_config.create_verification_session') as mock_create:
            mock_session = MagicMock()
            mock_session.id = 'vs_test_flow'
            mock_session.client_secret = 'flow_secret'
            mock_session.status = 'requires_input'
            mock_create.return_value = mock_session
            
            url = reverse('create-identity-session')
            response = self.client.post(url)
            
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            verification_id = response.data['verification_id']
        
        # Step 2: Simulate webhook for verification success
        verification = IdentityVerification.objects.get(id=verification_id)
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = {
                'type': 'identity.verification_session.verified',
                'data': {
                    'object': {
                        'id': 'vs_test_flow',
                        'status': 'verified',
                        'last_verification_report': 'vr_test_flow'
                    }
                }
            }
            mock_construct.return_value = mock_event
            
            webhook_url = reverse('webhook-stripe-identity-new')
            webhook_response = self.client.post(
                webhook_url,
                data=json.dumps({}),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='test_signature'
            )
            
            self.assertEqual(webhook_response.status_code, status.HTTP_200_OK)
        
        # Step 3: Check final status
        status_url = reverse('get-identity-status')
        status_response = self.client.get(status_url)
        
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertTrue(status_response.data['identity_verified'])
        
        # Verify user trust score was updated
        self.user.refresh_from_db()
        self.assertTrue(self.user.identity_verified)
        # Since only identity is verified (not email/phone in this test)
        self.assertEqual(self.user.verification_level, 'none')


# Add this import at the top if not already present
import stripe
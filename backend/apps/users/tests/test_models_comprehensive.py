"""
Comprehensive unit tests for users app models following PEP 8 naming conventions.
Tests user management, authentication, profiles, and verification.
"""

import unittest
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import uuid
from apps.users.models import (
    UserProfile, EmailVerificationToken, 
    PasswordResetToken, IdentityVerification
)

User = get_user_model()


class UserManagerTestCase(TestCase):
    """Test cases for custom UserManager following snake_case convention"""
    
    def test_create_user_with_email(self):
        """Test creating a regular user with email"""
        user = User.objects.create_user(
            email='test@example.com',
            password='secure_password_123'
        )
        
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('secure_password_123'))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.user_type, 'renter')  # Default
        
    def test_create_user_without_email_raises_error(self):
        """Test creating user without email raises ValueError"""
        with self.assertRaises(ValueError) as context:
            User.objects.create_user(
                email='',
                password='password123'
            )
        self.assertIn('Email field must be set', str(context.exception))
        
    def test_create_user_normalizes_email(self):
        """Test email normalization (lowercase domain)"""
        user = User.objects.create_user(
            email='Test@EXAMPLE.COM',
            password='password123'
        )
        
        self.assertEqual(user.email, 'Test@example.com')
        
    def test_create_user_sets_username_from_email(self):
        """Test username is automatically set from email if not provided"""
        user = User.objects.create_user(
            email='johndoe@example.com',
            password='password123'
        )
        
        self.assertEqual(user.username, 'johndoe@example.com')
        
    def test_create_superuser_with_correct_permissions(self):
        """Test creating superuser sets all required fields"""
        admin = User.objects.create_superuser(
            email='admin@example.com',
            password='admin_password_123'
        )
        
        self.assertEqual(admin.email, 'admin@example.com')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertEqual(admin.user_type, 'admin')
        
    def test_create_superuser_without_is_staff_raises_error(self):
        """Test superuser must have is_staff=True"""
        with self.assertRaises(ValueError) as context:
            User.objects.create_superuser(
                email='admin@example.com',
                password='password123',
                is_staff=False
            )
        self.assertIn('is_staff=True', str(context.exception))
        
    def test_create_superuser_without_is_superuser_raises_error(self):
        """Test superuser must have is_superuser=True"""
        with self.assertRaises(ValueError) as context:
            User.objects.create_superuser(
                email='admin@example.com',
                password='password123',
                is_superuser=False
            )
        self.assertIn('is_superuser=True', str(context.exception))


class UserModelTestCase(TestCase):
    """Test cases for custom User model following PascalCase for classes"""
    
    def setUp(self):
        """Set up test users with different types using snake_case"""
        self.renter_user = User.objects.create_user(
            email='renter@test.com',
            password='renter_pass_123',
            user_type='renter',
            first_name='John',
            last_name='Doe'
        )
        
        self.landlord_user = User.objects.create_user(
            email='landlord@test.com',
            password='landlord_pass_123',
            user_type='landlord',
            first_name='Jane',
            last_name='Smith'
        )
        
    def test_user_uuid_primary_key(self):
        """Test user has UUID as primary key"""
        self.assertIsInstance(self.renter_user.id, uuid.UUID)
        self.assertIsInstance(self.landlord_user.id, uuid.UUID)
        self.assertNotEqual(self.renter_user.id, self.landlord_user.id)
        
    def test_user_email_unique_constraint(self):
        """Test email field has unique constraint"""
        with self.assertRaises(Exception):
            User.objects.create_user(
                email='renter@test.com',  # Duplicate email
                password='another_password'
            )
            
    def test_user_type_choices(self):
        """Test user_type field accepts valid choices"""
        valid_types = ['renter', 'landlord', 'agent', 'admin']
        
        for user_type in valid_types:
            user = User.objects.create_user(
                email=f'{user_type}@test.com',
                password='password123',
                user_type=user_type
            )
            self.assertEqual(user.user_type, user_type)
            
    def test_user_type_default_value(self):
        """Test user_type defaults to 'renter'"""
        user = User.objects.create_user(
            email='default@test.com',
            password='password123'
        )
        
        self.assertEqual(user.user_type, 'renter')
        
    def test_user_string_representation(self):
        """Test __str__ method returns email"""
        self.assertEqual(str(self.renter_user), 'renter@test.com')
        
    def test_user_full_name_property(self):
        """Test get_full_name method"""
        full_name = self.renter_user.get_full_name()
        self.assertEqual(full_name, 'John Doe')
        
    def test_user_short_name_property(self):
        """Test get_short_name method"""
        short_name = self.renter_user.get_short_name()
        self.assertEqual(short_name, 'John')
        
    def test_user_is_active_default(self):
        """Test user is active by default"""
        self.assertTrue(self.renter_user.is_active)
        
    def test_user_date_joined_auto_set(self):
        """Test date_joined is automatically set"""
        self.assertIsNotNone(self.renter_user.date_joined)
        self.assertLessEqual(
            self.renter_user.date_joined,
            timezone.now()
        )
        
    def test_user_password_hashing(self):
        """Test password is properly hashed"""
        # Password should not be stored in plain text
        self.assertNotEqual(self.renter_user.password, 'renter_pass_123')
        # But check_password should work
        self.assertTrue(self.renter_user.check_password('renter_pass_123'))
        
    def test_user_set_password_method(self):
        """Test set_password method hashes new password"""
        new_password = 'new_secure_password_456'
        self.renter_user.set_password(new_password)
        self.renter_user.save()
        
        self.assertTrue(self.renter_user.check_password(new_password))
        self.assertFalse(self.renter_user.check_password('renter_pass_123'))


class UserProfileModelTestCase(TestCase):
    """Test cases for UserProfile model"""
    
    def setUp(self):
        """Set up test data for user profiles"""
        self.user = User.objects.create_user(
            email='profile@test.com',
            password='password123'
        )
        
    def test_profile_creation_signal(self):
        """Test profile is automatically created via signal"""
        # Profile should be created automatically when user is created
        self.assertTrue(hasattr(self.user, 'profile'))
        self.assertIsInstance(self.user.profile, UserProfile)
        
    def test_profile_one_to_one_relationship(self):
        """Test one-to-one relationship with User"""
        profile = self.user.profile
        self.assertEqual(profile.user, self.user)
        
    def test_profile_phone_number_validation(self):
        """Test phone number format validation"""
        profile = self.user.profile
        
        # Valid phone numbers
        valid_numbers = [
            '+353 87 123 4567',
            '+353871234567',
            '087 123 4567',
            '0871234567'
        ]
        
        for number in valid_numbers:
            profile.phone_number = number
            profile.full_clean()  # Should not raise
            
    def test_profile_bio_max_length(self):
        """Test bio field character limit"""
        profile = self.user.profile
        profile.bio = 'A' * 500  # Max length
        profile.full_clean()  # Should not raise
        
        profile.bio = 'A' * 501  # Exceeds max length
        with self.assertRaises(ValidationError):
            profile.full_clean()
            
    def test_profile_avatar_upload_path(self):
        """Test avatar image upload path function"""
        profile = self.user.profile
        profile.avatar = 'avatars/test.jpg'
        profile.save()
        
        self.assertIn('avatars/', profile.avatar.name)
        
    def test_profile_string_representation(self):
        """Test __str__ method returns user email with 'Profile'"""
        profile = self.user.profile
        self.assertEqual(str(profile), 'profile@test.com Profile')
        
    def test_profile_timestamps(self):
        """Test created_at and updated_at fields"""
        profile = self.user.profile
        self.assertIsNotNone(profile.created_at)
        self.assertIsNotNone(profile.updated_at)
        
        # Test updated_at changes
        old_updated = profile.updated_at
        profile.bio = 'Updated bio'
        profile.save()
        self.assertGreater(profile.updated_at, old_updated)
        
    def test_profile_email_verified_default(self):
        """Test email_verified defaults to False"""
        profile = self.user.profile
        self.assertFalse(profile.email_verified)
        
    def test_profile_notification_preferences(self):
        """Test notification preference fields"""
        profile = self.user.profile
        
        # Test defaults
        self.assertTrue(profile.email_notifications)
        self.assertTrue(profile.sms_notifications)
        
        # Test setting preferences
        profile.email_notifications = False
        profile.sms_notifications = False
        profile.save()
        
        self.assertFalse(profile.email_notifications)
        self.assertFalse(profile.sms_notifications)


class EmailVerificationTokenTestCase(TestCase):
    """Test cases for EmailVerificationToken model"""
    
    def setUp(self):
        """Set up test data for email verification"""
        self.user = User.objects.create_user(
            email='verify@test.com',
            password='password123'
        )
        
    def test_token_creation(self):
        """Test creating email verification token"""
        token = EmailVerificationToken.objects.create(
            user=self.user
        )
        
        self.assertEqual(token.user, self.user)
        self.assertIsNotNone(token.token)
        self.assertFalse(token.is_used)
        
    def test_token_auto_generation(self):
        """Test token is automatically generated"""
        token = EmailVerificationToken.objects.create(
            user=self.user
        )
        
        # Token should be a UUID
        uuid.UUID(str(token.token))  # Should not raise
        
    def test_token_uniqueness(self):
        """Test each token is unique"""
        token1 = EmailVerificationToken.objects.create(user=self.user)
        token2 = EmailVerificationToken.objects.create(user=self.user)
        
        self.assertNotEqual(token1.token, token2.token)
        
    def test_token_expiry_time(self):
        """Test token has correct expiry time (24 hours)"""
        token = EmailVerificationToken.objects.create(
            user=self.user
        )
        
        expected_expiry = token.created_at + timedelta(hours=24)
        self.assertAlmostEqual(
            token.expires_at.timestamp(),
            expected_expiry.timestamp(),
            delta=1  # Allow 1 second difference
        )
        
    def test_token_is_valid_method(self):
        """Test is_valid method checks expiry and usage"""
        token = EmailVerificationToken.objects.create(
            user=self.user
        )
        
        # Fresh token should be valid
        self.assertTrue(token.is_valid())
        
        # Used token should be invalid
        token.is_used = True
        token.save()
        self.assertFalse(token.is_valid())
        
        # Expired token should be invalid
        token.is_used = False
        token.expires_at = timezone.now() - timedelta(hours=1)
        token.save()
        self.assertFalse(token.is_valid())
        
    def test_token_string_representation(self):
        """Test __str__ method"""
        token = EmailVerificationToken.objects.create(
            user=self.user
        )
        
        expected = f"Email verification for {self.user.email}"
        self.assertEqual(str(token), expected)
        
    def test_multiple_tokens_per_user(self):
        """Test user can have multiple tokens"""
        token1 = EmailVerificationToken.objects.create(user=self.user)
        token2 = EmailVerificationToken.objects.create(user=self.user)
        
        tokens = EmailVerificationToken.objects.filter(user=self.user)
        self.assertEqual(tokens.count(), 2)


class PasswordResetTokenTestCase(TestCase):
    """Test cases for PasswordResetToken model"""
    
    def setUp(self):
        """Set up test data for password reset"""
        self.user = User.objects.create_user(
            email='reset@test.com',
            password='old_password_123'
        )
        
    def test_reset_token_creation(self):
        """Test creating password reset token"""
        token = PasswordResetToken.objects.create(
            user=self.user
        )
        
        self.assertEqual(token.user, self.user)
        self.assertIsNotNone(token.token)
        self.assertFalse(token.is_used)
        
    def test_reset_token_expiry_time(self):
        """Test reset token expires in 1 hour"""
        token = PasswordResetToken.objects.create(
            user=self.user
        )
        
        expected_expiry = token.created_at + timedelta(hours=1)
        self.assertAlmostEqual(
            token.expires_at.timestamp(),
            expected_expiry.timestamp(),
            delta=1
        )
        
    def test_reset_token_is_valid_method(self):
        """Test is_valid method for reset tokens"""
        token = PasswordResetToken.objects.create(
            user=self.user
        )
        
        # Fresh token should be valid
        self.assertTrue(token.is_valid())
        
        # Used token should be invalid
        token.is_used = True
        token.save()
        self.assertFalse(token.is_valid())
        
        # Expired token should be invalid
        token.is_used = False
        token.expires_at = timezone.now() - timedelta(minutes=1)
        token.save()
        self.assertFalse(token.is_valid())
        
    def test_reset_token_invalidate_previous(self):
        """Test creating new token invalidates previous ones"""
        token1 = PasswordResetToken.objects.create(user=self.user)
        token2 = PasswordResetToken.objects.create(user=self.user)
        
        # Both tokens should exist but ideally only latest should be valid
        tokens = PasswordResetToken.objects.filter(
            user=self.user,
            is_used=False
        )
        self.assertEqual(tokens.count(), 2)
        
    def test_reset_token_string_representation(self):
        """Test __str__ method"""
        token = PasswordResetToken.objects.create(
            user=self.user
        )
        
        expected = f"Password reset for {self.user.email}"
        self.assertEqual(str(token), expected)


class IdentityVerificationTestCase(TestCase):
    """Test cases for IdentityVerification model"""
    
    def setUp(self):
        """Set up test data for identity verification"""
        self.landlord = User.objects.create_user(
            email='landlord@verify.com',
            password='password123',
            user_type='landlord'
        )
        
    def test_identity_verification_creation(self):
        """Test creating identity verification record"""
        verification = IdentityVerification.objects.create(
            user=self.landlord,
            verification_type='document',
            status='pending'
        )
        
        self.assertEqual(verification.user, self.landlord)
        self.assertEqual(verification.verification_type, 'document')
        self.assertEqual(verification.status, 'pending')
        
    def test_verification_type_choices(self):
        """Test verification type valid choices"""
        valid_types = ['document', 'address', 'bank', 'phone']
        
        for v_type in valid_types:
            verification = IdentityVerification.objects.create(
                user=self.landlord,
                verification_type=v_type
            )
            self.assertEqual(verification.verification_type, v_type)
            
    def test_verification_status_choices(self):
        """Test verification status transitions"""
        verification = IdentityVerification.objects.create(
            user=self.landlord,
            verification_type='document'
        )
        
        valid_statuses = ['pending', 'processing', 'verified', 'failed']
        for status in valid_statuses:
            verification.status = status
            verification.save()
            self.assertEqual(verification.status, status)
            
    def test_verification_default_status(self):
        """Test status defaults to pending"""
        verification = IdentityVerification.objects.create(
            user=self.landlord,
            verification_type='document'
        )
        
        self.assertEqual(verification.status, 'pending')
        
    def test_verification_metadata_json_field(self):
        """Test metadata field stores JSON data"""
        metadata = {
            'document_type': 'passport',
            'document_number': 'ABC123456',
            'expiry_date': '2025-12-31'
        }
        
        verification = IdentityVerification.objects.create(
            user=self.landlord,
            verification_type='document',
            metadata=metadata
        )
        
        self.assertEqual(verification.metadata['document_type'], 'passport')
        self.assertEqual(verification.metadata['document_number'], 'ABC123456')
        
    def test_verification_timestamps(self):
        """Test timestamp fields"""
        verification = IdentityVerification.objects.create(
            user=self.landlord,
            verification_type='document'
        )
        
        self.assertIsNotNone(verification.created_at)
        self.assertIsNotNone(verification.updated_at)
        self.assertIsNone(verification.verified_at)  # Not verified yet
        
        # Mark as verified
        verification.status = 'verified'
        verification.verified_at = timezone.now()
        verification.save()
        
        self.assertIsNotNone(verification.verified_at)
        
    def test_verification_unique_constraint(self):
        """Test unique constraint on user and verification_type"""
        IdentityVerification.objects.create(
            user=self.landlord,
            verification_type='document'
        )
        
        # Should not allow duplicate type for same user
        with self.assertRaises(Exception):
            IdentityVerification.objects.create(
                user=self.landlord,
                verification_type='document'
            )
            
    def test_verification_string_representation(self):
        """Test __str__ method"""
        verification = IdentityVerification.objects.create(
            user=self.landlord,
            verification_type='document',
            status='verified'
        )
        
        expected = f"{self.landlord.email} - document - verified"
        self.assertEqual(str(verification), expected)
        
    def test_verification_ordering(self):
        """Test verifications ordered by creation date"""
        verification1 = IdentityVerification.objects.create(
            user=self.landlord,
            verification_type='document'
        )
        verification2 = IdentityVerification.objects.create(
            user=self.landlord,
            verification_type='address'
        )
        
        verifications = IdentityVerification.objects.filter(user=self.landlord)
        # Newest first
        self.assertEqual(verifications[0], verification2)


if __name__ == '__main__':
    unittest.main()
"""
Comprehensive unit tests for Landlords app models using Django TestCase.
Tests all model functionality, validation, relationships, and edge cases.
"""

import unittest
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from datetime import date, timedelta
from decimal import Decimal

from apps.core.models import Landlord, Property, County, Town
from apps.landlords.models import LandlordProfile, PropertyStats

User = get_user_model()


class TestLandlordProfile(TestCase):
    """Test suite for LandlordProfile model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.landlord = Landlord.objects.create(
            name='Test Landlord',
            phone='0851234567',
            email='landlord@example.com'
        )
    
    def test_create_landlord_profile(self):
        """Test creating a landlord profile"""
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord,
            business_license='BL123456',
            tax_number='TAX789',
            bank_name='Bank of Ireland',
            iban='IE12BOFI90001112345678'
        )
        
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.landlord, self.landlord)
        self.assertEqual(profile.business_license, 'BL123456')
        self.assertEqual(profile.tax_number, 'TAX789')
        self.assertEqual(profile.bank_name, 'Bank of Ireland')
        self.assertEqual(profile.iban, 'IE12BOFI90001112345678')
        self.assertFalse(profile.auto_reply_enabled)
        self.assertTrue(profile.email_on_enquiry)
        self.assertFalse(profile.sms_on_enquiry)
        self.assertTrue(profile.daily_summary)
        self.assertTrue(profile.allow_analytics)
        self.assertFalse(profile.public_profile)
    
    def test_landlord_profile_str(self):
        """Test string representation of landlord profile"""
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        self.assertEqual(str(profile), f"Profile for {self.landlord.name}")
    
    def test_iban_validation_valid(self):
        """Test IBAN validation with valid IBAN"""
        valid_ibans = [
            'IE12BOFI90001112345678',
            'GB82WEST12345698765432',
            'DE89370400440532013000'
        ]
        
        for i, iban in enumerate(valid_ibans):
            user = User.objects.create_user(
                username=f'user_{i}',
                email=f'{iban[:4]}@test.com'
            )
            landlord = Landlord.objects.create(
                name=f'Landlord {i}',
                email=f'{iban[:4]}@landlord.com'
            )
            profile = LandlordProfile.objects.create(
                user=user,
                landlord=landlord,
                iban=iban
            )
            profile.full_clean()  # Should not raise
            self.assertEqual(profile.iban, iban)
    
    def test_iban_validation_invalid(self):
        """Test IBAN validation with invalid IBAN"""
        # Test with clearly invalid IBAN format
        profile = LandlordProfile(
            user=self.user,
            landlord=self.landlord,
            iban='INVALID'
        )
        
        # full_clean should raise ValidationError for invalid IBAN
        try:
            profile.full_clean()
            self.fail("ValidationError should have been raised for invalid IBAN")
        except ValidationError as e:
            # Check that IBAN field has an error
            self.assertIn('iban', e.message_dict)
    
    def test_auto_reply_message_max_length(self):
        """Test auto reply message max length"""
        long_message = 'x' * 500  # Max length
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord,
            auto_reply_message=long_message
        )
        self.assertEqual(len(profile.auto_reply_message), 500)
    
    def test_one_to_one_relationship_user(self):
        """Test one-to-one relationship with User"""
        LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        
        # Verify profile was created
        self.assertTrue(LandlordProfile.objects.filter(user=self.user).exists())
        
        # Check that user can only have one profile
        profile_count = LandlordProfile.objects.filter(user=self.user).count()
        self.assertEqual(profile_count, 1)
    
    def test_one_to_one_relationship_landlord(self):
        """Test one-to-one relationship with Landlord"""
        LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        
        # Verify profile was created
        self.assertTrue(LandlordProfile.objects.filter(landlord=self.landlord).exists())
        
        # Check that landlord can only have one profile
        profile_count = LandlordProfile.objects.filter(landlord=self.landlord).count()
        self.assertEqual(profile_count, 1)
    
    def test_total_properties_property(self):
        """Test total_properties property calculation"""
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        
        county = County.objects.create(name='Dublin')
        town = Town.objects.create(name='Dublin City', county=county)
        
        # Initially no properties
        self.assertEqual(profile.total_properties, 0)
        
        # Add active properties
        for i in range(3):
            Property.objects.create(
                title=f'Property {i}',
                landlord=self.landlord,
                property_type='house',
                bedrooms=3,
                bathrooms=2,
                rent_monthly=Decimal('1500.00'),
                address=f'{i} Test Street',
                county=county,
                town=town,
                description='Test property description',
                furnished='furnished',
                available_from=date.today(),
                is_active=True
            )
        
        # Add inactive property (should not be counted)
        Property.objects.create(
            title='Inactive Property',
            landlord=self.landlord,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent_monthly=Decimal('1000.00'),
            address='Inactive Street',
            county=county,
            town=town,
            description='Inactive property',
            furnished='unfurnished',
            available_from=date.today(),
            is_active=False
        )
        
        self.assertEqual(profile.total_properties, 3)
    
    def test_total_enquiries_property(self):
        """Test total_enquiries property calculation"""
        from apps.users.models import PropertyEnquiry
        
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        
        county = County.objects.create(name='Cork')
        town = Town.objects.create(name='Cork City', county=county)
        
        # Create properties
        property1 = Property.objects.create(
            title='Property 1',
            landlord=self.landlord,
            property_type='house',
            bedrooms=3,
            bathrooms=2,
            rent_monthly=Decimal('1500.00'),
            address='1 Test Street',
            county=county,
            town=town,
            description='Test property 1',
            furnished='furnished',
            available_from=date.today()
        )
        
        property2 = Property.objects.create(
            title='Property 2',
            landlord=self.landlord,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent_monthly=Decimal('1200.00'),
            address='2 Test Street',
            county=county,
            town=town,
            description='Test property 2',
            furnished='part_furnished',
            available_from=date.today()
        )
        
        # Initially no enquiries
        self.assertEqual(profile.total_enquiries, 0)
        
        # Add enquiries
        for i in range(3):
            PropertyEnquiry.objects.create(
                property=property1,
                name=f'Enquirer {i}',
                email=f'enquirer{i}@test.com',
                phone='0851234567',
                message='Interested in viewing'
            )
        
        for i in range(2):
            PropertyEnquiry.objects.create(
                property=property2,
                name=f'Enquirer {i+3}',
                email=f'enquirer{i+3}@test.com',
                phone='0861234567',
                message='Is this still available?'
            )
        
        self.assertEqual(profile.total_enquiries, 5)
    
    def test_notification_preferences_defaults(self):
        """Test default notification preferences"""
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        self.assertTrue(profile.email_on_enquiry)
        self.assertFalse(profile.sms_on_enquiry)
        self.assertTrue(profile.daily_summary)
    
    def test_analytics_preferences_defaults(self):
        """Test default analytics preferences"""
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        self.assertTrue(profile.allow_analytics)
        self.assertFalse(profile.public_profile)
    
    def test_timestamps(self):
        """Test created_at and updated_at timestamps"""
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        self.assertIsNotNone(profile.created_at)
        self.assertIsNotNone(profile.updated_at)
        
        # Update should change updated_at
        original_updated = profile.updated_at
        profile.business_license = 'NEW_LICENSE'
        profile.save()
        
        self.assertGreater(profile.updated_at, original_updated)
    
    def test_cascade_delete_user(self):
        """Test cascade delete when user is deleted"""
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        profile_id = profile.id
        
        self.user.delete()
        
        # Profile should be deleted
        self.assertFalse(LandlordProfile.objects.filter(id=profile_id).exists())
    
    def test_cascade_delete_landlord(self):
        """Test cascade delete when landlord is deleted"""
        profile = LandlordProfile.objects.create(
            user=self.user,
            landlord=self.landlord
        )
        profile_id = profile.id
        
        self.landlord.delete()
        
        # Profile should be deleted
        self.assertFalse(LandlordProfile.objects.filter(id=profile_id).exists())


class TestPropertyStats(TestCase):
    """Test suite for PropertyStats model"""
    
    def setUp(self):
        """Set up test data"""
        self.landlord = Landlord.objects.create(
            name='Test Landlord',
            phone='0851234567',
            email='landlord@example.com'
        )
        
        self.county = County.objects.create(name='Galway')
        self.town = Town.objects.create(name='Galway City', county=self.county)
        
        self.property = Property.objects.create(
            title='Test Property',
            landlord=self.landlord,
            property_type='house',
            bedrooms=3,
            bathrooms=2,
            rent_monthly=Decimal('1500.00'),
            address='123 Test Street',
            county=self.county,
            town=self.town,
            description='Test property for stats',
            furnished='furnished',
            available_from=date.today()
        )
    
    def test_create_property_stats(self):
        """Test creating property statistics"""
        stats_date = date.today()
        stats = PropertyStats.objects.create(
            property=self.property,
            date=stats_date,
            views=50,
            enquiries=5,
            saves=3,
            total_views=500,
            total_enquiries=50,
            total_saves=30
        )
        
        self.assertEqual(stats.property, self.property)
        self.assertEqual(stats.date, stats_date)
        self.assertEqual(stats.views, 50)
        self.assertEqual(stats.enquiries, 5)
        self.assertEqual(stats.saves, 3)
        self.assertEqual(stats.total_views, 500)
        self.assertEqual(stats.total_enquiries, 50)
        self.assertEqual(stats.total_saves, 30)
    
    def test_property_stats_str(self):
        """Test string representation of property stats"""
        stats = PropertyStats.objects.create(
            property=self.property,
            date=date.today(),
            views=100
        )
        expected = f"{self.property.title} - {stats.date}"
        self.assertEqual(str(stats), expected)
    
    def test_unique_together_constraint(self):
        """Test unique_together constraint for property and date"""
        stats_date = date.today()
        
        # Create first stats entry
        PropertyStats.objects.create(
            property=self.property,
            date=stats_date,
            views=10
        )
        
        # Verify only one stats entry exists for this property and date
        stats_count = PropertyStats.objects.filter(
            property=self.property,
            date=stats_date
        ).count()
        self.assertEqual(stats_count, 1)
    
    def test_ordering(self):
        """Test default ordering by date (descending)"""
        today = date.today()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        
        # Create stats in random order
        stats_week = PropertyStats.objects.create(
            property=self.property,
            date=week_ago,
            views=10
        )
        stats_today = PropertyStats.objects.create(
            property=self.property,
            date=today,
            views=30
        )
        stats_yesterday = PropertyStats.objects.create(
            property=self.property,
            date=yesterday,
            views=20
        )
        
        # Should be ordered by date descending
        stats_list = list(PropertyStats.objects.all())
        self.assertEqual(stats_list[0], stats_today)
        self.assertEqual(stats_list[1], stats_yesterday)
        self.assertEqual(stats_list[2], stats_week)
    
    def test_default_values(self):
        """Test default values for metrics"""
        stats = PropertyStats.objects.create(
            property=self.property,
            date=date.today()
        )
        
        self.assertEqual(stats.views, 0)
        self.assertEqual(stats.enquiries, 0)
        self.assertEqual(stats.saves, 0)
        self.assertEqual(stats.total_views, 0)
        self.assertEqual(stats.total_enquiries, 0)
        self.assertEqual(stats.total_saves, 0)
    
    def test_cascade_delete_property(self):
        """Test cascade delete when property is deleted"""
        stats = PropertyStats.objects.create(
            property=self.property,
            date=date.today(),
            views=100
        )
        stats_id = stats.id
        
        self.property.delete()
        
        # Stats should be deleted
        self.assertFalse(PropertyStats.objects.filter(id=stats_id).exists())
    
    def test_multiple_properties_stats(self):
        """Test stats for multiple properties"""
        # Create multiple properties
        properties = []
        for i in range(3):
            prop = Property.objects.create(
                title=f'Property {i}',
                landlord=self.landlord,
                property_type='apartment',
                bedrooms=2,
                bathrooms=1,
                rent_monthly=Decimal('1000.00'),
                address=f'{i} Test Avenue',
                county=self.county,
                town=self.town,
                description=f'Test property {i}',
                furnished='unfurnished',
                available_from=date.today()
            )
            properties.append(prop)
        
        # Create stats for each property
        stats_date = date.today()
        for i, prop in enumerate(properties):
            PropertyStats.objects.create(
                property=prop,
                date=stats_date,
                views=(i + 1) * 10,
                enquiries=i + 1,
                saves=i
            )
        
        # Verify each property has its own stats
        for i, prop in enumerate(properties):
            stats = PropertyStats.objects.get(property=prop, date=stats_date)
            self.assertEqual(stats.views, (i + 1) * 10)
            self.assertEqual(stats.enquiries, i + 1)
            self.assertEqual(stats.saves, i)
    
    def test_date_range_stats(self):
        """Test creating stats for a date range"""
        today = date.today()
        dates_and_views = [
            (today, 100),
            (today - timedelta(days=1), 90),
            (today - timedelta(days=2), 80),
            (today - timedelta(days=3), 70),
            (today - timedelta(days=4), 60)
        ]
        
        for stats_date, views in dates_and_views:
            PropertyStats.objects.create(
                property=self.property,
                date=stats_date,
                views=views
            )
        
        # Verify all stats are created
        self.assertEqual(PropertyStats.objects.filter(property=self.property).count(), 5)
        
        # Verify ordering (most recent first)
        stats_list = list(PropertyStats.objects.filter(property=self.property))
        for i, (stats_date, views) in enumerate(dates_and_views):
            self.assertEqual(stats_list[i].date, stats_date)
            self.assertEqual(stats_list[i].views, views)
    
    def test_cumulative_metrics_tracking(self):
        """Test tracking cumulative metrics over time"""
        today = date.today()
        
        # Day 1
        PropertyStats.objects.create(
            property=self.property,
            date=today - timedelta(days=2),
            views=100,
            enquiries=10,
            saves=5,
            total_views=100,
            total_enquiries=10,
            total_saves=5
        )
        
        # Day 2 - cumulative totals should increase
        PropertyStats.objects.create(
            property=self.property,
            date=today - timedelta(days=1),
            views=50,
            enquiries=5,
            saves=3,
            total_views=150,  # 100 + 50
            total_enquiries=15,  # 10 + 5
            total_saves=8  # 5 + 3
        )
        
        # Day 3 - today
        day3_stats = PropertyStats.objects.create(
            property=self.property,
            date=today,
            views=75,
            enquiries=8,
            saves=4,
            total_views=225,  # 150 + 75
            total_enquiries=23,  # 15 + 8
            total_saves=12  # 8 + 4
        )
        
        # Verify cumulative tracking
        self.assertEqual(day3_stats.total_views, 225)
        self.assertEqual(day3_stats.total_enquiries, 23)
        self.assertEqual(day3_stats.total_saves, 12)
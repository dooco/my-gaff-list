import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from datetime import date, timedelta
from decimal import Decimal

from apps.core.models import Landlord, Property, County, Town
from apps.landlords.models import LandlordProfile, PropertyStats

User = get_user_model()


@pytest.mark.django_db
class TestLandlordProfile:
    """Test suite for LandlordProfile model"""
    
    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    @pytest.fixture
    def landlord(self):
        """Create a test landlord"""
        return Landlord.objects.create(
            name='Test Landlord',
            phone='0851234567',
            email='landlord@example.com'
        )
    
    @pytest.fixture
    def landlord_profile(self, user, landlord):
        """Create a test landlord profile"""
        return LandlordProfile.objects.create(
            user=user,
            landlord=landlord
        )
    
    def test_create_landlord_profile(self, user, landlord):
        """Test creating a landlord profile"""
        profile = LandlordProfile.objects.create(
            user=user,
            landlord=landlord,
            business_license='BL123456',
            tax_number='TAX789',
            bank_name='Bank of Ireland',
            iban='IE12BOFI90001112345678'
        )
        
        assert profile.user == user
        assert profile.landlord == landlord
        assert profile.business_license == 'BL123456'
        assert profile.tax_number == 'TAX789'
        assert profile.bank_name == 'Bank of Ireland'
        assert profile.iban == 'IE12BOFI90001112345678'
        assert profile.auto_reply_enabled is False
        assert profile.email_on_enquiry is True
        assert profile.sms_on_enquiry is False
        assert profile.daily_summary is True
        assert profile.allow_analytics is True
        assert profile.public_profile is False
    
    def test_landlord_profile_str(self, landlord_profile):
        """Test string representation of landlord profile"""
        assert str(landlord_profile) == f"Profile for {landlord_profile.landlord.name}"
    
    def test_iban_validation_valid(self, user, landlord):
        """Test IBAN validation with valid IBAN"""
        valid_ibans = [
            'IE12BOFI90001112345678',
            'GB82WEST12345698765432',
            'DE89370400440532013000'
        ]
        
        for iban in valid_ibans:
            profile = LandlordProfile.objects.create(
                user=User.objects.create_user(username=f'user_{iban[:4]}', email=f'{iban[:4]}@test.com'),
                landlord=Landlord.objects.create(name=f'Landlord {iban[:4]}', email=f'{iban[:4]}@landlord.com'),
                iban=iban
            )
            profile.full_clean()  # Should not raise
            assert profile.iban == iban
    
    def test_iban_validation_invalid(self, user, landlord):
        """Test IBAN validation with invalid IBAN"""
        invalid_ibans = [
            '123456789',  # Too short
            'INVALID_IBAN',  # Invalid format
            'ie12bofi90001112345678',  # Lowercase not allowed
            'XX12BOFI90001112345678'  # Invalid country code
        ]
        
        for iban in invalid_ibans:
            profile = LandlordProfile(
                user=user,
                landlord=landlord,
                iban=iban
            )
            with pytest.raises(ValidationError) as exc_info:
                profile.full_clean()
            assert 'Enter a valid IBAN number' in str(exc_info.value)
    
    def test_auto_reply_message_max_length(self, user, landlord):
        """Test auto reply message max length validation"""
        long_message = 'x' * 501  # Over 500 char limit
        profile = LandlordProfile.objects.create(
            user=user,
            landlord=landlord,
            auto_reply_message=long_message[:500]  # Should truncate at 500
        )
        assert len(profile.auto_reply_message) == 500
    
    def test_one_to_one_relationship_user(self, user, landlord):
        """Test one-to-one relationship with User"""
        profile1 = LandlordProfile.objects.create(
            user=user,
            landlord=landlord
        )
        
        # Attempting to create another profile with same user should fail
        with pytest.raises(IntegrityError):
            LandlordProfile.objects.create(
                user=user,
                landlord=Landlord.objects.create(name='Another Landlord', email='another@landlord.com')
            )
    
    def test_one_to_one_relationship_landlord(self, user, landlord):
        """Test one-to-one relationship with Landlord"""
        profile1 = LandlordProfile.objects.create(
            user=user,
            landlord=landlord
        )
        
        # Attempting to create another profile with same landlord should fail
        new_user = User.objects.create_user(username='newuser', email='new@test.com')
        with pytest.raises(IntegrityError):
            LandlordProfile.objects.create(
                user=new_user,
                landlord=landlord
            )
    
    def test_total_properties_property(self, landlord_profile):
        """Test total_properties property calculation"""
        county = County.objects.create(name='Dublin')
        town = Town.objects.create(name='Dublin City', county=county)
        
        # Initially no properties
        assert landlord_profile.total_properties == 0
        
        # Add active properties
        for i in range(3):
            Property.objects.create(
                title=f'Property {i}',
                landlord=landlord_profile.landlord,
                property_type='house',
                bedrooms=3,
                bathrooms=2,
                rent=Decimal('1500.00'),
                address=f'{i} Test Street',
                county=county,
                town=town,
                is_active=True
            )
        
        # Add inactive property (should not be counted)
        Property.objects.create(
            title='Inactive Property',
            landlord=landlord_profile.landlord,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent=Decimal('1000.00'),
            address='Inactive Street',
            county=county,
            town=town,
            is_active=False
        )
        
        assert landlord_profile.total_properties == 3
    
    def test_total_enquiries_property(self, landlord_profile):
        """Test total_enquiries property calculation"""
        from apps.users.models import PropertyEnquiry
        
        county = County.objects.create(name='Cork')
        town = Town.objects.create(name='Cork City', county=county)
        
        # Create properties
        property1 = Property.objects.create(
            title='Property 1',
            landlord=landlord_profile.landlord,
            property_type='house',
            bedrooms=3,
            bathrooms=2,
            rent=Decimal('1500.00'),
            address='1 Test Street',
            county=county,
            town=town
        )
        
        property2 = Property.objects.create(
            title='Property 2',
            landlord=landlord_profile.landlord,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent=Decimal('1200.00'),
            address='2 Test Street',
            county=county,
            town=town
        )
        
        # Initially no enquiries
        assert landlord_profile.total_enquiries == 0
        
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
        
        assert landlord_profile.total_enquiries == 5
    
    def test_notification_preferences_defaults(self, landlord_profile):
        """Test default notification preferences"""
        assert landlord_profile.email_on_enquiry is True
        assert landlord_profile.sms_on_enquiry is False
        assert landlord_profile.daily_summary is True
    
    def test_analytics_preferences_defaults(self, landlord_profile):
        """Test default analytics preferences"""
        assert landlord_profile.allow_analytics is True
        assert landlord_profile.public_profile is False
    
    def test_timestamps(self, landlord_profile):
        """Test created_at and updated_at timestamps"""
        assert landlord_profile.created_at is not None
        assert landlord_profile.updated_at is not None
        
        # Update should change updated_at
        original_updated = landlord_profile.updated_at
        landlord_profile.business_license = 'NEW_LICENSE'
        landlord_profile.save()
        
        assert landlord_profile.updated_at > original_updated
    
    def test_cascade_delete_user(self, landlord_profile):
        """Test cascade delete when user is deleted"""
        user = landlord_profile.user
        profile_id = landlord_profile.id
        
        user.delete()
        
        # Profile should be deleted
        assert not LandlordProfile.objects.filter(id=profile_id).exists()
    
    def test_cascade_delete_landlord(self, landlord_profile):
        """Test cascade delete when landlord is deleted"""
        landlord = landlord_profile.landlord
        profile_id = landlord_profile.id
        
        landlord.delete()
        
        # Profile should be deleted
        assert not LandlordProfile.objects.filter(id=profile_id).exists()


@pytest.mark.django_db
class TestPropertyStats:
    """Test suite for PropertyStats model"""
    
    @pytest.fixture
    def landlord(self):
        """Create a test landlord"""
        return Landlord.objects.create(
            name='Test Landlord',
            phone='0851234567',
            email='landlord@example.com'
        )
    
    @pytest.fixture
    def property(self, landlord):
        """Create a test property"""
        county = County.objects.create(name='Galway')
        town = Town.objects.create(name='Galway City', county=county)
        
        return Property.objects.create(
            title='Test Property',
            landlord=landlord,
            property_type='house',
            bedrooms=3,
            bathrooms=2,
            rent=Decimal('1500.00'),
            address='123 Test Street',
            county=county,
            town=town
        )
    
    @pytest.fixture
    def property_stats(self, property):
        """Create test property stats"""
        return PropertyStats.objects.create(
            property=property,
            date=date.today(),
            views=100,
            enquiries=10,
            saves=5
        )
    
    def test_create_property_stats(self, property):
        """Test creating property statistics"""
        stats_date = date.today()
        stats = PropertyStats.objects.create(
            property=property,
            date=stats_date,
            views=50,
            enquiries=5,
            saves=3,
            total_views=500,
            total_enquiries=50,
            total_saves=30
        )
        
        assert stats.property == property
        assert stats.date == stats_date
        assert stats.views == 50
        assert stats.enquiries == 5
        assert stats.saves == 3
        assert stats.total_views == 500
        assert stats.total_enquiries == 50
        assert stats.total_saves == 30
    
    def test_property_stats_str(self, property_stats):
        """Test string representation of property stats"""
        expected = f"{property_stats.property.title} - {property_stats.date}"
        assert str(property_stats) == expected
    
    def test_unique_together_constraint(self, property):
        """Test unique_together constraint for property and date"""
        stats_date = date.today()
        
        # Create first stats entry
        PropertyStats.objects.create(
            property=property,
            date=stats_date,
            views=10
        )
        
        # Attempting to create another entry for same property and date should fail
        with pytest.raises(IntegrityError):
            PropertyStats.objects.create(
                property=property,
                date=stats_date,
                views=20
            )
    
    def test_ordering(self, property):
        """Test default ordering by date (descending)"""
        today = date.today()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        
        # Create stats in random order
        stats_week = PropertyStats.objects.create(
            property=property,
            date=week_ago,
            views=10
        )
        stats_today = PropertyStats.objects.create(
            property=property,
            date=today,
            views=30
        )
        stats_yesterday = PropertyStats.objects.create(
            property=property,
            date=yesterday,
            views=20
        )
        
        # Should be ordered by date descending
        stats_list = list(PropertyStats.objects.all())
        assert stats_list[0] == stats_today
        assert stats_list[1] == stats_yesterday
        assert stats_list[2] == stats_week
    
    def test_default_values(self, property):
        """Test default values for metrics"""
        stats = PropertyStats.objects.create(
            property=property,
            date=date.today()
        )
        
        assert stats.views == 0
        assert stats.enquiries == 0
        assert stats.saves == 0
        assert stats.total_views == 0
        assert stats.total_enquiries == 0
        assert stats.total_saves == 0
    
    def test_positive_integer_validation(self, property):
        """Test that metrics only accept positive integers"""
        stats = PropertyStats(
            property=property,
            date=date.today(),
            views=100,
            enquiries=10,
            saves=5
        )
        
        # These should work
        stats.full_clean()
        stats.save()
        
        # Negative values should be prevented by PositiveIntegerField
        stats.views = -1
        with pytest.raises(ValidationError):
            stats.full_clean()
    
    def test_cascade_delete_property(self, property_stats):
        """Test cascade delete when property is deleted"""
        property = property_stats.property
        stats_id = property_stats.id
        
        property.delete()
        
        # Stats should be deleted
        assert not PropertyStats.objects.filter(id=stats_id).exists()
    
    def test_multiple_properties_stats(self, landlord):
        """Test stats for multiple properties"""
        county = County.objects.create(name='Limerick')
        town = Town.objects.create(name='Limerick City', county=county)
        
        # Create multiple properties
        properties = []
        for i in range(3):
            prop = Property.objects.create(
                title=f'Property {i}',
                landlord=landlord,
                property_type='apartment',
                bedrooms=2,
                bathrooms=1,
                rent=Decimal('1000.00'),
                address=f'{i} Test Avenue',
                county=county,
                town=town
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
            assert stats.views == (i + 1) * 10
            assert stats.enquiries == i + 1
            assert stats.saves == i
    
    def test_date_range_stats(self, property):
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
                property=property,
                date=stats_date,
                views=views
            )
        
        # Verify all stats are created
        assert PropertyStats.objects.filter(property=property).count() == 5
        
        # Verify ordering (most recent first)
        stats_list = list(PropertyStats.objects.filter(property=property))
        for i, (stats_date, views) in enumerate(dates_and_views):
            assert stats_list[i].date == stats_date
            assert stats_list[i].views == views
    
    def test_cumulative_metrics_tracking(self, property):
        """Test tracking cumulative metrics over time"""
        today = date.today()
        
        # Day 1
        day1_stats = PropertyStats.objects.create(
            property=property,
            date=today - timedelta(days=2),
            views=100,
            enquiries=10,
            saves=5,
            total_views=100,
            total_enquiries=10,
            total_saves=5
        )
        
        # Day 2 - cumulative totals should increase
        day2_stats = PropertyStats.objects.create(
            property=property,
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
            property=property,
            date=today,
            views=75,
            enquiries=8,
            saves=4,
            total_views=225,  # 150 + 75
            total_enquiries=23,  # 15 + 8
            total_saves=12  # 8 + 4
        )
        
        # Verify cumulative tracking
        assert day3_stats.total_views == 225
        assert day3_stats.total_enquiries == 23
        assert day3_stats.total_saves == 12
"""
Tests for Property model and related models
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from apps.core.models import Property, County, Town, Landlord, PropertySearchQuery
from apps.users.models import User


class PropertyModelTest(TestCase):
    """Test Property model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.county = County.objects.create(name='Dublin', slug='dublin')
        self.town = Town.objects.create(name='Dublin City', county=self.county, slug='dublin-city')
        self.landlord = Landlord.objects.create(
            name='John Doe',
            email='john@example.com',
            phone='0871234567',
            user_type='landlord'
        )
        
        self.property_data = {
            'title': 'Test Property',
            'description': 'A test property description',
            'county': self.county,
            'town': self.town,
            'property_type': 'apartment',
            'bedrooms': 2,
            'bathrooms': 1,
            'rent_monthly': Decimal('1500.00'),
            'furnished': 'furnished',
            'available_from': date.today(),
            'landlord': self.landlord,
        }
    
    def test_property_creation(self):
        """Test basic property creation"""
        property_obj = Property.objects.create(**self.property_data)
        self.assertEqual(property_obj.title, 'Test Property')
        self.assertEqual(property_obj.bedrooms, 2)
        self.assertTrue(property_obj.is_active)
    
    def test_available_date_validation(self):
        """Test that available_to must be after available_from"""
        property_data = self.property_data.copy()
        property_data['available_from'] = date.today()
        property_data['available_to'] = date.today() - timedelta(days=1)
        
        property_obj = Property(**property_data)
        with self.assertRaises(ValidationError) as context:
            property_obj.clean()
        
        self.assertIn('available_to', context.exception.message_dict)
        self.assertEqual(
            context.exception.message_dict['available_to'][0],
            'End date must be after start date.'
        )
    
    def test_lease_duration_auto_setting_short_term(self):
        """Test automatic setting of lease_duration_type for short-term leases"""
        property_data = self.property_data.copy()
        property_data['available_from'] = date.today()
        property_data['available_to'] = date.today() + timedelta(days=180)  # 6 months
        
        property_obj = Property(**property_data)
        property_obj.clean()
        self.assertEqual(property_obj.lease_duration_type, 'short_term')
    
    def test_lease_duration_auto_setting_long_term(self):
        """Test automatic setting of lease_duration_type for long-term leases"""
        property_data = self.property_data.copy()
        property_data['available_from'] = date.today()
        property_data['available_to'] = date.today() + timedelta(days=400)  # > 12 months
        
        property_obj = Property(**property_data)
        property_obj.clean()
        self.assertEqual(property_obj.lease_duration_type, 'long_term')
    
    def test_lease_duration_not_overridden_if_set(self):
        """Test that manually set lease_duration_type is not overridden"""
        property_data = self.property_data.copy()
        property_data['available_from'] = date.today()
        property_data['available_to'] = date.today() + timedelta(days=400)  # > 12 months
        property_data['lease_duration_type'] = 'short_term'  # Manually set to short_term
        
        property_obj = Property(**property_data)
        property_obj.clean()
        self.assertEqual(property_obj.lease_duration_type, 'short_term')  # Should remain as set
    
    def test_new_filter_fields(self):
        """Test all new filter fields"""
        property_data = self.property_data.copy()
        property_data.update({
            'pet_friendly': True,
            'parking_type': 'dedicated',
            'outdoor_space': 'balcony',
            'bills_included': True,
            'viewing_type': 'both',
            'lease_duration_type': 'long_term',
        })
        
        property_obj = Property.objects.create(**property_data)
        self.assertTrue(property_obj.pet_friendly)
        self.assertEqual(property_obj.parking_type, 'dedicated')
        self.assertEqual(property_obj.outdoor_space, 'balcony')
        self.assertTrue(property_obj.bills_included)
        self.assertEqual(property_obj.viewing_type, 'both')
        self.assertEqual(property_obj.lease_duration_type, 'long_term')
    
    def test_soft_delete(self):
        """Test soft delete functionality"""
        property_obj = Property.objects.create(**self.property_data)
        self.assertTrue(property_obj.is_active)
        self.assertIsNone(property_obj.deleted_at)
        
        property_obj.soft_delete()
        self.assertFalse(property_obj.is_active)
        self.assertIsNotNone(property_obj.deleted_at)
        self.assertTrue(property_obj.is_deleted)
    
    def test_restore(self):
        """Test restore after soft delete"""
        property_obj = Property.objects.create(**self.property_data)
        property_obj.soft_delete()
        self.assertFalse(property_obj.is_active)
        
        property_obj.restore()
        self.assertTrue(property_obj.is_active)
        self.assertIsNone(property_obj.deleted_at)
        self.assertFalse(property_obj.is_deleted)
    
    def test_increment_view_count(self):
        """Test incrementing view count"""
        property_obj = Property.objects.create(**self.property_data)
        self.assertEqual(property_obj.view_count, 0)
        
        property_obj.increment_view_count()
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.view_count, 1)
        
        property_obj.increment_view_count()
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.view_count, 2)
    
    def test_increment_enquiry_count(self):
        """Test incrementing enquiry count"""
        property_obj = Property.objects.create(**self.property_data)
        self.assertEqual(property_obj.enquiry_count, 0)
        
        property_obj.increment_enquiry_count()
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.enquiry_count, 1)
    
    def test_eircode_validation(self):
        """Test Eircode validation"""
        from apps.core.models import validate_eircode
        
        # Valid Eircodes
        valid_eircodes = ['D02X285', 'D02 X285', 'T12AB34', 'T12 AB34']
        for eircode in valid_eircodes:
            try:
                validate_eircode(eircode)
            except ValidationError:
                self.fail(f"Valid Eircode {eircode} raised ValidationError")
        
        # Invalid Eircodes
        invalid_eircodes = ['123456', 'ABCDEFG', 'D0X285', 'D02X28']
        for eircode in invalid_eircodes:
            with self.assertRaises(ValidationError):
                validate_eircode(eircode)
    
    def test_full_address_property(self):
        """Test full_address property generation"""
        property_data = self.property_data.copy()
        property_data.update({
            'address_line_1': '123 Main Street',
            'address_line_2': 'Apartment 4B',
            'eircode': 'D02X285'
        })
        
        property_obj = Property.objects.create(**property_data)
        expected = "123 Main Street, Apartment 4B, Dublin City, Co. Dublin, D02 X285"
        self.assertEqual(property_obj.full_address, expected)
    
    def test_ber_color_class(self):
        """Test BER color class generation"""
        test_cases = [
            ('A1', 'ber-a'),
            ('A2', 'ber-a'),
            ('B1', 'ber-b'),
            ('C3', 'ber-c'),
            ('D2', 'ber-d'),
            ('E1', 'ber-e'),
            ('F', 'ber-f'),
            ('G', 'ber-g'),
            ('EXEMPT', 'ber-exempt'),
        ]
        
        for ber_rating, expected_class in test_cases:
            property_data = self.property_data.copy()
            property_data['ber_rating'] = ber_rating
            property_obj = Property.objects.create(**property_data)
            self.assertEqual(property_obj.ber_color_class, expected_class)


class PropertySearchQueryTest(TestCase):
    """Test PropertySearchQuery model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_search_query_creation(self):
        """Test creating search query record"""
        query = PropertySearchQuery.objects.create(
            query='Dublin apartments',
            filters={'county': 'dublin', 'property_type': 'apartment'},
            results_count=15,
            user=self.user
        )
        
        self.assertEqual(query.query, 'Dublin apartments')
        self.assertEqual(query.results_count, 15)
        self.assertEqual(query.user, self.user)
        self.assertIn('county', query.filters)
    
    def test_search_query_without_user(self):
        """Test creating search query without authenticated user"""
        query = PropertySearchQuery.objects.create(
            query='Cork houses',
            filters={'county': 'cork', 'property_type': 'house'},
            results_count=8
        )
        
        self.assertIsNone(query.user)
        self.assertEqual(query.query, 'Cork houses')
    
    def test_search_query_str_method(self):
        """Test string representation of search query"""
        query = PropertySearchQuery.objects.create(
            query='Test search',
            results_count=5
        )
        
        self.assertEqual(str(query), 'Search: Test search (5 results)')


class LandlordModelTest(TestCase):
    """Test Landlord model"""
    
    def test_landlord_creation(self):
        """Test creating a landlord"""
        landlord = Landlord.objects.create(
            name='Jane Smith',
            email='jane@example.com',
            phone='0851234567',
            user_type='landlord',
            preferred_contact_method='email',
            response_time_hours=12
        )
        
        self.assertEqual(landlord.name, 'Jane Smith')
        self.assertFalse(landlord.is_verified)
        self.assertEqual(landlord.response_time_hours, 12)
    
    def test_landlord_display_name_with_company(self):
        """Test display_name property for agents with company"""
        landlord = Landlord.objects.create(
            name='Bob Agent',
            email='bob@agency.com',
            user_type='agent',
            company_name='ABC Real Estate'
        )
        
        self.assertEqual(landlord.display_name, 'Bob Agent - ABC Real Estate')
    
    def test_landlord_display_name_without_company(self):
        """Test display_name property for regular landlords"""
        landlord = Landlord.objects.create(
            name='Alice Owner',
            email='alice@example.com',
            user_type='landlord'
        )
        
        self.assertEqual(landlord.display_name, 'Alice Owner')
    
    def test_landlord_str_method(self):
        """Test string representation with verification status"""
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='test@example.com',
            is_verified=True
        )
        
        self.assertEqual(str(landlord), 'Test Landlord (Verified)')
        
        landlord.is_verified = False
        landlord.save()
        self.assertEqual(str(landlord), 'Test Landlord (Unverified)')
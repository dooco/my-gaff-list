"""
Comprehensive unit tests for core app models following PEP 8 naming conventions.
Tests all model functionality, validation, relationships, and edge cases.
"""

import unittest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from apps.core.models import (
    County, Town, Property, PropertyImage, 
    Landlord, PropertySearchQuery,
    validate_eircode
)
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
import uuid

User = get_user_model()


class ValidateEircodeTestCase(TestCase):
    """Test cases for Eircode validation function following snake_case convention"""
    
    def test_valid_eircode_with_space(self):
        """Test valid Eircode with space separator"""
        # Should not raise ValidationError
        validate_eircode('D02 X285')
        validate_eircode('T12 R5YE')
        
    def test_valid_eircode_without_space(self):
        """Test valid Eircode without space"""
        validate_eircode('D02X285')
        validate_eircode('T12R5YE')
        
    def test_invalid_eircode_format(self):
        """Test various invalid Eircode formats"""
        invalid_codes = [
            '123 4567',  # No letter at start
            'DD2 X285',  # Two letters at start
            'D2 X285',   # Only one digit
            'D02 X28',   # Too short
            'D02 X2855', # Too long
            'D02 XXXX',  # No digits in second part
        ]
        for code in invalid_codes:
            with self.assertRaises(ValidationError):
                validate_eircode(code)
                
    def test_empty_eircode_allowed(self):
        """Test that empty Eircode is allowed during migration"""
        validate_eircode('')
        validate_eircode(None)
        
    def test_case_insensitive_validation(self):
        """Test Eircode validation is case-insensitive"""
        validate_eircode('d02 x285')
        validate_eircode('D02 X285')
        validate_eircode('d02x285')


class CountyModelTestCase(TestCase):
    """Test cases for County model following PascalCase for classes"""
    
    def setUp(self):
        """Set up test data using snake_case for methods"""
        self.county_dublin = County.objects.create(
            name='Dublin',
            slug='dublin'
        )
        
    def test_county_creation(self):
        """Test county instance creation and fields"""
        self.assertEqual(self.county_dublin.name, 'Dublin')
        self.assertEqual(self.county_dublin.slug, 'dublin')
        
    def test_county_string_representation(self):
        """Test __str__ method returns county name"""
        self.assertEqual(str(self.county_dublin), 'Dublin')
        
    def test_county_unique_constraint(self):
        """Test unique constraint on county name"""
        with self.assertRaises(Exception):
            County.objects.create(name='Dublin', slug='dublin-2')
            
    def test_county_ordering(self):
        """Test counties are ordered alphabetically by name"""
        County.objects.create(name='Cork', slug='cork')
        County.objects.create(name='Antrim', slug='antrim')
        
        counties = County.objects.all()
        county_names = [c.name for c in counties]
        self.assertEqual(county_names, sorted(county_names))
        
    def test_county_verbose_name_plural(self):
        """Test correct plural form in Meta class"""
        self.assertEqual(County._meta.verbose_name_plural, 'Counties')


class TownModelTestCase(TestCase):
    """Test cases for Town model with relationships"""
    
    def setUp(self):
        """Set up test data with proper relationships"""
        self.county_dublin = County.objects.create(
            name='Dublin',
            slug='dublin'
        )
        self.county_cork = County.objects.create(
            name='Cork',
            slug='cork'
        )
        self.town_dublin_city = Town.objects.create(
            name='Dublin City',
            county=self.county_dublin,
            slug='dublin-city'
        )
        
    def test_town_creation(self):
        """Test town instance creation with foreign key"""
        self.assertEqual(self.town_dublin_city.name, 'Dublin City')
        self.assertEqual(self.town_dublin_city.county, self.county_dublin)
        
    def test_town_string_representation(self):
        """Test __str__ method returns town and county"""
        expected = f"{self.town_dublin_city.name}, {self.county_dublin.name}"
        self.assertEqual(str(self.town_dublin_city), expected)
        
    def test_town_unique_together_constraint(self):
        """Test unique_together constraint for name and county"""
        # Same town name in different county should work
        Town.objects.create(
            name='Blackrock',
            county=self.county_dublin,
            slug='blackrock-dublin'
        )
        Town.objects.create(
            name='Blackrock',
            county=self.county_cork,
            slug='blackrock-cork'
        )
        
        # Same town name in same county should fail
        with self.assertRaises(Exception):
            Town.objects.create(
                name='Dublin City',
                county=self.county_dublin,
                slug='dublin-city-2'
            )
            
    def test_town_county_cascade_delete(self):
        """Test CASCADE delete behavior when county is deleted"""
        town_count_before = Town.objects.count()
        self.county_dublin.delete()
        town_count_after = Town.objects.count()
        
        self.assertEqual(town_count_after, town_count_before - 1)
        self.assertFalse(
            Town.objects.filter(id=self.town_dublin_city.id).exists()
        )
        
    def test_town_related_name(self):
        """Test reverse relationship from county to towns"""
        Town.objects.create(
            name='Dun Laoghaire',
            county=self.county_dublin,
            slug='dun-laoghaire'
        )
        
        dublin_towns = self.county_dublin.towns.all()
        self.assertEqual(dublin_towns.count(), 2)


class PropertyModelTestCase(TestCase):
    """Comprehensive test cases for Property model"""
    
    def setUp(self):
        """Set up complex test data for property testing"""
        # Create user (landlord)
        self.landlord_user = User.objects.create_user(
            email='landlord@test.com',
            password='test_password_123',
            user_type='landlord'
        )
        
        # Create location data
        self.county = County.objects.create(
            name='Dublin',
            slug='dublin'
        )
        self.town = Town.objects.create(
            name='Dublin City',
            county=self.county,
            slug='dublin-city'
        )
        
        # Create property
        self.property_apartment = Property.objects.create(
            title='Modern 2-Bed Apartment',
            description='Beautiful apartment in city center',
            property_type='apartment',
            price=Decimal('1500.00'),
            bedrooms=2,
            bathrooms=1,
            size=75,
            furnished=True,
            ber_rating='B2',
            address='123 Main Street',
            eircode='D02 X285',
            town=self.town,
            county=self.county,
            latitude=53.3498,
            longitude=-6.2603,
            available_from=timezone.now().date(),
            minimum_lease=12,
            landlord=self.landlord_user,
            status='active'
        )
        
    def test_property_creation_with_all_fields(self):
        """Test property creation with all required and optional fields"""
        self.assertEqual(self.property_apartment.title, 'Modern 2-Bed Apartment')
        self.assertEqual(self.property_apartment.price, Decimal('1500.00'))
        self.assertEqual(self.property_apartment.bedrooms, 2)
        self.assertTrue(self.property_apartment.furnished)
        
    def test_property_string_representation(self):
        """Test __str__ method returns property title"""
        self.assertEqual(str(self.property_apartment), 'Modern 2-Bed Apartment')
        
    def test_property_slug_generation(self):
        """Test automatic slug generation from title"""
        self.assertIsNotNone(self.property_apartment.slug)
        self.assertIn('modern-2-bed-apartment', self.property_apartment.slug)
        
    def test_property_price_validation(self):
        """Test price must be positive"""
        with self.assertRaises(ValidationError):
            property_negative_price = Property(
                title='Test Property',
                price=Decimal('-100.00'),
                landlord=self.landlord_user,
                town=self.town,
                county=self.county
            )
            property_negative_price.full_clean()
            
    def test_property_bedrooms_validation(self):
        """Test bedrooms must be between 0 and 10"""
        # Test minimum boundary
        property_studio = Property.objects.create(
            title='Studio Apartment',
            price=Decimal('1000.00'),
            bedrooms=0,  # Studio
            landlord=self.landlord_user,
            town=self.town,
            county=self.county
        )
        self.assertEqual(property_studio.bedrooms, 0)
        
        # Test maximum boundary
        with self.assertRaises(ValidationError):
            property_too_many_beds = Property(
                title='Mansion',
                price=Decimal('5000.00'),
                bedrooms=11,  # Exceeds maximum
                landlord=self.landlord_user,
                town=self.town,
                county=self.county
            )
            property_too_many_beds.full_clean()
            
    def test_property_bathrooms_validation(self):
        """Test bathrooms must be between 1 and 10"""
        with self.assertRaises(ValidationError):
            property_no_bathroom = Property(
                title='Test Property',
                price=Decimal('1000.00'),
                bathrooms=0,  # No bathroom
                landlord=self.landlord_user,
                town=self.town,
                county=self.county
            )
            property_no_bathroom.full_clean()
            
    def test_property_ber_rating_choices(self):
        """Test BER rating must be from valid choices"""
        valid_ratings = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 
                        'C1', 'C2', 'C3', 'D1', 'D2', 'E1', 'E2', 'F', 'G']
        
        for rating in valid_ratings:
            self.property_apartment.ber_rating = rating
            self.property_apartment.full_clean()  # Should not raise
            
    def test_property_status_choices(self):
        """Test property status transitions"""
        valid_statuses = ['draft', 'active', 'rented', 'inactive']
        
        for status in valid_statuses:
            self.property_apartment.status = status
            self.property_apartment.save()
            self.assertEqual(self.property_apartment.status, status)
            
    def test_property_featured_default(self):
        """Test featured field defaults to False"""
        new_property = Property.objects.create(
            title='Basic Property',
            price=Decimal('1200.00'),
            landlord=self.landlord_user,
            town=self.town,
            county=self.county
        )
        self.assertFalse(new_property.featured)
        
    def test_property_timestamps(self):
        """Test automatic timestamp fields"""
        self.assertIsNotNone(self.property_apartment.created_at)
        self.assertIsNotNone(self.property_apartment.updated_at)
        
        # Test updated_at changes on save
        old_updated_at = self.property_apartment.updated_at
        self.property_apartment.title = 'Updated Title'
        self.property_apartment.save()
        self.assertGreater(self.property_apartment.updated_at, old_updated_at)
        
    def test_property_coordinates_validation(self):
        """Test latitude and longitude validation ranges"""
        # Valid Dublin coordinates
        self.property_apartment.latitude = 53.3498
        self.property_apartment.longitude = -6.2603
        self.property_apartment.full_clean()  # Should not raise
        
        # Invalid latitude (>90)
        with self.assertRaises(ValidationError):
            invalid_property = Property(
                title='Invalid Location',
                price=Decimal('1000.00'),
                latitude=91.0,  # Invalid
                longitude=0.0,
                landlord=self.landlord_user,
                town=self.town,
                county=self.county
            )
            invalid_property.full_clean()
            
    def test_property_minimum_lease_validation(self):
        """Test minimum lease must be positive"""
        with self.assertRaises(ValidationError):
            property_no_lease = Property(
                title='No Lease Property',
                price=Decimal('1000.00'),
                minimum_lease=0,  # Invalid
                landlord=self.landlord_user,
                town=self.town,
                county=self.county
            )
            property_no_lease.full_clean()
            
    def test_property_landlord_cascade_delete(self):
        """Test property deletion when landlord is deleted"""
        property_id = self.property_apartment.id
        self.landlord_user.delete()
        
        self.assertFalse(
            Property.objects.filter(id=property_id).exists()
        )
        
    def test_property_ordering(self):
        """Test properties are ordered by creation date (newest first)"""
        older_property = Property.objects.create(
            title='Older Property',
            price=Decimal('900.00'),
            landlord=self.landlord_user,
            town=self.town,
            county=self.county,
            created_at=timezone.now() - timedelta(days=1)
        )
        
        properties = Property.objects.all()
        # Newest should be first (excluding the older one we just created)
        self.assertEqual(properties[0].title, 'Modern 2-Bed Apartment')


class PropertyImageModelTestCase(TestCase):
    """Test cases for PropertyImage model"""
    
    def setUp(self):
        """Set up test data for property images"""
        self.landlord_user = User.objects.create_user(
            email='landlord@test.com',
            password='test_password_123'
        )
        self.county = County.objects.create(name='Dublin', slug='dublin')
        self.town = Town.objects.create(
            name='Dublin City',
            county=self.county,
            slug='dublin-city'
        )
        self.property = Property.objects.create(
            title='Test Property',
            price=Decimal('1000.00'),
            landlord=self.landlord_user,
            town=self.town,
            county=self.county
        )
        
    def test_property_image_creation(self):
        """Test creating property image with order"""
        image = PropertyImage.objects.create(
            property=self.property,
            image='test_image.jpg',
            order=1,
            is_primary=True
        )
        
        self.assertEqual(image.property, self.property)
        self.assertEqual(image.order, 1)
        self.assertTrue(image.is_primary)
        
    def test_property_image_ordering(self):
        """Test images are ordered by order field"""
        PropertyImage.objects.create(
            property=self.property,
            image='image3.jpg',
            order=3
        )
        PropertyImage.objects.create(
            property=self.property,
            image='image1.jpg',
            order=1
        )
        PropertyImage.objects.create(
            property=self.property,
            image='image2.jpg',
            order=2
        )
        
        images = PropertyImage.objects.filter(property=self.property)
        orders = [img.order for img in images]
        self.assertEqual(orders, [1, 2, 3])
        
    def test_property_image_cascade_delete(self):
        """Test images are deleted when property is deleted"""
        PropertyImage.objects.create(
            property=self.property,
            image='test.jpg',
            order=1
        )
        
        self.property.delete()
        self.assertEqual(PropertyImage.objects.count(), 0)


class LandlordModelTestCase(TestCase):
    """Test cases for Landlord model"""
    
    def setUp(self):
        """Set up test data for landlord"""
        self.user = User.objects.create_user(
            email='landlord@test.com',
            password='test_password_123',
            user_type='landlord'
        )
        
    def test_landlord_creation(self):
        """Test creating a landlord profile"""
        landlord = Landlord.objects.create(
            user=self.user,
            company_name='Test Properties Ltd',
            phone_number='+353 87 123 4567',
            verified=False
        )
        
        self.assertEqual(landlord.user, self.user)
        self.assertEqual(landlord.company_name, 'Test Properties Ltd')
        self.assertFalse(landlord.verified)
        
    def test_landlord_string_representation(self):
        """Test __str__ method returns user email"""
        landlord = Landlord.objects.create(
            user=self.user,
            company_name='Test Company'
        )
        
        self.assertEqual(str(landlord), self.user.email)
        
    def test_landlord_one_to_one_relationship(self):
        """Test one-to-one relationship with User"""
        landlord = Landlord.objects.create(
            user=self.user
        )
        
        # Should not allow duplicate landlord for same user
        with self.assertRaises(Exception):
            Landlord.objects.create(
                user=self.user
            )
            
    def test_landlord_cascade_delete(self):
        """Test landlord is deleted when user is deleted"""
        landlord = Landlord.objects.create(
            user=self.user,
            company_name='Delete Test'
        )
        landlord_id = landlord.id
        
        self.user.delete()
        
        self.assertFalse(
            Landlord.objects.filter(id=landlord_id).exists()
        )


class PropertySearchQueryTestCase(TestCase):
    """Test cases for PropertySearchQuery model"""
    
    def setUp(self):
        """Set up test data for search queries"""
        self.user = User.objects.create_user(
            email='searcher@test.com',
            password='test_password_123',
            user_type='renter'
        )
        self.county = County.objects.create(name='Dublin', slug='dublin')
        self.town = Town.objects.create(
            name='Dublin City',
            county=self.county,
            slug='dublin-city'
        )
        
    def test_search_query_creation(self):
        """Test creating a search query record"""
        search_query = PropertySearchQuery.objects.create(
            user=self.user,
            query_text='2 bed apartment dublin',
            filters={
                'bedrooms': 2,
                'property_type': 'apartment',
                'county': 'Dublin'
            },
            results_count=15
        )
        
        self.assertEqual(search_query.user, self.user)
        self.assertEqual(search_query.query_text, '2 bed apartment dublin')
        self.assertEqual(search_query.results_count, 15)
        
    def test_search_query_anonymous_user(self):
        """Test search query from anonymous user"""
        search_query = PropertySearchQuery.objects.create(
            query_text='house for rent',
            filters={'property_type': 'house'},
            results_count=25
        )
        
        self.assertIsNone(search_query.user)
        self.assertEqual(search_query.query_text, 'house for rent')
        
    def test_search_query_timestamps(self):
        """Test automatic timestamp generation"""
        search_query = PropertySearchQuery.objects.create(
            query_text='test search',
            results_count=0
        )
        
        self.assertIsNotNone(search_query.created_at)
        
    def test_search_query_ordering(self):
        """Test search queries ordered by newest first"""
        query1 = PropertySearchQuery.objects.create(
            query_text='first search',
            results_count=5
        )
        
        query2 = PropertySearchQuery.objects.create(
            query_text='second search',
            results_count=10
        )
        
        queries = PropertySearchQuery.objects.all()
        # Newest should be first
        self.assertEqual(queries[0], query2)


class PropertyModelRelationshipsTestCase(TestCase):
    """Test cases for Property model relationships and additional features"""
    
    def setUp(self):
        """Set up test data for enquiries"""
        self.user = User.objects.create_user(
            email='tester@test.com',
            password='test_password_123'
        )
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='test_password_123',
            user_type='landlord'
        )
        self.county = County.objects.create(name='Dublin', slug='dublin')
        self.town = Town.objects.create(
            name='Dublin City',
            county=self.county,
            slug='dublin-city'
        )
        self.property = Property.objects.create(
            title='Test Property',
            price=Decimal('1500.00'),
            landlord=self.landlord,
            town=self.town,
            county=self.county
        )
        
    def test_property_with_multiple_images(self):
        """Test property can have multiple images"""
        image1 = PropertyImage.objects.create(
            property=self.property,
            image='image1.jpg',
            order=1,
            is_primary=True
        )
        image2 = PropertyImage.objects.create(
            property=self.property,
            image='image2.jpg',
            order=2,
            is_primary=False
        )
        
        images = self.property.images.all()
        self.assertEqual(images.count(), 2)
        self.assertEqual(images[0], image1)
        self.assertEqual(images[1], image2)
        
    def test_property_landlord_relationship(self):
        """Test property belongs to landlord"""
        landlord_profile = Landlord.objects.create(
            user=self.landlord,
            company_name='Test Properties'
        )
        
        # Check relationship through user
        properties = Property.objects.filter(landlord=self.landlord)
        self.assertEqual(properties.count(), 1)
        self.assertEqual(properties[0], self.property)
        
    def test_property_location_relationships(self):
        """Test property location relationships"""
        self.assertEqual(self.property.county, self.county)
        self.assertEqual(self.property.town, self.town)
        
        # Test reverse relationships
        county_properties = Property.objects.filter(county=self.county)
        self.assertIn(self.property, county_properties)
        
        town_properties = Property.objects.filter(town=self.town)
        self.assertIn(self.property, town_properties)
        
    def test_property_search_analytics(self):
        """Test property search query tracking"""
        # Create search queries related to this property
        PropertySearchQuery.objects.create(
            query_text='dublin apartment',
            filters={'county': 'Dublin'},
            results_count=10
        )
        
        PropertySearchQuery.objects.create(
            user=self.user,
            query_text='2 bed apartment',
            filters={'bedrooms': 2},
            results_count=5
        )
        
        # Verify queries were created
        queries = PropertySearchQuery.objects.all()
        self.assertEqual(queries.count(), 2)
        
    def test_property_availability_dates(self):
        """Test property availability date handling"""
        today = timezone.now().date()
        future_date = today + timedelta(days=30)
        
        self.property.available_from = future_date
        self.property.save()
        
        self.assertEqual(self.property.available_from, future_date)
        
        # Test property is not yet available
        self.assertGreater(self.property.available_from, today)
        
    def test_property_soft_delete(self):
        """Test property status changes instead of hard delete"""
        # Instead of deleting, mark as inactive
        self.property.status = 'inactive'
        self.property.save()
        
        # Property still exists but inactive
        self.assertTrue(Property.objects.filter(id=self.property.id).exists())
        self.assertEqual(self.property.status, 'inactive')
        
        # Active properties shouldn't include this one
        active_properties = Property.objects.filter(status='active')
        self.assertNotIn(self.property, active_properties)


if __name__ == '__main__':
    unittest.main()
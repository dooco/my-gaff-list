"""
Comprehensive unit tests for core app views and API endpoints.
Tests all ViewSets, permissions, filters, and edge cases.
Following PEP 8: snake_case for functions/variables, PascalCase for classes.
"""

import unittest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from decimal import Decimal
from apps.core.models import County, Town, Property, SavedProperty, Enquiry
from apps.core.serializers import (
    PropertySerializer, PropertyListSerializer,
    CountySerializer, TownSerializer, EnquirySerializer
)
from django.utils import timezone
from datetime import timedelta
import json

User = get_user_model()


class PropertyViewSetTestCase(APITestCase):
    """Test cases for PropertyViewSet API endpoints"""
    
    def setUp(self):
        """Set up test data and API client with snake_case naming"""
        self.client = APIClient()
        
        # Create test users
        self.landlord_user = User.objects.create_user(
            email='landlord@test.com',
            password='landlord_pass_123',
            user_type='landlord'
        )
        
        self.renter_user = User.objects.create_user(
            email='renter@test.com',
            password='renter_pass_123',
            user_type='renter'
        )
        
        self.admin_user = User.objects.create_superuser(
            email='admin@test.com',
            password='admin_pass_123'
        )
        
        # Create location data
        self.county_dublin = County.objects.create(
            name='Dublin',
            slug='dublin'
        )
        self.town_dublin_city = Town.objects.create(
            name='Dublin City',
            county=self.county_dublin,
            slug='dublin-city'
        )
        
        # Create test properties
        self.active_property = Property.objects.create(
            title='Active Property',
            description='A nice apartment',
            property_type='apartment',
            price=Decimal('1500.00'),
            bedrooms=2,
            bathrooms=1,
            furnished=True,
            town=self.town_dublin_city,
            county=self.county_dublin,
            landlord=self.landlord_user,
            status='active'
        )
        
        self.draft_property = Property.objects.create(
            title='Draft Property',
            price=Decimal('1200.00'),
            town=self.town_dublin_city,
            county=self.county_dublin,
            landlord=self.landlord_user,
            status='draft'
        )
        
    def test_list_properties_anonymous_user(self):
        """Test anonymous users can list active properties"""
        response = self.client.get('/api/properties/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        
        # Should only see active properties
        property_ids = [p['id'] for p in response.data['results']]
        self.assertIn(str(self.active_property.id), property_ids)
        self.assertNotIn(str(self.draft_property.id), property_ids)
        
    def test_list_properties_with_filters(self):
        """Test filtering properties by various parameters"""
        # Create additional property for filtering
        Property.objects.create(
            title='Expensive Property',
            price=Decimal('3000.00'),
            bedrooms=4,
            property_type='house',
            town=self.town_dublin_city,
            county=self.county_dublin,
            landlord=self.landlord_user,
            status='active'
        )
        
        # Filter by price range
        response = self.client.get('/api/properties/', {
            'min_price': 1000,
            'max_price': 2000
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prices = [Decimal(p['price']) for p in response.data['results']]
        self.assertTrue(all(1000 <= p <= 2000 for p in prices))
        
        # Filter by property type
        response = self.client.get('/api/properties/', {
            'property_type': 'apartment'
        })
        property_types = [p['property_type'] for p in response.data['results']]
        self.assertTrue(all(pt == 'apartment' for pt in property_types))
        
        # Filter by bedrooms
        response = self.client.get('/api/properties/', {
            'bedrooms': 2
        })
        bedrooms = [p['bedrooms'] for p in response.data['results']]
        self.assertTrue(all(b == 2 for b in bedrooms))
        
    def test_list_properties_with_search(self):
        """Test search functionality across title and description"""
        response = self.client.get('/api/properties/', {
            'search': 'nice apartment'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find property with matching description
        titles = [p['title'] for p in response.data['results']]
        self.assertIn('Active Property', titles)
        
    def test_list_properties_pagination(self):
        """Test pagination of property listings"""
        # Create more properties
        for i in range(15):
            Property.objects.create(
                title=f'Property {i}',
                price=Decimal('1000.00'),
                town=self.town_dublin_city,
                county=self.county_dublin,
                landlord=self.landlord_user,
                status='active'
            )
            
        response = self.client.get('/api/properties/')
        
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)
        
        # Default page size
        self.assertLessEqual(len(response.data['results']), 20)
        
    def test_retrieve_property_detail(self):
        """Test retrieving single property details"""
        response = self.client.get(f'/api/properties/{self.active_property.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.active_property.id))
        self.assertEqual(response.data['title'], 'Active Property')
        
    def test_retrieve_nonexistent_property(self):
        """Test retrieving non-existent property returns 404"""
        fake_uuid = '12345678-1234-5678-1234-567812345678'
        response = self.client.get(f'/api/properties/{fake_uuid}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    def test_create_property_as_landlord(self):
        """Test landlord can create new property"""
        self.client.force_authenticate(user=self.landlord_user)
        
        property_data = {
            'title': 'New Property',
            'description': 'Brand new listing',
            'property_type': 'house',
            'price': '2000.00',
            'bedrooms': 3,
            'bathrooms': 2,
            'furnished': True,
            'town': self.town_dublin_city.id,
            'county': self.county_dublin.id,
            'address': '456 Test Street',
            'status': 'active'
        }
        
        response = self.client.post('/api/properties/', property_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Property')
        
        # Verify property was created
        created_property = Property.objects.get(id=response.data['id'])
        self.assertEqual(created_property.landlord, self.landlord_user)
        
    def test_create_property_as_renter_forbidden(self):
        """Test renter cannot create properties"""
        self.client.force_authenticate(user=self.renter_user)
        
        property_data = {
            'title': 'Unauthorized Property',
            'price': '1000.00',
            'town': self.town_dublin_city.id,
            'county': self.county_dublin.id
        }
        
        response = self.client.post('/api/properties/', property_data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_update_property_as_owner(self):
        """Test landlord can update their own property"""
        self.client.force_authenticate(user=self.landlord_user)
        
        update_data = {
            'title': 'Updated Title',
            'price': '1600.00'
        }
        
        response = self.client.patch(
            f'/api/properties/{self.active_property.id}/',
            update_data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Title')
        
        # Verify database update
        self.active_property.refresh_from_db()
        self.assertEqual(self.active_property.title, 'Updated Title')
        self.assertEqual(self.active_property.price, Decimal('1600.00'))
        
    def test_update_property_as_non_owner_forbidden(self):
        """Test landlord cannot update another landlord's property"""
        other_landlord = User.objects.create_user(
            email='other_landlord@test.com',
            password='password123',
            user_type='landlord'
        )
        self.client.force_authenticate(user=other_landlord)
        
        response = self.client.patch(
            f'/api/properties/{self.active_property.id}/',
            {'title': 'Hacked Title'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_delete_property_as_owner(self):
        """Test landlord can delete their own property"""
        self.client.force_authenticate(user=self.landlord_user)
        
        response = self.client.delete(
            f'/api/properties/{self.active_property.id}/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify property was deleted
        self.assertFalse(
            Property.objects.filter(id=self.active_property.id).exists()
        )
        
    def test_landlord_properties_endpoint(self):
        """Test landlord can view only their properties"""
        # Create property for another landlord
        other_landlord = User.objects.create_user(
            email='other@test.com',
            password='password123',
            user_type='landlord'
        )
        Property.objects.create(
            title='Other Landlord Property',
            price=Decimal('1000.00'),
            town=self.town_dublin_city,
            county=self.county_dublin,
            landlord=other_landlord,
            status='active'
        )
        
        self.client.force_authenticate(user=self.landlord_user)
        response = self.client.get('/api/properties/my-properties/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should only see own properties
        landlord_ids = [p['landlord'] for p in response.data['results']]
        self.assertTrue(
            all(lid == str(self.landlord_user.id) for lid in landlord_ids)
        )


class SavedPropertyViewSetTestCase(APITestCase):
    """Test cases for SavedProperty functionality"""
    
    def setUp(self):
        """Set up test data for saved properties"""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            email='user@test.com',
            password='password123'
        )
        
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='password123',
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
            town=self.town,
            county=self.county,
            landlord=self.landlord,
            status='active'
        )
        
    def test_save_property_authenticated(self):
        """Test authenticated user can save a property"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post(
            f'/api/properties/{self.property.id}/save/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify saved relationship
        self.assertTrue(
            SavedProperty.objects.filter(
                user=self.user,
                property=self.property
            ).exists()
        )
        
    def test_save_property_unauthenticated(self):
        """Test unauthenticated user cannot save properties"""
        response = self.client.post(
            f'/api/properties/{self.property.id}/save/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_save_property_twice_idempotent(self):
        """Test saving same property twice doesn't create duplicates"""
        self.client.force_authenticate(user=self.user)
        
        # First save
        response1 = self.client.post(
            f'/api/properties/{self.property.id}/save/'
        )
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Second save - should not create duplicate
        response2 = self.client.post(
            f'/api/properties/{self.property.id}/save/'
        )
        
        # Check only one saved relationship exists
        saved_count = SavedProperty.objects.filter(
            user=self.user,
            property=self.property
        ).count()
        self.assertEqual(saved_count, 1)
        
    def test_unsave_property(self):
        """Test removing a saved property"""
        self.client.force_authenticate(user=self.user)
        
        # Save property first
        SavedProperty.objects.create(
            user=self.user,
            property=self.property
        )
        
        response = self.client.delete(
            f'/api/properties/{self.property.id}/unsave/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify removed
        self.assertFalse(
            SavedProperty.objects.filter(
                user=self.user,
                property=self.property
            ).exists()
        )
        
    def test_list_saved_properties(self):
        """Test listing user's saved properties"""
        self.client.force_authenticate(user=self.user)
        
        # Save multiple properties
        property2 = Property.objects.create(
            title='Second Property',
            price=Decimal('1200.00'),
            town=self.town,
            county=self.county,
            landlord=self.landlord,
            status='active'
        )
        
        SavedProperty.objects.create(user=self.user, property=self.property)
        SavedProperty.objects.create(user=self.user, property=property2)
        
        response = self.client.get('/api/saved-properties/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
    def test_saved_property_privacy(self):
        """Test users can only see their own saved properties"""
        other_user = User.objects.create_user(
            email='other@test.com',
            password='password123'
        )
        
        # Save property for first user
        SavedProperty.objects.create(user=self.user, property=self.property)
        
        # Login as other user
        self.client.force_authenticate(user=other_user)
        response = self.client.get('/api/saved-properties/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)


class EnquiryViewSetTestCase(APITestCase):
    """Test cases for Enquiry API endpoints"""
    
    def setUp(self):
        """Set up test data for enquiries"""
        self.client = APIClient()
        
        self.renter = User.objects.create_user(
            email='renter@test.com',
            password='password123'
        )
        
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='password123',
            user_type='landlord'
        )
        
        self.county = County.objects.create(name='Dublin', slug='dublin')
        self.town = Town.objects.create(
            name='Dublin City',
            county=self.county,
            slug='dublin-city'
        )
        
        self.property = Property.objects.create(
            title='Enquiry Test Property',
            price=Decimal('1500.00'),
            town=self.town,
            county=self.county,
            landlord=self.landlord,
            status='active'
        )
        
    def test_create_enquiry_authenticated(self):
        """Test authenticated user can create enquiry"""
        self.client.force_authenticate(user=self.renter)
        
        enquiry_data = {
            'property': self.property.id,
            'message': 'Is this property still available?',
            'phone': '+353 87 123 4567',
            'preferred_contact': 'email'
        }
        
        response = self.client.post('/api/enquiries/', enquiry_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify enquiry created
        enquiry = Enquiry.objects.get(id=response.data['id'])
        self.assertEqual(enquiry.user, self.renter)
        self.assertEqual(enquiry.property, self.property)
        
    def test_create_enquiry_anonymous(self):
        """Test anonymous user can create enquiry with contact details"""
        enquiry_data = {
            'property': self.property.id,
            'name': 'John Doe',
            'email': 'john@example.com',
            'message': 'Interested in viewing',
            'phone': '+353 87 123 4567',
            'preferred_contact': 'phone'
        }
        
        response = self.client.post('/api/enquiries/', enquiry_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify enquiry created
        enquiry = Enquiry.objects.get(id=response.data['id'])
        self.assertIsNone(enquiry.user)
        self.assertEqual(enquiry.name, 'John Doe')
        self.assertEqual(enquiry.email, 'john@example.com')
        
    def test_create_enquiry_validation(self):
        """Test enquiry validation rules"""
        # Missing required fields
        response = self.client.post('/api/enquiries/', {
            'property': self.property.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('message', response.data)
        
    def test_list_enquiries_as_landlord(self):
        """Test landlord can see enquiries for their properties"""
        # Create enquiries
        Enquiry.objects.create(
            property=self.property,
            user=self.renter,
            message='First enquiry'
        )
        Enquiry.objects.create(
            property=self.property,
            name='Anonymous',
            email='anon@test.com',
            message='Second enquiry'
        )
        
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get('/api/enquiries/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
    def test_list_enquiries_privacy(self):
        """Test landlords only see enquiries for their own properties"""
        # Create another landlord with property
        other_landlord = User.objects.create_user(
            email='other_landlord@test.com',
            password='password123',
            user_type='landlord'
        )
        other_property = Property.objects.create(
            title='Other Property',
            price=Decimal('1000.00'),
            town=self.town,
            county=self.county,
            landlord=other_landlord,
            status='active'
        )
        
        # Create enquiries for both properties
        Enquiry.objects.create(
            property=self.property,
            message='For first landlord'
        )
        Enquiry.objects.create(
            property=other_property,
            message='For other landlord'
        )
        
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get('/api/enquiries/')
        
        # Should only see enquiry for own property
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(
            response.data['results'][0]['message'],
            'For first landlord'
        )
        
    def test_mark_enquiry_as_read(self):
        """Test marking enquiry as read"""
        enquiry = Enquiry.objects.create(
            property=self.property,
            message='Test enquiry',
            is_read=False
        )
        
        self.client.force_authenticate(user=self.landlord)
        response = self.client.patch(
            f'/api/enquiries/{enquiry.id}/',
            {'is_read': True}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        enquiry.refresh_from_db()
        self.assertTrue(enquiry.is_read)
        
    def test_delete_enquiry_as_landlord(self):
        """Test landlord can delete enquiries for their properties"""
        enquiry = Enquiry.objects.create(
            property=self.property,
            message='Delete me'
        )
        
        self.client.force_authenticate(user=self.landlord)
        response = self.client.delete(f'/api/enquiries/{enquiry.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        self.assertFalse(
            Enquiry.objects.filter(id=enquiry.id).exists()
        )


class LocationAPITestCase(APITestCase):
    """Test cases for County and Town API endpoints"""
    
    def setUp(self):
        """Set up location test data"""
        self.client = APIClient()
        
        # Create counties
        self.dublin = County.objects.create(name='Dublin', slug='dublin')
        self.cork = County.objects.create(name='Cork', slug='cork')
        
        # Create towns
        self.dublin_city = Town.objects.create(
            name='Dublin City',
            county=self.dublin,
            slug='dublin-city'
        )
        self.blackrock_dublin = Town.objects.create(
            name='Blackrock',
            county=self.dublin,
            slug='blackrock-dublin'
        )
        self.cork_city = Town.objects.create(
            name='Cork City',
            county=self.cork,
            slug='cork-city'
        )
        
    def test_list_counties(self):
        """Test listing all counties"""
        response = self.client.get('/api/counties/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        county_names = [c['name'] for c in response.data]
        self.assertIn('Dublin', county_names)
        self.assertIn('Cork', county_names)
        
    def test_retrieve_county(self):
        """Test retrieving single county with towns"""
        response = self.client.get(f'/api/counties/{self.dublin.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Dublin')
        
        # Should include related towns
        self.assertIn('towns', response.data)
        self.assertEqual(len(response.data['towns']), 2)
        
    def test_list_towns(self):
        """Test listing all towns"""
        response = self.client.get('/api/towns/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        
    def test_filter_towns_by_county(self):
        """Test filtering towns by county"""
        response = self.client.get('/api/towns/', {
            'county': self.dublin.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        town_names = [t['name'] for t in response.data]
        self.assertIn('Dublin City', town_names)
        self.assertIn('Blackrock', town_names)
        self.assertNotIn('Cork City', town_names)
        
    def test_search_towns(self):
        """Test searching towns by name"""
        response = self.client.get('/api/towns/', {
            'search': 'City'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        town_names = [t['name'] for t in response.data]
        self.assertIn('Dublin City', town_names)
        self.assertIn('Cork City', town_names)


if __name__ == '__main__':
    unittest.main()
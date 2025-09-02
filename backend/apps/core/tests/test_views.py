"""
Tests for Property API ViewSet and related endpoints
"""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import json

from apps.core.models import Property, County, Town, Landlord, PropertySearchQuery
from apps.users.models import User


class PropertyViewSetTest(APITestCase):
    """Test Property ViewSet API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create locations
        self.dublin = County.objects.create(name='Dublin', slug='dublin')
        self.cork = County.objects.create(name='Cork', slug='cork')
        
        self.dublin_city = Town.objects.create(
            name='Dublin City', county=self.dublin, slug='dublin-city'
        )
        self.cork_city = Town.objects.create(
            name='Cork City', county=self.cork, slug='cork-city'
        )
        
        # Create landlord
        self.landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@example.com'
        )
        
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test properties
        self.property1 = Property.objects.create(
            title='Modern Apartment in Dublin',
            description='A beautiful modern apartment',
            county=self.dublin,
            town=self.dublin_city,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent_monthly=Decimal('1500.00'),
            furnished='furnished',
            available_from=date.today(),
            landlord=self.landlord,
            pet_friendly=True,
            parking_type='dedicated',
            outdoor_space='balcony',
            bills_included=False,
            viewing_type='both',
            lease_duration_type='long_term'
        )
        
        self.property2 = Property.objects.create(
            title='Cozy House in Cork',
            description='A cozy family house',
            county=self.cork,
            town=self.cork_city,
            property_type='house',
            bedrooms=3,
            bathrooms=2,
            rent_monthly=Decimal('2000.00'),
            furnished='unfurnished',
            available_from=date.today() + timedelta(days=30),
            landlord=self.landlord,
            pet_friendly=False,
            parking_type='street',
            outdoor_space='garden',
            bills_included=True,
            viewing_type='in_person',
            lease_duration_type='short_term'
        )
    
    def test_list_properties(self):
        """Test listing all properties"""
        response = self.client.get('/api/properties/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_property(self):
        """Test retrieving a single property"""
        response = self.client.get(f'/api/properties/{self.property1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Modern Apartment in Dublin')
        self.assertEqual(response.data['pet_friendly'], True)
        self.assertEqual(response.data['parking_type'], 'dedicated')
    
    def test_search_endpoint_with_filters(self):
        """Test the search endpoint with various filters"""
        # Test with county filter
        response = self.client.get('/api/properties/search/', {'county': 'dublin'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.property1.id))
        
        # Test with property type filter
        response = self.client.get('/api/properties/search/', {'property_type': 'house'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.property2.id))
        
        # Test with new filter fields
        response = self.client.get('/api/properties/search/', {'pet_friendly': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.property1.id))
        
        # Test with lease duration type
        response = self.client.get('/api/properties/search/', {'lease_duration_type': 'short_term'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.property2.id))
    
    def test_search_endpoint_with_search_term(self):
        """Test search endpoint with text search"""
        response = self.client.get('/api/properties/search/', {'search': 'Dublin'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Modern Apartment in Dublin')
    
    def test_search_endpoint_with_date_filters(self):
        """Test search with date range filters"""
        # Test available_from filter
        from_date = date.today().isoformat()
        response = self.client.get('/api/properties/search/', {'available_from': from_date})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)  # Only property1 is available from today
        
        # Set available_to dates for testing
        self.property1.available_to = date.today() + timedelta(days=365)
        self.property1.save()
        
        to_date = (date.today() + timedelta(days=400)).isoformat()
        response = self.client.get('/api/properties/search/', {'available_to': to_date})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_search_endpoint_with_price_filters(self):
        """Test search with price range filters"""
        response = self.client.get('/api/properties/search/', {
            'rent_min': '1000',
            'rent_max': '1600'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.property1.id))
    
    def test_search_endpoint_with_metadata(self):
        """Test that search endpoint returns metadata"""
        response = self.client.get('/api/properties/search/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('metadata', response.data)
        
        metadata = response.data['metadata']
        self.assertIn('total_results', metadata)
        self.assertIn('price_range', metadata)
        self.assertIn('facets', metadata)
        
        # Check price range
        self.assertEqual(metadata['price_range']['min_price'], '1500.00')
        self.assertEqual(metadata['price_range']['max_price'], '2000.00')
    
    def test_search_suggestions_endpoint(self):
        """Test search suggestions endpoint"""
        # Create some search history
        PropertySearchQuery.objects.create(
            query='Dublin apartments',
            results_count=5
        )
        
        # Test with minimum query length
        response = self.client.get('/api/properties/search_suggestions/', {'q': 'D'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['suggestions'], [])
        
        # Test with valid query length
        response = self.client.get('/api/properties/search_suggestions/', {'q': 'Dub'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', response.data)
        self.assertIn('Dublin', response.data['suggestions'])
        self.assertIn('Dublin apartments', response.data['suggestions'])
    
    def test_similar_properties_endpoint(self):
        """Test similar properties endpoint"""
        # Create another similar property
        similar_prop = Property.objects.create(
            title='Another Dublin Apartment',
            description='Similar apartment',
            county=self.dublin,
            town=self.dublin_city,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent_monthly=Decimal('1600.00'),
            furnished='furnished',
            available_from=date.today(),
            landlord=self.landlord
        )
        
        response = self.client.get(f'/api/properties/{self.property1.id}/similar/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
        
        # Should not include the property itself
        property_ids = [p['id'] for p in response.data]
        self.assertNotIn(str(self.property1.id), property_ids)
        # Should include the similar property
        self.assertIn(str(similar_prop.id), property_ids)
    
    def test_price_analysis_endpoint(self):
        """Test price analysis endpoint"""
        # Test with filters
        response = self.client.get('/api/properties/price_analysis/', {
            'county': 'dublin',
            'property_type': 'apartment'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('statistics', response.data)
        self.assertIn('distribution', response.data)
        self.assertIn('filters', response.data)
        
        stats = response.data['statistics']
        self.assertEqual(stats['total_properties'], 1)
        self.assertEqual(stats['avg_price'], '1500.00')
        self.assertEqual(stats['min_price'], '1500.00')
        self.assertEqual(stats['max_price'], '1500.00')
        
        # Check distribution
        distribution = response.data['distribution']
        self.assertIsInstance(distribution, list)
        for range_data in distribution:
            self.assertIn('range', range_data)
            self.assertIn('count', range_data)
            self.assertIn('percentage', range_data)
    
    def test_filters_endpoint(self):
        """Test filters options endpoint"""
        response = self.client.get('/api/properties/filters/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that all filter options are present
        self.assertIn('property_types', response.data)
        self.assertIn('house_types', response.data)
        self.assertIn('ber_ratings', response.data)
        self.assertIn('furnished_options', response.data)
        self.assertIn('lease_duration_types', response.data)
        self.assertIn('parking_types', response.data)
        self.assertIn('outdoor_space_types', response.data)
        self.assertIn('viewing_types', response.data)
        self.assertIn('bedroom_options', response.data)
        self.assertIn('price_ranges', response.data)
        
        # Check structure of filter options
        lease_types = response.data['lease_duration_types']
        self.assertIsInstance(lease_types, list)
        self.assertEqual(len(lease_types), 2)  # short_term and long_term
        
        for option in lease_types:
            self.assertIn('value', option)
            self.assertIn('label', option)
    
    def test_search_query_tracking_authenticated(self):
        """Test that searches are tracked for authenticated users"""
        self.client.force_authenticate(user=self.user)
        
        initial_count = PropertySearchQuery.objects.count()
        
        response = self.client.get('/api/properties/search/', {
            'search': 'test search',
            'property_type': 'apartment'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(PropertySearchQuery.objects.count(), initial_count + 1)
        
        query = PropertySearchQuery.objects.latest('searched_at')
        self.assertEqual(query.query, 'test search')
        self.assertEqual(query.user, self.user)
    
    def test_search_query_tracking_anonymous(self):
        """Test that searches are tracked for anonymous users"""
        initial_count = PropertySearchQuery.objects.count()
        
        response = self.client.get('/api/properties/search/', {
            'search': 'anonymous search'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(PropertySearchQuery.objects.count(), initial_count + 1)
        
        query = PropertySearchQuery.objects.latest('searched_at')
        self.assertEqual(query.query, 'anonymous search')
        self.assertIsNone(query.user)
    
    def test_complex_search_with_multiple_filters(self):
        """Test search with multiple filters combined"""
        response = self.client.get('/api/properties/search/', {
            'county': 'dublin',
            'property_type': 'apartment',
            'pet_friendly': 'true',
            'parking_type': 'dedicated',
            'rent_max': '2000'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.property1.id))
    
    def test_pagination(self):
        """Test that results are paginated"""
        # Create more properties
        for i in range(15):
            Property.objects.create(
                title=f'Test Property {i}',
                description='Test',
                county=self.dublin,
                town=self.dublin_city,
                property_type='apartment',
                bedrooms=1,
                bathrooms=1,
                rent_monthly=Decimal('1000.00'),
                furnished='furnished',
                available_from=date.today(),
                landlord=self.landlord
            )
        
        response = self.client.get('/api/properties/search/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('count', response.data)
        self.assertEqual(response.data['count'], 17)  # 2 original + 15 new
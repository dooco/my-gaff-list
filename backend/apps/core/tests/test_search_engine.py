"""
Tests for PropertySearchEngine
"""
from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from apps.core.models import Property, County, Town, Landlord, PropertySearchQuery
from apps.core.services.search import PropertySearchEngine
from apps.users.models import User


class PropertySearchEngineTest(TestCase):
    """Test PropertySearchEngine functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create locations
        self.dublin = County.objects.create(name='Dublin', slug='dublin')
        self.cork = County.objects.create(name='Cork', slug='cork')
        
        self.dublin_city = Town.objects.create(
            name='Dublin City', county=self.dublin, slug='dublin-city'
        )
        self.blackrock = Town.objects.create(
            name='Blackrock', county=self.dublin, slug='blackrock'
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
        
        # Create test properties with varying attributes
        self._create_test_properties()
        
        # Initialize search engine
        self.search_engine = PropertySearchEngine()
    
    def _create_test_properties(self):
        """Create diverse test properties"""
        # Property 1: High quality, recent, expensive
        self.prop1 = Property.objects.create(
            title='Luxury Apartment in Dublin City',
            description='Beautiful modern apartment with all amenities',
            county=self.dublin,
            town=self.dublin_city,
            property_type='apartment',
            bedrooms=2,
            bathrooms=2,
            rent_monthly=Decimal('2500.00'),
            furnished='furnished',
            available_from=date.today(),
            landlord=self.landlord,
            eircode='D02X285',
            ber_rating='A1',
            floor_area=80,
            pet_friendly=True,
            parking_type='dedicated',
            outdoor_space='balcony',
            bills_included=False,
            viewing_type='both',
            lease_duration_type='long_term',
            view_count=100,
            enquiry_count=10
        )
        
        # Property 2: Medium quality, older, average price
        self.prop2 = Property.objects.create(
            title='Cozy House in Blackrock',
            description='Nice family home',
            county=self.dublin,
            town=self.blackrock,
            property_type='house',
            bedrooms=3,
            bathrooms=2,
            rent_monthly=Decimal('1800.00'),
            furnished='part_furnished',
            available_from=date.today() - timedelta(days=30),
            landlord=self.landlord,
            ber_rating='C1',
            pet_friendly=False,
            parking_type='street',
            outdoor_space='garden',
            view_count=50,
            enquiry_count=3
        )
        self.prop2.updated_at = timezone.now() - timedelta(days=30)
        self.prop2.save()
        
        # Property 3: Low quality, very old, cheap
        self.prop3 = Property.objects.create(
            title='Studio in Cork City',
            description='Basic studio',
            county=self.cork,
            town=self.cork_city,
            property_type='studio',
            bedrooms=0,
            bathrooms=1,
            rent_monthly=Decimal('800.00'),
            furnished='unfurnished',
            available_from=date.today() - timedelta(days=90),
            landlord=self.landlord,
            lease_duration_type='short_term',
            view_count=10,
            enquiry_count=0
        )
        self.prop3.updated_at = timezone.now() - timedelta(days=90)
        self.prop3.save()
    
    def test_search_without_filters_or_term(self):
        """Test search returns all active properties when no filters"""
        results, metadata = self.search_engine.search()
        
        self.assertEqual(len(results), 3)
        self.assertEqual(metadata['total_results'], 3)
        self.assertIn('price_range', metadata)
        self.assertIn('facets', metadata)
    
    def test_search_with_search_term(self):
        """Test search with text search term"""
        results, metadata = self.search_engine.search(search_term='Dublin')
        
        self.assertEqual(len(results), 2)  # prop1 and prop2
        for prop in results:
            self.assertIn('Dublin', prop.title + prop.town.name + prop.county.name)
    
    def test_search_with_filters(self):
        """Test search with various filters"""
        # Test property type filter
        filters = {'property_type': 'apartment'}
        results, _ = self.search_engine.search(filters=filters)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].property_type, 'apartment')
        
        # Test county filter
        filters = {'county': 'dublin'}
        results, _ = self.search_engine.search(filters=filters)
        self.assertEqual(len(results), 2)
        
        # Test price range filter
        filters = {'rent_min': 1000, 'rent_max': 2000}
        results, _ = self.search_engine.search(filters=filters)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].id, self.prop2.id)
        
        # Test new filter fields
        filters = {'pet_friendly': True}
        results, _ = self.search_engine.search(filters=filters)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].id, self.prop1.id)
        
        filters = {'lease_duration_type': 'short_term'}
        results, _ = self.search_engine.search(filters=filters)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].id, self.prop3.id)
    
    def test_search_with_date_range_filters(self):
        """Test search with date range filters"""
        # Test available_from filter
        filters = {'available_from': date.today() - timedelta(days=15)}
        results, _ = self.search_engine.search(filters=filters)
        self.assertEqual(len(results), 1)  # Only prop1 is available from today
        
        # Test available_to filter (need to set available_to dates first)
        self.prop1.available_to = date.today() + timedelta(days=365)
        self.prop1.save()
        
        filters = {'available_to': date.today() + timedelta(days=400)}
        results, _ = self.search_engine.search(filters=filters)
        self.assertEqual(len(results), 1)
    
    def test_quality_score_calculation(self):
        """Test that quality score is calculated correctly"""
        # prop1 has all quality fields filled
        # prop3 has minimal fields
        results, _ = self.search_engine.search()
        
        # Properties should be annotated with quality_score
        prop1_result = next(p for p in results if p.id == self.prop1.id)
        prop3_result = next(p for p in results if p.id == self.prop3.id)
        
        # prop1 should have higher quality score
        self.assertGreater(prop1_result.quality_score, prop3_result.quality_score)
    
    def test_popularity_score_calculation(self):
        """Test that popularity score is calculated correctly"""
        results, _ = self.search_engine.search()
        
        # Properties should be annotated with popularity_score
        prop1_result = next(p for p in results if p.id == self.prop1.id)
        prop3_result = next(p for p in results if p.id == self.prop3.id)
        
        # prop1 has more views and enquiries, should have higher popularity
        self.assertGreater(prop1_result.popularity_score, prop3_result.popularity_score)
    
    def test_freshness_score_calculation(self):
        """Test that freshness score is calculated correctly"""
        results, _ = self.search_engine.search()
        
        # Properties should be annotated with freshness_score
        prop1_result = next(p for p in results if p.id == self.prop1.id)
        prop3_result = next(p for p in results if p.id == self.prop3.id)
        
        # prop1 is recently updated, should have higher freshness score
        self.assertGreater(prop1_result.freshness_score, prop3_result.freshness_score)
    
    def test_combined_score_ranking(self):
        """Test that results are ranked by combined score"""
        results, _ = self.search_engine.search()
        
        # Results should be ordered by combined_score descending
        scores = [p.combined_score for p in results]
        self.assertEqual(scores, sorted(scores, reverse=True))
    
    def test_search_query_tracking(self):
        """Test that searches are tracked in PropertySearchQuery"""
        initial_count = PropertySearchQuery.objects.count()
        
        # Perform search with authenticated user
        self.search_engine.search(
            search_term='test search',
            filters={'property_type': 'apartment'},
            user=self.user
        )
        
        # Check that query was tracked
        self.assertEqual(PropertySearchQuery.objects.count(), initial_count + 1)
        
        query = PropertySearchQuery.objects.latest('searched_at')
        self.assertEqual(query.query, 'test search')
        self.assertEqual(query.filters['property_type'], 'apartment')
        self.assertEqual(query.user, self.user)
        self.assertEqual(query.results_count, 1)
    
    def test_metadata_generation(self):
        """Test that search metadata is generated correctly"""
        _, metadata = self.search_engine.search()
        
        # Check price range metadata
        self.assertIn('price_range', metadata)
        self.assertEqual(metadata['price_range']['min_price'], Decimal('800.00'))
        self.assertEqual(metadata['price_range']['max_price'], Decimal('2500.00'))
        
        # Check facets metadata
        self.assertIn('facets', metadata)
        self.assertIn('property_types', metadata['facets'])
        self.assertIn('bedrooms', metadata['facets'])
        
        # Check property type facets
        prop_types = metadata['facets']['property_types']
        self.assertEqual(len(prop_types), 3)  # apartment, house, studio
        
        apartment_facet = next(f for f in prop_types if f['property_type'] == 'apartment')
        self.assertEqual(apartment_facet['count'], 1)
    
    def test_get_similar_properties(self):
        """Test finding similar properties"""
        similar = self.search_engine.get_similar_properties(str(self.prop1.id), limit=2)
        
        # Should find prop2 as similar (same county, similar price range)
        self.assertIn(self.prop2, similar)
        # Should not include the property itself
        self.assertNotIn(self.prop1, similar)
    
    def test_get_search_suggestions(self):
        """Test search suggestions generation"""
        # Create some search history
        PropertySearchQuery.objects.create(
            query='Dublin apartments',
            results_count=5
        )
        PropertySearchQuery.objects.create(
            query='Dublin houses',
            results_count=3
        )
        
        # Test suggestions for partial query
        suggestions = self.search_engine.get_search_suggestions('Dub')
        
        self.assertIn('Dublin apartments', suggestions)
        self.assertIn('Dublin houses', suggestions)
        # Should also include location suggestions
        self.assertIn('Dublin', suggestions)
        self.assertIn('Dublin City', suggestions)
    
    def test_price_competitiveness_score(self):
        """Test price competitiveness scoring"""
        # Create properties with same type and bedrooms but different prices
        cheap_prop = Property.objects.create(
            title='Cheap Apartment',
            description='Affordable option',
            county=self.dublin,
            town=self.dublin_city,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent_monthly=Decimal('1200.00'),  # Below average for 2-bed apartments
            furnished='furnished',
            available_from=date.today(),
            landlord=self.landlord
        )
        
        expensive_prop = Property.objects.create(
            title='Expensive Apartment',
            description='Premium option',
            county=self.dublin,
            town=self.dublin_city,
            property_type='apartment',
            bedrooms=2,
            bathrooms=2,
            rent_monthly=Decimal('3500.00'),  # Above average
            furnished='furnished',
            available_from=date.today(),
            landlord=self.landlord
        )
        
        # Search for 2-bedroom apartments
        filters = {'property_type': 'apartment', 'bedrooms': 2}
        results, _ = self.search_engine.search(filters=filters)
        
        cheap_result = next(p for p in results if p.id == cheap_prop.id)
        expensive_result = next(p for p in results if p.id == expensive_prop.id)
        
        # Cheaper property should have better price score
        self.assertGreater(cheap_result.price_score, expensive_result.price_score)
    
    def test_complex_filter_combinations(self):
        """Test complex combinations of filters"""
        filters = {
            'county': 'dublin',
            'property_type': 'apartment',
            'pet_friendly': True,
            'parking_type': 'dedicated',
            'rent_max': 3000,
            'bedrooms_min': 2
        }
        
        results, _ = self.search_engine.search(filters=filters)
        
        # Should only return prop1
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].id, self.prop1.id)
    
    def test_search_with_no_results(self):
        """Test search that returns no results"""
        filters = {
            'county': 'galway'  # No properties in Galway
        }
        
        results, metadata = self.search_engine.search(filters=filters)
        
        self.assertEqual(len(results), 0)
        self.assertEqual(metadata['total_results'], 0)
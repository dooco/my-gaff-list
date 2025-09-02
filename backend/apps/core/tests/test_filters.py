"""
Tests for PropertyFilter
"""
from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from apps.core.models import Property, County, Town, Landlord
from apps.core.views import PropertyFilter


class PropertyFilterTest(TestCase):
    """Test PropertyFilter functionality"""
    
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
        
        # Create test properties with varying attributes
        self.prop1 = Property.objects.create(
            title='Luxury Apartment in Dublin',
            description='Beautiful modern apartment',
            county=self.dublin,
            town=self.dublin_city,
            property_type='apartment',
            bedrooms=2,
            bathrooms=2,
            rent_monthly=Decimal('2500.00'),
            furnished='furnished',
            available_from=date.today(),
            available_to=date.today() + timedelta(days=365),
            landlord=self.landlord,
            ber_rating='A1',
            pet_friendly=True,
            parking_type='dedicated',
            outdoor_space='balcony',
            bills_included=False,
            viewing_type='both',
            lease_duration_type='long_term'
        )
        
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
            available_from=date.today() + timedelta(days=30),
            landlord=self.landlord,
            ber_rating='C1',
            pet_friendly=False,
            parking_type='street',
            outdoor_space='garden',
            bills_included=True,
            viewing_type='in_person',
            lease_duration_type='short_term'
        )
        
        self.prop3 = Property.objects.create(
            title='Studio in Cork',
            description='Basic studio apartment',
            county=self.cork,
            town=self.cork_city,
            property_type='studio',
            bedrooms=0,
            bathrooms=1,
            rent_monthly=Decimal('800.00'),
            furnished='unfurnished',
            available_from=date.today() - timedelta(days=10),
            landlord=self.landlord,
            lease_duration_type='short_term'
        )
        
        # Initialize filter
        self.filterset_class = PropertyFilter
    
    def test_county_filter(self):
        """Test filtering by county slug"""
        queryset = Property.objects.all()
        
        # Filter for Dublin properties
        filterset = self.filterset_class({'county': 'dublin'}, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 2)
        self.assertIn(self.prop1, results)
        self.assertIn(self.prop2, results)
        self.assertNotIn(self.prop3, results)
        
        # Filter for Cork properties
        filterset = self.filterset_class({'county': 'cork'}, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 1)
        self.assertIn(self.prop3, results)
    
    def test_town_filter(self):
        """Test filtering by town slug"""
        queryset = Property.objects.all()
        
        filterset = self.filterset_class({'town': 'dublin-city'}, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
    
    def test_property_type_filter(self):
        """Test filtering by property type"""
        queryset = Property.objects.all()
        
        # Filter for apartments
        filterset = self.filterset_class({'property_type': 'apartment'}, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # Filter for houses
        filterset = self.filterset_class({'property_type': 'house'}, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop2)
    
    def test_bedroom_filters(self):
        """Test filtering by number of bedrooms"""
        queryset = Property.objects.all()
        
        # Exact bedroom count
        filterset = self.filterset_class({'bedrooms': '2'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # Minimum bedrooms
        filterset = self.filterset_class({'bedrooms_min': '2'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 2)
        self.assertIn(self.prop1, results)
        self.assertIn(self.prop2, results)
        
        # Maximum bedrooms
        filterset = self.filterset_class({'bedrooms_max': '2'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 2)
        self.assertIn(self.prop1, results)
        self.assertIn(self.prop3, results)
    
    def test_rent_range_filters(self):
        """Test filtering by rent range"""
        queryset = Property.objects.all()
        
        # Minimum rent
        filterset = self.filterset_class({'rent_min': '1500'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 2)
        self.assertIn(self.prop1, results)
        self.assertIn(self.prop2, results)
        
        # Maximum rent
        filterset = self.filterset_class({'rent_max': '2000'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 2)
        self.assertIn(self.prop2, results)
        self.assertIn(self.prop3, results)
        
        # Rent range
        filterset = self.filterset_class({'rent_min': '1000', 'rent_max': '2000'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop2)
    
    def test_ber_rating_filter(self):
        """Test filtering by BER rating (single choice)"""
        queryset = Property.objects.all()
        
        filterset = self.filterset_class({'ber_rating': 'A1'}, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
    
    def test_furnished_filter(self):
        """Test filtering by furnished status"""
        queryset = Property.objects.all()
        
        # Furnished properties
        filterset = self.filterset_class({'furnished': 'furnished'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # Part furnished
        filterset = self.filterset_class({'furnished': 'part_furnished'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop2)
    
    def test_lease_duration_type_filter(self):
        """Test filtering by lease duration type"""
        queryset = Property.objects.all()
        
        # Long term
        filterset = self.filterset_class({'lease_duration_type': 'long_term'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # Short term
        filterset = self.filterset_class({'lease_duration_type': 'short_term'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 2)
        self.assertIn(self.prop2, results)
        self.assertIn(self.prop3, results)
    
    def test_available_date_filters(self):
        """Test filtering by availability dates"""
        queryset = Property.objects.all()
        
        # Available from today
        filterset = self.filterset_class({'available_from': date.today().isoformat()}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 2)  # prop1 and prop2
        
        # Available to (needs available_to set)
        filterset = self.filterset_class({'available_to': (date.today() + timedelta(days=400)).isoformat()}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)  # Only prop1 has available_to set
        self.assertEqual(results.first(), self.prop1)
    
    def test_pet_friendly_filter(self):
        """Test filtering by pet-friendly status"""
        queryset = Property.objects.all()
        
        # Pet friendly
        filterset = self.filterset_class({'pet_friendly': 'true'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # Not pet friendly
        filterset = self.filterset_class({'pet_friendly': 'false'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop2)
    
    def test_parking_type_filter(self):
        """Test filtering by parking type"""
        queryset = Property.objects.all()
        
        # Dedicated parking
        filterset = self.filterset_class({'parking_type': 'dedicated'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # Street parking
        filterset = self.filterset_class({'parking_type': 'street'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop2)
    
    def test_outdoor_space_filter(self):
        """Test filtering by outdoor space type"""
        queryset = Property.objects.all()
        
        # Balcony
        filterset = self.filterset_class({'outdoor_space': 'balcony'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # Garden
        filterset = self.filterset_class({'outdoor_space': 'garden'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop2)
    
    def test_bills_included_filter(self):
        """Test filtering by bills included status"""
        queryset = Property.objects.all()
        
        # Bills included
        filterset = self.filterset_class({'bills_included': 'true'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop2)
        
        # Bills not included
        filterset = self.filterset_class({'bills_included': 'false'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
    
    def test_viewing_type_filter(self):
        """Test filtering by viewing type"""
        queryset = Property.objects.all()
        
        # Both viewing types
        filterset = self.filterset_class({'viewing_type': 'both'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # In-person only
        filterset = self.filterset_class({'viewing_type': 'in_person'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop2)
    
    def test_search_filter(self):
        """Test text search across multiple fields"""
        queryset = Property.objects.all()
        
        # Search for Dublin
        filterset = self.filterset_class({'search': 'Dublin'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 2)
        self.assertIn(self.prop1, results)
        self.assertIn(self.prop2, results)
        
        # Search for luxury
        filterset = self.filterset_class({'search': 'Luxury'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # Search for Cork
        filterset = self.filterset_class({'search': 'Cork'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop3)
    
    def test_multiple_filters_combined(self):
        """Test combining multiple filters"""
        queryset = Property.objects.all()
        
        # Dublin apartments with pets allowed
        filters = {
            'county': 'dublin',
            'property_type': 'apartment',
            'pet_friendly': 'true'
        }
        filterset = self.filterset_class(filters, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop1)
        
        # Properties under 2000 with parking
        filters = {
            'rent_max': '2000',
            'parking_type': 'street'
        }
        filterset = self.filterset_class(filters, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop2)
        
        # Short term leases under 1000
        filters = {
            'lease_duration_type': 'short_term',
            'rent_max': '1000'
        }
        filterset = self.filterset_class(filters, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.prop3)
    
    def test_case_insensitive_slug_filters(self):
        """Test that slug filters are case insensitive"""
        queryset = Property.objects.all()
        
        # Test with different cases
        for county_slug in ['dublin', 'Dublin', 'DUBLIN']:
            filterset = self.filterset_class({'county': county_slug}, queryset=queryset)
            results = filterset.qs
            self.assertEqual(results.count(), 2, f"Failed for slug: {county_slug}")
    
    def test_empty_filter_returns_all(self):
        """Test that empty filter returns all properties"""
        queryset = Property.objects.all()
        
        filterset = self.filterset_class({}, queryset=queryset)
        results = filterset.qs
        
        self.assertEqual(results.count(), 3)
        self.assertIn(self.prop1, results)
        self.assertIn(self.prop2, results)
        self.assertIn(self.prop3, results)
    
    def test_invalid_filter_values(self):
        """Test that invalid filter values are handled gracefully"""
        queryset = Property.objects.all()
        
        # Invalid county
        filterset = self.filterset_class({'county': 'nonexistent'}, queryset=queryset)
        results = filterset.qs
        self.assertEqual(results.count(), 0)
        
        # Invalid property type (should be ignored)
        filterset = self.filterset_class({'property_type': 'invalid'}, queryset=queryset)
        # Should return all as invalid choice is not applied
        self.assertTrue(filterset.is_valid())
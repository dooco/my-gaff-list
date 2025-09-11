import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.core.models import Landlord, Property, County, Town
from apps.users.models import PropertyEnquiry
from apps.landlords.models import LandlordProfile, PropertyStats
from apps.landlords.serializers import (
    LandlordRegistrationSerializer,
    LandlordProfileSerializer,
    PropertyCreateSerializer,
    PropertyListSerializer,
    PropertyDetailSerializer,
    PropertyUpdateSerializer,
    EnquiryManagementSerializer,
    LandlordDashboardStatsSerializer
)

User = get_user_model()


@pytest.mark.django_db
class TestLandlordRegistrationSerializer:
    """Test suite for LandlordRegistrationSerializer"""
    
    def test_valid_registration_data(self):
        """Test serializer with valid registration data"""
        data = {
            'email': 'landlord@example.com',
            'username': 'landlord123',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone_number': '0851234567',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'landlord_name': 'John Doe Properties',
            'landlord_phone': '0861234567',
            'company_name': 'Doe Real Estate Ltd',
            'user_type_choice': 'landlord'
        }
        
        serializer = LandlordRegistrationSerializer(data=data)
        assert serializer.is_valid()
    
    def test_password_mismatch(self):
        """Test validation error when passwords don't match"""
        data = {
            'email': 'landlord@example.com',
            'username': 'landlord123',
            'first_name': 'John',
            'last_name': 'Doe',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass123!',
            'landlord_name': 'John Doe Properties'
        }
        
        serializer = LandlordRegistrationSerializer(data=data)
        assert not serializer.is_valid()
        assert "Passwords don't match" in str(serializer.errors)
    
    def test_password_min_length(self):
        """Test password minimum length validation"""
        data = {
            'email': 'landlord@example.com',
            'username': 'landlord123',
            'password': 'short',
            'password_confirm': 'short',
            'landlord_name': 'Test Landlord'
        }
        
        serializer = LandlordRegistrationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors
    
    def test_user_type_choices(self):
        """Test valid user type choices"""
        valid_types = ['landlord', 'agent', 'property_manager']
        
        for user_type in valid_types:
            data = {
                'email': f'{user_type}@example.com',
                'username': f'{user_type}123',
                'password': 'SecurePass123!',
                'password_confirm': 'SecurePass123!',
                'landlord_name': f'Test {user_type}',
                'user_type_choice': user_type
            }
            
            serializer = LandlordRegistrationSerializer(data=data)
            assert serializer.is_valid()
    
    def test_invalid_user_type(self):
        """Test invalid user type choice"""
        data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'landlord_name': 'Test Landlord',
            'user_type_choice': 'invalid_type'
        }
        
        serializer = LandlordRegistrationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'user_type_choice' in serializer.errors
    
    def test_create_method(self):
        """Test the create method creates user and landlord correctly"""
        data = {
            'email': 'newlandlord@example.com',
            'username': 'newlandlord',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone_number': '0871234567',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'landlord_name': 'Smith Properties',
            'landlord_phone': '0881234567',
            'company_name': 'Smith Real Estate',
            'user_type_choice': 'agent'
        }
        
        serializer = LandlordRegistrationSerializer(data=data)
        assert serializer.is_valid()
        
        user = serializer.save()
        
        # Check user was created correctly
        assert user.email == 'newlandlord@example.com'
        assert user.username == 'newlandlord'
        assert user.first_name == 'Jane'
        assert user.last_name == 'Smith'
        assert user.phone_number == '0871234567'
        assert user.user_type == 'landlord'
        assert user.check_password('SecurePass123!')
        
        # Check landlord was created
        assert Landlord.objects.filter(email='newlandlord@example.com').exists()
        landlord = Landlord.objects.get(email='newlandlord@example.com')
        assert landlord.name == 'Smith Properties'
        assert landlord.phone == '0881234567'
        
        # Check landlord profile was created
        assert hasattr(user, 'landlord_profile')
        profile = user.landlord_profile
        assert profile.landlord == landlord
    
    def test_optional_fields(self):
        """Test that optional fields are handled correctly"""
        data = {
            'email': 'minimal@example.com',
            'username': 'minimal',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'landlord_name': 'Minimal Landlord',
            # Optional fields omitted
        }
        
        serializer = LandlordRegistrationSerializer(data=data)
        assert serializer.is_valid()
        
        user = serializer.save()
        landlord = Landlord.objects.get(email='minimal@example.com')
        
        # Check optional fields have appropriate defaults
        assert landlord.phone == ''  # Should be empty string


@pytest.mark.django_db
class TestLandlordProfileSerializer:
    """Test suite for LandlordProfileSerializer"""
    
    @pytest.fixture
    def landlord_profile(self):
        """Create a test landlord profile"""
        user = User.objects.create_user(
            username='testlandlord',
            email='landlord@test.com',
            user_type='landlord'
        )
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
        return LandlordProfile.objects.create(
            user=user,
            landlord=landlord
        )
    
    def test_serialize_profile(self, landlord_profile):
        """Test serializing a landlord profile"""
        serializer = LandlordProfileSerializer(landlord_profile)
        data = serializer.data
        
        assert 'id' in data
        assert 'landlord' in data
        assert 'business_license' in data
        assert 'tax_number' in data
        assert 'bank_name' in data
        assert 'iban' in data
        assert 'auto_reply_enabled' in data
        assert 'auto_reply_message' in data
        assert 'email_on_enquiry' in data
        assert 'sms_on_enquiry' in data
        assert 'daily_summary' in data
        assert 'allow_analytics' in data
        assert 'public_profile' in data
    
    def test_update_profile(self, landlord_profile):
        """Test updating a landlord profile"""
        data = {
            'business_license': 'NEW_LICENSE_123',
            'tax_number': 'TAX_456',
            'auto_reply_enabled': True,
            'auto_reply_message': 'Thank you for your inquiry!'
        }
        
        serializer = LandlordProfileSerializer(
            landlord_profile,
            data=data,
            partial=True
        )
        assert serializer.is_valid()
        
        updated_profile = serializer.save()
        assert updated_profile.business_license == 'NEW_LICENSE_123'
        assert updated_profile.tax_number == 'TAX_456'
        assert updated_profile.auto_reply_enabled is True
        assert updated_profile.auto_reply_message == 'Thank you for your inquiry!'


@pytest.mark.django_db
class TestPropertyCreateSerializer:
    """Test suite for PropertyCreateSerializer"""
    
    @pytest.fixture
    def landlord(self):
        """Create a test landlord"""
        return Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
    
    @pytest.fixture
    def county_and_town(self):
        """Create test county and town"""
        county = County.objects.create(name='Dublin')
        town = Town.objects.create(name='Dublin City', county=county)
        return county, town
    
    def test_valid_property_creation(self, landlord, county_and_town):
        """Test creating a property with valid data"""
        county, town = county_and_town
        
        data = {
            'title': 'Beautiful 3-bed House',
            'property_type': 'house',
            'bedrooms': 3,
            'bathrooms': 2,
            'rent': '1500.00',
            'address': '123 Test Street',
            'county': county.id,
            'town': town.id,
            'description': 'A lovely family home',
            'is_furnished': True,
            'pets_allowed': False,
            'available_from': timezone.now().date() + timedelta(days=30)
        }
        
        serializer = PropertyCreateSerializer(data=data)
        assert serializer.is_valid()
        
        # Save with landlord context
        property = serializer.save(landlord=landlord)
        
        assert property.title == 'Beautiful 3-bed House'
        assert property.property_type == 'house'
        assert property.bedrooms == 3
        assert property.bathrooms == 2
        assert property.rent == Decimal('1500.00')
        assert property.landlord == landlord
    
    def test_property_type_choices(self, landlord, county_and_town):
        """Test valid property type choices"""
        county, town = county_and_town
        valid_types = ['house', 'apartment', 'studio', 'room']
        
        for prop_type in valid_types:
            data = {
                'title': f'Test {prop_type}',
                'property_type': prop_type,
                'bedrooms': 1,
                'bathrooms': 1,
                'rent': '1000.00',
                'address': 'Test Address',
                'county': county.id,
                'town': town.id
            }
            
            serializer = PropertyCreateSerializer(data=data)
            assert serializer.is_valid()
    
    def test_invalid_property_type(self, county_and_town):
        """Test invalid property type"""
        county, town = county_and_town
        
        data = {
            'title': 'Test Property',
            'property_type': 'invalid_type',
            'bedrooms': 2,
            'bathrooms': 1,
            'rent': '1000.00',
            'address': 'Test Address',
            'county': county.id,
            'town': town.id
        }
        
        serializer = PropertyCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'property_type' in serializer.errors
    
    def test_rent_validation(self, county_and_town):
        """Test rent field validation"""
        county, town = county_and_town
        
        # Negative rent should fail
        data = {
            'title': 'Test Property',
            'property_type': 'house',
            'bedrooms': 2,
            'bathrooms': 1,
            'rent': '-1000.00',
            'address': 'Test Address',
            'county': county.id,
            'town': town.id
        }
        
        serializer = PropertyCreateSerializer(data=data)
        assert not serializer.is_valid()
    
    def test_required_fields(self):
        """Test that required fields are enforced"""
        data = {
            'title': 'Test Property'
            # Missing required fields
        }
        
        serializer = PropertyCreateSerializer(data=data)
        assert not serializer.is_valid()
        
        required_fields = ['property_type', 'bedrooms', 'bathrooms', 'rent', 'address', 'county', 'town']
        for field in required_fields:
            assert field in serializer.errors


@pytest.mark.django_db
class TestPropertyListSerializer:
    """Test suite for PropertyListSerializer"""
    
    @pytest.fixture
    def property(self):
        """Create a test property"""
        county = County.objects.create(name='Cork')
        town = Town.objects.create(name='Cork City', county=county)
        landlord = Landlord.objects.create(name='Test Landlord', email='landlord@test.com')
        
        return Property.objects.create(
            title='Test Property',
            landlord=landlord,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent=Decimal('1200.00'),
            address='456 Test Avenue',
            county=county,
            town=town,
            description='A nice apartment',
            is_furnished=True
        )
    
    def test_serialize_property_list(self, property):
        """Test serializing property for list view"""
        serializer = PropertyListSerializer(property)
        data = serializer.data
        
        # Check essential fields are present
        assert 'id' in data
        assert 'title' in data
        assert 'property_type' in data
        assert 'bedrooms' in data
        assert 'bathrooms' in data
        assert 'rent' in data
        assert 'address' in data
        assert 'county' in data
        assert 'town' in data
        assert 'is_furnished' in data
        assert 'main_image' in data
        
        # Check nested relationships
        assert data['county']['name'] == 'Cork'
        assert data['town']['name'] == 'Cork City'
    
    def test_serialize_multiple_properties(self):
        """Test serializing multiple properties"""
        county = County.objects.create(name='Galway')
        town = Town.objects.create(name='Galway City', county=county)
        landlord = Landlord.objects.create(name='Multi Landlord', email='multi@test.com')
        
        properties = []
        for i in range(3):
            prop = Property.objects.create(
                title=f'Property {i}',
                landlord=landlord,
                property_type='house',
                bedrooms=3,
                bathrooms=2,
                rent=Decimal(f'{1000 + i * 100}.00'),
                address=f'{i} Test Street',
                county=county,
                town=town
            )
            properties.append(prop)
        
        serializer = PropertyListSerializer(properties, many=True)
        data = serializer.data
        
        assert len(data) == 3
        for i, prop_data in enumerate(data):
            assert prop_data['title'] == f'Property {i}'
            assert Decimal(prop_data['rent']) == Decimal(f'{1000 + i * 100}.00')


@pytest.mark.django_db
class TestEnquiryManagementSerializer:
    """Test suite for EnquiryManagementSerializer"""
    
    @pytest.fixture
    def enquiry(self):
        """Create a test enquiry"""
        county = County.objects.create(name='Limerick')
        town = Town.objects.create(name='Limerick City', county=county)
        landlord = Landlord.objects.create(name='Test Landlord', email='landlord@test.com')
        
        property = Property.objects.create(
            title='Test Property',
            landlord=landlord,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent=Decimal('1000.00'),
            address='789 Test Road',
            county=county,
            town=town
        )
        
        return PropertyEnquiry.objects.create(
            property=property,
            name='John Inquirer',
            email='john@example.com',
            phone='0851234567',
            message='Is this property still available?'
        )
    
    def test_serialize_enquiry(self, enquiry):
        """Test serializing an enquiry"""
        serializer = EnquiryManagementSerializer(enquiry)
        data = serializer.data
        
        assert 'id' in data
        assert 'property' in data
        assert 'name' in data
        assert 'email' in data
        assert 'phone' in data
        assert 'message' in data
        assert 'created_at' in data
        assert 'status' in data
        assert 'is_read' in data
        
        # Check property details are included
        assert data['property']['title'] == 'Test Property'
    
    def test_update_enquiry_status(self, enquiry):
        """Test updating enquiry status"""
        data = {
            'status': 'responded',
            'is_read': True
        }
        
        serializer = EnquiryManagementSerializer(
            enquiry,
            data=data,
            partial=True
        )
        assert serializer.is_valid()
        
        updated_enquiry = serializer.save()
        assert updated_enquiry.status == 'responded'
        assert updated_enquiry.is_read is True


@pytest.mark.django_db
class TestLandlordDashboardStatsSerializer:
    """Test suite for LandlordDashboardStatsSerializer"""
    
    @pytest.fixture
    def landlord_with_properties(self):
        """Create a landlord with properties and stats"""
        county = County.objects.create(name='Dublin')
        town = Town.objects.create(name='Dublin City', county=county)
        landlord = Landlord.objects.create(name='Stats Landlord', email='stats@test.com')
        
        # Create multiple properties
        properties = []
        for i in range(3):
            prop = Property.objects.create(
                title=f'Property {i}',
                landlord=landlord,
                property_type='apartment',
                bedrooms=2,
                bathrooms=1,
                rent=Decimal(f'{1200 + i * 100}.00'),
                address=f'{i} Stats Street',
                county=county,
                town=town,
                is_active=True if i < 2 else False  # 2 active, 1 inactive
            )
            properties.append(prop)
            
            # Create stats for each property
            PropertyStats.objects.create(
                property=prop,
                date=timezone.now().date(),
                views=100 * (i + 1),
                enquiries=10 * (i + 1),
                saves=5 * (i + 1),
                total_views=1000 * (i + 1),
                total_enquiries=100 * (i + 1),
                total_saves=50 * (i + 1)
            )
            
            # Create enquiries
            for j in range(i + 1):
                PropertyEnquiry.objects.create(
                    property=prop,
                    name=f'Enquirer {j}',
                    email=f'enquirer{j}@test.com',
                    phone='0851234567',
                    message='Interested'
                )
        
        return landlord
    
    def test_dashboard_stats_serialization(self, landlord_with_properties):
        """Test serializing dashboard statistics"""
        serializer = LandlordDashboardStatsSerializer(landlord_with_properties)
        data = serializer.data
        
        # Check all stats fields are present
        assert 'total_properties' in data
        assert 'active_properties' in data
        assert 'total_enquiries' in data
        assert 'unread_enquiries' in data
        assert 'total_views' in data
        assert 'views_this_month' in data
        assert 'enquiries_this_month' in data
        assert 'recent_enquiries' in data
        assert 'property_performance' in data
        
        # Check calculated values
        assert data['total_properties'] == 3
        assert data['active_properties'] == 2  # Only 2 are active
        
    def test_recent_enquiries_limit(self, landlord_with_properties):
        """Test that recent enquiries are limited correctly"""
        serializer = LandlordDashboardStatsSerializer(landlord_with_properties)
        data = serializer.data
        
        # Should return at most 5 recent enquiries (or however many exist)
        assert 'recent_enquiries' in data
        assert isinstance(data['recent_enquiries'], list)
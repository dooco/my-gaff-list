import pytest
import json
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import Landlord, Property, County, Town
from apps.users.models import PropertyEnquiry
from apps.landlords.models import LandlordProfile, PropertyStats
from apps.messaging.models import Conversation, Message

User = get_user_model()


@pytest.mark.django_db
class TestLandlordRegistrationView:
    """Test suite for landlord registration endpoint"""
    
    @pytest.fixture
    def api_client(self):
        """Create an API client"""
        return APIClient()
    
    def test_successful_registration(self, api_client):
        """Test successful landlord registration"""
        data = {
            'email': 'newlandlord@example.com',
            'username': 'newlandlord',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone_number': '0851234567',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'landlord_name': 'John Doe Properties',
            'landlord_phone': '0861234567',
            'company_name': 'Doe Real Estate',
            'user_type_choice': 'landlord'
        }
        
        response = api_client.post('/api/landlords/register/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
        
        # Verify user details in response
        user_data = response.data['user']
        assert user_data['email'] == 'newlandlord@example.com'
        assert user_data['first_name'] == 'John'
        assert user_data['last_name'] == 'Doe'
        assert user_data['user_type'] == 'landlord'
        
        # Verify user was created in database
        user = User.objects.get(email='newlandlord@example.com')
        assert user.username == 'newlandlord'
        assert user.user_type == 'landlord'
        
        # Verify landlord was created
        landlord = Landlord.objects.get(email='newlandlord@example.com')
        assert landlord.name == 'John Doe Properties'
        assert landlord.phone == '0861234567'
        
        # Verify landlord profile was created
        profile = LandlordProfile.objects.get(user=user)
        assert profile.landlord == landlord
    
    def test_registration_with_existing_email(self, api_client):
        """Test registration fails with existing email"""
        # Create existing user
        User.objects.create_user(
            username='existing',
            email='existing@example.com',
            password='password123'
        )
        
        data = {
            'email': 'existing@example.com',
            'username': 'newusername',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'landlord_name': 'Test Landlord'
        }
        
        response = api_client.post('/api/landlords/register/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data
    
    def test_registration_password_validation(self, api_client):
        """Test password validation during registration"""
        data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'weak',
            'password_confirm': 'weak',
            'landlord_name': 'Test Landlord'
        }
        
        response = api_client.post('/api/landlords/register/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data
    
    def test_registration_different_user_types(self, api_client):
        """Test registration with different user types"""
        user_types = ['landlord', 'agent', 'property_manager']
        
        for i, user_type in enumerate(user_types):
            data = {
                'email': f'{user_type}{i}@example.com',
                'username': f'{user_type}{i}',
                'password': 'SecurePass123!',
                'password_confirm': 'SecurePass123!',
                'landlord_name': f'{user_type.title()} Test',
                'user_type_choice': user_type
            }
            
            response = api_client.post('/api/landlords/register/', data, format='json')
            
            assert response.status_code == status.HTTP_201_CREATED
            assert response.data['user']['user_type'] == 'landlord'  # All become landlords


@pytest.mark.django_db
class TestLandlordProfileView:
    """Test suite for landlord profile endpoints"""
    
    @pytest.fixture
    def authenticated_landlord(self):
        """Create an authenticated landlord user"""
        user = User.objects.create_user(
            username='landlord',
            email='landlord@test.com',
            password='testpass123',
            user_type='landlord'
        )
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
        profile = LandlordProfile.objects.create(
            user=user,
            landlord=landlord
        )
        return user, landlord, profile
    
    @pytest.fixture
    def authenticated_client(self, authenticated_landlord):
        """Create an authenticated API client"""
        user, _, _ = authenticated_landlord
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        return client
    
    def test_get_profile(self, authenticated_client, authenticated_landlord):
        """Test retrieving landlord profile"""
        response = authenticated_client.get('/api/landlords/profile/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'landlord' in response.data
        assert 'business_license' in response.data
        assert 'auto_reply_enabled' in response.data
    
    def test_update_profile(self, authenticated_client, authenticated_landlord):
        """Test updating landlord profile"""
        data = {
            'business_license': 'NEW_LICENSE',
            'tax_number': 'TAX123',
            'auto_reply_enabled': True,
            'auto_reply_message': 'Thanks for your inquiry!',
            'email_on_enquiry': False
        }
        
        response = authenticated_client.patch('/api/landlords/profile/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify updates in database
        _, _, profile = authenticated_landlord
        profile.refresh_from_db()
        assert profile.business_license == 'NEW_LICENSE'
        assert profile.tax_number == 'TAX123'
        assert profile.auto_reply_enabled is True
        assert profile.auto_reply_message == 'Thanks for your inquiry!'
        assert profile.email_on_enquiry is False
    
    def test_profile_requires_authentication(self):
        """Test that profile endpoint requires authentication"""
        client = APIClient()
        response = client.get('/api/landlords/profile/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_non_landlord_cannot_access_profile(self):
        """Test that non-landlord users cannot access landlord profile"""
        user = User.objects.create_user(
            username='regular',
            email='regular@test.com',
            password='testpass123',
            user_type='tenant'
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = client.get('/api/landlords/profile/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestPropertyManagementViews:
    """Test suite for property management endpoints"""
    
    @pytest.fixture
    def setup_data(self):
        """Setup test data"""
        # Create landlord user
        user = User.objects.create_user(
            username='landlord',
            email='landlord@test.com',
            password='testpass123',
            user_type='landlord'
        )
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
        profile = LandlordProfile.objects.create(
            user=user,
            landlord=landlord
        )
        
        # Create location data
        county = County.objects.create(name='Dublin')
        town = Town.objects.create(name='Dublin City', county=county)
        
        # Create authenticated client
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        return {
            'user': user,
            'landlord': landlord,
            'profile': profile,
            'county': county,
            'town': town,
            'client': client
        }
    
    def test_create_property(self, setup_data):
        """Test creating a new property"""
        data = {
            'title': 'Beautiful 3-bed House',
            'property_type': 'house',
            'bedrooms': 3,
            'bathrooms': 2,
            'rent': '1500.00',
            'address': '123 Test Street',
            'county': setup_data['county'].id,
            'town': setup_data['town'].id,
            'description': 'A lovely family home',
            'is_furnished': True,
            'pets_allowed': False
        }
        
        response = setup_data['client'].post('/api/landlords/properties/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Beautiful 3-bed House'
        
        # Verify property was created
        property = Property.objects.get(title='Beautiful 3-bed House')
        assert property.landlord == setup_data['landlord']
        assert property.bedrooms == 3
        assert property.rent == Decimal('1500.00')
    
    def test_list_landlord_properties(self, setup_data):
        """Test listing properties for a landlord"""
        # Create multiple properties
        for i in range(3):
            Property.objects.create(
                title=f'Property {i}',
                landlord=setup_data['landlord'],
                property_type='apartment',
                bedrooms=2,
                bathrooms=1,
                rent=Decimal(f'{1000 + i * 100}.00'),
                address=f'{i} Test Street',
                county=setup_data['county'],
                town=setup_data['town']
            )
        
        # Create property for different landlord (shouldn't appear)
        other_landlord = Landlord.objects.create(
            name='Other Landlord',
            email='other@test.com'
        )
        Property.objects.create(
            title='Other Property',
            landlord=other_landlord,
            property_type='house',
            bedrooms=4,
            bathrooms=2,
            rent=Decimal('2000.00'),
            address='999 Other Street',
            county=setup_data['county'],
            town=setup_data['town']
        )
        
        response = setup_data['client'].get('/api/landlords/properties/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3
        
        # Verify only landlord's properties are returned
        titles = [prop['title'] for prop in response.data['results']]
        assert 'Other Property' not in titles
    
    def test_update_property(self, setup_data):
        """Test updating a property"""
        property = Property.objects.create(
            title='Original Title',
            landlord=setup_data['landlord'],
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent=Decimal('1000.00'),
            address='123 Original Street',
            county=setup_data['county'],
            town=setup_data['town']
        )
        
        update_data = {
            'title': 'Updated Title',
            'rent': '1200.00',
            'description': 'Updated description'
        }
        
        response = setup_data['client'].patch(
            f'/api/landlords/properties/{property.id}/',
            update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        property.refresh_from_db()
        assert property.title == 'Updated Title'
        assert property.rent == Decimal('1200.00')
        assert property.description == 'Updated description'
    
    def test_delete_property(self, setup_data):
        """Test deleting a property (soft delete)"""
        property = Property.objects.create(
            title='To Delete',
            landlord=setup_data['landlord'],
            property_type='studio',
            bedrooms=1,
            bathrooms=1,
            rent=Decimal('800.00'),
            address='Delete Street',
            county=setup_data['county'],
            town=setup_data['town']
        )
        
        response = setup_data['client'].delete(f'/api/landlords/properties/{property.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        property.refresh_from_db()
        assert property.is_active is False  # Soft deleted
    
    def test_cannot_update_other_landlord_property(self, setup_data):
        """Test that landlord cannot update another landlord's property"""
        other_landlord = Landlord.objects.create(
            name='Other Landlord',
            email='other@test.com'
        )
        
        property = Property.objects.create(
            title='Other Property',
            landlord=other_landlord,
            property_type='house',
            bedrooms=3,
            bathrooms=2,
            rent=Decimal('1500.00'),
            address='Other Street',
            county=setup_data['county'],
            town=setup_data['town']
        )
        
        update_data = {'title': 'Hacked Title'}
        
        response = setup_data['client'].patch(
            f'/api/landlords/properties/{property.id}/',
            update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        property.refresh_from_db()
        assert property.title == 'Other Property'  # Unchanged


@pytest.mark.django_db
class TestEnquiryManagementViews:
    """Test suite for enquiry management endpoints"""
    
    @pytest.fixture
    def setup_with_enquiries(self):
        """Setup test data with enquiries"""
        # Create landlord
        user = User.objects.create_user(
            username='landlord',
            email='landlord@test.com',
            password='testpass123',
            user_type='landlord'
        )
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
        LandlordProfile.objects.create(user=user, landlord=landlord)
        
        # Create property
        county = County.objects.create(name='Cork')
        town = Town.objects.create(name='Cork City', county=county)
        property = Property.objects.create(
            title='Test Property',
            landlord=landlord,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent=Decimal('1200.00'),
            address='Test Street',
            county=county,
            town=town
        )
        
        # Create enquiries
        enquiries = []
        for i in range(5):
            enquiry = PropertyEnquiry.objects.create(
                property=property,
                name=f'Enquirer {i}',
                email=f'enquirer{i}@test.com',
                phone='0851234567',
                message=f'Message {i}',
                is_read=False if i < 3 else True  # First 3 unread
            )
            enquiries.append(enquiry)
        
        # Create client
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        return {
            'user': user,
            'landlord': landlord,
            'property': property,
            'enquiries': enquiries,
            'client': client
        }
    
    def test_list_enquiries(self, setup_with_enquiries):
        """Test listing enquiries for landlord's properties"""
        response = setup_with_enquiries['client'].get('/api/landlords/enquiries/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 5
    
    def test_filter_unread_enquiries(self, setup_with_enquiries):
        """Test filtering unread enquiries"""
        response = setup_with_enquiries['client'].get('/api/landlords/enquiries/?is_read=false')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3
        
        for enquiry in response.data['results']:
            assert enquiry['is_read'] is False
    
    def test_mark_enquiry_as_read(self, setup_with_enquiries):
        """Test marking an enquiry as read"""
        enquiry = setup_with_enquiries['enquiries'][0]
        
        response = setup_with_enquiries['client'].patch(
            f'/api/landlords/enquiries/{enquiry.id}/',
            {'is_read': True},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        enquiry.refresh_from_db()
        assert enquiry.is_read is True
    
    def test_update_enquiry_status(self, setup_with_enquiries):
        """Test updating enquiry status"""
        enquiry = setup_with_enquiries['enquiries'][0]
        
        response = setup_with_enquiries['client'].patch(
            f'/api/landlords/enquiries/{enquiry.id}/',
            {'status': 'responded'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        enquiry.refresh_from_db()
        assert enquiry.status == 'responded'
    
    def test_cannot_access_other_landlord_enquiries(self, setup_with_enquiries):
        """Test that landlord cannot access another landlord's enquiries"""
        # Create another landlord with property and enquiry
        other_landlord = Landlord.objects.create(
            name='Other Landlord',
            email='other@test.com'
        )
        other_property = Property.objects.create(
            title='Other Property',
            landlord=other_landlord,
            property_type='house',
            bedrooms=3,
            bathrooms=2,
            rent=Decimal('1500.00'),
            address='Other Street',
            county=County.objects.first(),
            town=Town.objects.first()
        )
        other_enquiry = PropertyEnquiry.objects.create(
            property=other_property,
            name='Other Enquirer',
            email='other@test.com',
            phone='0861234567',
            message='Other message'
        )
        
        response = setup_with_enquiries['client'].get(
            f'/api/landlords/enquiries/{other_enquiry.id}/'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDashboardStatsView:
    """Test suite for dashboard statistics endpoint"""
    
    @pytest.fixture
    def setup_with_stats(self):
        """Setup test data with statistics"""
        # Create landlord
        user = User.objects.create_user(
            username='landlord',
            email='landlord@test.com',
            password='testpass123',
            user_type='landlord'
        )
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
        LandlordProfile.objects.create(user=user, landlord=landlord)
        
        # Create properties
        county = County.objects.create(name='Galway')
        town = Town.objects.create(name='Galway City', county=county)
        
        properties = []
        for i in range(3):
            prop = Property.objects.create(
                title=f'Property {i}',
                landlord=landlord,
                property_type='apartment',
                bedrooms=2,
                bathrooms=1,
                rent=Decimal(f'{1000 + i * 100}.00'),
                address=f'{i} Test Street',
                county=county,
                town=town,
                is_active=True if i < 2 else False
            )
            properties.append(prop)
            
            # Create stats for each property
            PropertyStats.objects.create(
                property=prop,
                date=timezone.now().date(),
                views=100 * (i + 1),
                enquiries=10 * (i + 1),
                saves=5 * (i + 1)
            )
            
            # Create enquiries
            for j in range(i + 1):
                PropertyEnquiry.objects.create(
                    property=prop,
                    name=f'Enquirer {j}',
                    email=f'enquirer{j}@test.com',
                    phone='0851234567',
                    message='Interested',
                    is_read=False if j == 0 else True
                )
        
        # Create client
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        return {
            'user': user,
            'landlord': landlord,
            'properties': properties,
            'client': client
        }
    
    def test_get_dashboard_stats(self, setup_with_stats):
        """Test retrieving dashboard statistics"""
        response = setup_with_stats['client'].get('/api/landlords/dashboard/stats/')
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.data
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
        assert data['active_properties'] == 2
    
    def test_dashboard_stats_requires_authentication(self):
        """Test that dashboard stats require authentication"""
        client = APIClient()
        response = client.get('/api/landlords/dashboard/stats/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_dashboard_stats_for_landlord_only(self):
        """Test that only landlords can access dashboard stats"""
        user = User.objects.create_user(
            username='tenant',
            email='tenant@test.com',
            password='testpass123',
            user_type='tenant'
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = client.get('/api/landlords/dashboard/stats/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestPropertyImageUpload:
    """Test suite for property image upload functionality"""
    
    @pytest.fixture
    def setup_for_images(self):
        """Setup for image upload tests"""
        user = User.objects.create_user(
            username='landlord',
            email='landlord@test.com',
            password='testpass123',
            user_type='landlord'
        )
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
        LandlordProfile.objects.create(user=user, landlord=landlord)
        
        county = County.objects.create(name='Waterford')
        town = Town.objects.create(name='Waterford City', county=county)
        
        property = Property.objects.create(
            title='Property with Images',
            landlord=landlord,
            property_type='house',
            bedrooms=3,
            bathrooms=2,
            rent=Decimal('1400.00'),
            address='Image Street',
            county=county,
            town=town
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        return {
            'user': user,
            'landlord': landlord,
            'property': property,
            'client': client
        }
    
    def test_upload_property_images_endpoint_exists(self, setup_for_images):
        """Test that image upload endpoint exists"""
        # This test verifies the endpoint structure
        # Actual file upload would require mock files
        response = setup_for_images['client'].post(
            f'/api/landlords/properties/{setup_for_images["property"].id}/upload-images/',
            {},
            format='multipart'
        )
        
        # Should return bad request without files, not 404
        assert response.status_code != status.HTTP_404_NOT_FOUND
"""
TEST-3: Health Check Endpoint Tests

Tests for the /api/health/ endpoint to ensure system health
monitoring works correctly.
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """Return an unauthenticated API client."""
    return APIClient()


@pytest.mark.django_db
class TestHealthCheckEndpoint:
    """Tests for the health check endpoint."""
    
    def test_health_check_returns_200_when_healthy(self, api_client):
        """Health check should return 200 when all systems are healthy."""
        url = reverse('health-check')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'healthy'
        assert 'timestamp' in response.data
        assert 'version' in response.data
        assert 'checks' in response.data
    
    def test_health_check_includes_database_status(self, api_client):
        """Health check should include database connectivity status."""
        url = reverse('health-check')
        response = api_client.get(url)
        
        assert 'database' in response.data['checks']
        assert response.data['checks']['database']['status'] == 'healthy'
    
    def test_health_check_includes_cache_status(self, api_client):
        """Health check should include cache/Redis status."""
        url = reverse('health-check')
        response = api_client.get(url)
        
        assert 'cache' in response.data['checks']
        # Cache status may be healthy or unhealthy depending on setup
        assert 'status' in response.data['checks']['cache']
    
    def test_health_check_is_publicly_accessible(self, api_client):
        """Health check should be accessible without authentication."""
        url = reverse('health-check')
        response = api_client.get(url)
        
        # Should not return 401 or 403
        assert response.status_code not in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ]
    
    def test_health_check_response_format(self, api_client):
        """Health check should return properly formatted JSON response."""
        url = reverse('health-check')
        response = api_client.get(url)
        
        # Check required fields
        required_fields = ['status', 'timestamp', 'version', 'checks']
        for field in required_fields:
            assert field in response.data, f"Missing required field: {field}"


@pytest.mark.django_db
class TestAPIOverview:
    """Tests for the API overview endpoint."""
    
    def test_api_overview_returns_200(self, api_client):
        """API overview should return 200."""
        url = reverse('api-overview')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_api_overview_lists_endpoints(self, api_client):
        """API overview should list available endpoints."""
        url = reverse('api-overview')
        response = api_client.get(url)
        
        assert 'endpoints' in response.data
        assert 'authentication' in response.data

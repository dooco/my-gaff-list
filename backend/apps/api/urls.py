from django.urls import path, include
from django.db import connection
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


def check_database():
    """Check database connectivity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return {"status": "healthy", "latency_ms": 0}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}


def check_redis():
    """Check Redis connectivity if configured."""
    try:
        from django.core.cache import cache
        cache.set("health_check", "ok", 10)
        if cache.get("health_check") == "ok":
            return {"status": "healthy"}
        return {"status": "unhealthy", "error": "Cache read/write failed"}
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    CRITICAL-5: Health check endpoint for load balancers and monitoring.
    Returns overall system health status.
    """
    db_status = check_database()
    cache_status = check_redis()
    
    is_healthy = (
        db_status["status"] == "healthy" and 
        cache_status["status"] == "healthy"
    )
    
    response_data = {
        "status": "healthy" if is_healthy else "unhealthy",
        "timestamp": timezone.now().isoformat(),
        "version": "1.0.0",
        "checks": {
            "database": db_status,
            "cache": cache_status,
        }
    }
    
    status_code = 200 if is_healthy else 503
    return Response(response_data, status=status_code)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_overview(request):
    return Response({
        'message': 'Welcome to My Gaff List API',
        'version': '1.0.0',
        'status': 'active',
        'endpoints': {
            'auth': '/api/auth/',
            'users': '/api/users/',
            'properties': '/api/properties/',
            'counties': '/api/counties/',
            'towns': '/api/towns/',
            'overview': '/api/',
            'health': '/api/health/',
        },
        'authentication': {
            'login': '/api/auth/jwt/create/',
            'refresh': '/api/auth/jwt/refresh/',
            'register': '/api/auth/users/',
        },
        'property_endpoints': {
            'list_properties': '/api/properties/',
            'search_properties': '/api/properties/search/',
            'property_filters': '/api/properties/filters/',
            'county_towns': '/api/counties/{slug}/towns/',
        }
    })

urlpatterns = [
    path('', api_overview, name='api-overview'),
    path('health/', health_check, name='health-check'),
    path('', include('apps.core.urls')),
]
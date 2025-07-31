from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

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
    path('', include('apps.core.urls')),
]
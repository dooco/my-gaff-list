from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView, RegisterView, UserProfileView, UserProfileDetailView,
    ChangePasswordView, SavedPropertiesViewSet, UserEnquiriesViewSet, UserActivityViewSet,
    dashboard_stats, track_activity, check_property_saved
)

# Create router for viewsets
router = DefaultRouter()
router.register(r'saved-properties', SavedPropertiesViewSet, basename='saved-properties')
router.register(r'enquiries', UserEnquiriesViewSet, basename='user-enquiries')
router.register(r'activities', UserActivityViewSet, basename='user-activities')

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    
    # Include djoser URLs for additional auth functionality
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    
    # User profile endpoints
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/details/', UserProfileDetailView.as_view(), name='user-profile-details'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # Dashboard and stats
    path('dashboard/stats/', dashboard_stats, name='dashboard-stats'),
    
    # Activity tracking
    path('track-activity/', track_activity, name='track-activity'),
    
    # Property interactions
    path('properties/<uuid:property_id>/saved/', check_property_saved, name='check-property-saved'),
    
    # Include router URLs
    path('', include(router.urls)),
]
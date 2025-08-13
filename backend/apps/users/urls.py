from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView, RegisterView, UserProfileView, UserProfileDetailView,
    ChangePasswordView, SavedPropertiesViewSet, UserEnquiriesViewSet, UserActivityViewSet,
    dashboard_stats, track_activity, check_property_saved, create_property_enquiry
)

from .verification_views import (
    send_email_verification,
    verify_email,
    send_phone_verification,
    verify_phone,
    initiate_identity_verification,
    verification_status,
    webhook_stripe_identity,
    webhook_twilio_verify
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
    path('properties/enquiry/', create_property_enquiry, name='create-property-enquiry'),
    
    # Verification endpoints
    path('verification/email/send/', send_email_verification, name='send-email-verification'),
    path('verification/email/verify/', verify_email, name='verify-email'),
    path('verification/phone/send/', send_phone_verification, name='send-phone-verification'),
    path('verification/phone/verify/', verify_phone, name='verify-phone'),
    path('verification/identity/initiate/', initiate_identity_verification, name='initiate-identity-verification'),
    path('verification/status/', verification_status, name='verification-status'),
    
    # Webhook endpoints
    path('webhooks/stripe-identity/', webhook_stripe_identity, name='webhook-stripe-identity'),
    path('webhooks/twilio-verify/', webhook_twilio_verify, name='webhook-twilio-verify'),
    
    # Include router URLs
    path('', include(router.urls)),
]
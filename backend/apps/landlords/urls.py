from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'properties', views.PropertyManagementViewSet, basename='landlord-properties')
router.register(r'enquiries', views.EnquiryManagementViewSet, basename='landlord-enquiries')

urlpatterns = [
    # Authentication
    path('register/', views.LandlordRegistrationView.as_view(), name='landlord-register'),
    
    # Profile management
    path('profile/', views.LandlordProfileView.as_view(), name='landlord-profile'),
    
    # Dashboard
    path('dashboard/stats/', views.landlord_dashboard_stats, name='landlord-dashboard-stats'),
    path('dashboard/activity/', views.recent_activity, name='landlord-recent-activity'),
    
    # Debug endpoints
    path('debug-properties/', views.debug_landlord_properties, name='debug-properties'),
    path('fix-furnished/', views.fix_furnished_field, name='fix-furnished-field'),
    
    # Include router URLs
    path('', include(router.urls)),
]
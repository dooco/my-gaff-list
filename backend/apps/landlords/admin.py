from django.contrib import admin
from .models import LandlordProfile, PropertyStats


@admin.register(LandlordProfile)
class LandlordProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'landlord', 'total_properties', 'created_at']
    list_filter = ['auto_reply_enabled', 'public_profile', 'created_at']
    search_fields = ['user__email', 'landlord__name', 'business_license']
    readonly_fields = ['total_properties', 'total_enquiries', 'created_at', 'updated_at']


@admin.register(PropertyStats)
class PropertyStatsAdmin(admin.ModelAdmin):
    list_display = ['property', 'date', 'views', 'enquiries', 'saves']
    list_filter = ['date', 'property__property_type']
    search_fields = ['property__title']
    date_hierarchy = 'date'
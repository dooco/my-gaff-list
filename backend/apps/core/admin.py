from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Sum, Avg
from .models import County, Town, Property, Landlord, PropertyImage
from .services.geocoding import geocode_property


@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'town_count', 'property_count']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['name']
    
    def town_count(self, obj):
        return obj.towns.count()
    town_count.short_description = 'Towns'
    
    def property_count(self, obj):
        return Property.objects.filter(county=obj).count()
    property_count.short_description = 'Properties'


@admin.register(Town)
class TownAdmin(admin.ModelAdmin):
    list_display = ['name', 'county', 'slug', 'property_count']
    list_filter = ['county']
    search_fields = ['name', 'county__name']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['county', 'name']
    autocomplete_fields = ['county']
    
    def property_count(self, obj):
        return obj.property_set.count()
    property_count.short_description = 'Properties'


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1
    fields = ['image', 'caption', 'is_main', 'order']


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'property_type', 'bedrooms', 'rent_monthly_display',
        'county', 'town', 'ber_rating_badge', 'is_active', 'view_count',
        'enquiry_count', 'created_at'
    ]
    list_filter = [
        'is_active', 'property_type', 'bedrooms', 'ber_rating',
        'furnished', 'county', 'created_at'
    ]
    search_fields = [
        'title', 'description', 'address_line_1', 'address_line_2',
        'eircode', 'landlord__user__email', 'landlord__company_name'
    ]
    readonly_fields = [
        'id', 'view_count', 'created_at', 'updated_at',
        'latitude', 'longitude', 'geocoding_status'
    ]
    date_hierarchy = 'created_at'
    inlines = [PropertyImageInline]
    autocomplete_fields = ['county', 'town', 'landlord']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'property_type', 'house_type', 'description')
        }),
        ('Property Details', {
            'fields': (
                'bedrooms', 'bathrooms', 'floor_area',
                'ber_rating', 'ber_number', 'furnished'
            )
        }),
        ('Location', {
            'fields': (
                'county', 'town', 'address_line_1', 'address_line_2',
                'eircode', 'latitude', 'longitude'
            )
        }),
        ('Pricing & Availability', {
            'fields': (
                'rent_monthly', 'deposit', 'available_from',
                'lease_duration', 'is_active'
            )
        }),
        ('Landlord', {
            'fields': ('landlord',)
        }),
        ('Features', {
            'fields': ('features',),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('view_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate_properties', 'deactivate_properties', 'geocode_properties']
    
    def rent_monthly_display(self, obj):
        return f"€{obj.rent_monthly:,.0f}"
    rent_monthly_display.short_description = 'Monthly Rent'
    rent_monthly_display.admin_order_field = 'rent_monthly'
    
    def ber_rating_badge(self, obj):
        if obj.ber_rating:
            color_map = {
                'A': '#00a651',
                'B': '#51b748',
                'C': '#fdb913',
                'D': '#f68b1f',
                'E': '#ee7623',
                'F': '#e94b35',
                'G': '#d1232a'
            }
            color = color_map.get(obj.ber_rating[0], '#666')
            return format_html(
                '<span style="background-color: {}; color: white; '
                'padding: 2px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
                color, obj.ber_rating
            )
        return '-'
    ber_rating_badge.short_description = 'BER'
    ber_rating_badge.admin_order_field = 'ber_rating'
    
    def enquiry_count(self, obj):
        from apps.users.models import PropertyEnquiry
        return PropertyEnquiry.objects.filter(property=obj).count()
    enquiry_count.short_description = 'Enquiries'
    
    def geocoding_status(self, obj):
        if obj.latitude and obj.longitude:
            return format_html(
                '<span style="color: green;">✓ Geocoded</span><br>'
                'Lat: {:.6f}, Lon: {:.6f}',
                obj.latitude, obj.longitude
            )
        return format_html('<span style="color: orange;">⚠ Not geocoded</span>')
    geocoding_status.short_description = 'Geocoding Status'
    
    def activate_properties(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} properties activated.')
    activate_properties.short_description = 'Activate selected properties'
    
    def deactivate_properties(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} properties deactivated.')
    deactivate_properties.short_description = 'Deactivate selected properties'
    
    def geocode_properties(self, request, queryset):
        success_count = 0
        for property in queryset:
            if geocode_property(property):
                success_count += 1
        self.message_user(
            request,
            f'Successfully geocoded {success_count} out of {queryset.count()} properties.'
        )
    geocode_properties.short_description = 'Geocode selected properties'


@admin.register(Landlord)
class LandlordAdmin(admin.ModelAdmin):
    list_display = [
        'display_name', 'user_email', 'user_type', 'company_name',
        'is_verified', 'verification_status', 'property_count',
        'total_monthly_rent', 'response_time', 'created_at'
    ]
    list_filter = ['is_verified', 'created_at']
    search_fields = [
        'user__email', 'user__first_name', 'user__last_name',
        'company_name', 'license_number'
    ]
    readonly_fields = ['created_at', 'updated_at', 'verification_date']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Company Information', {
            'fields': ('company_name', 'license_number', 'website')
        }),
        ('Verification', {
            'fields': ('is_verified', 'verification_date', 'verification_documents')
        }),
        ('Contact Preferences', {
            'fields': ('preferred_contact_method', 'response_time_hours')
        }),
        ('About', {
            'fields': ('about',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['verify_landlords', 'unverify_landlords']
    
    def display_name(self, obj):
        return str(obj)
    display_name.short_description = 'Name'
    
    def user_email(self, obj):
        return obj.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'email'
    
    def user_type(self, obj):
        return obj.user_type
    user_type.short_description = 'Type'
    
    def verification_status(self, obj):
        if obj.is_verified:
            return format_html(
                '<span style="color: green;">✓ Verified</span>'
            )
        return format_html(
            '<span style="color: orange;">⚠ Unverified</span>'
        )
    verification_status.short_description = 'Status'
    
    def property_count(self, obj):
        count = obj.properties.count()
        active = obj.properties.filter(is_active=True).count()
        return f"{active}/{count}"
    property_count.short_description = 'Properties (Active/Total)'
    
    def total_monthly_rent(self, obj):
        total = obj.properties.filter(is_active=True).aggregate(
            total=Sum('rent_monthly')
        )['total'] or 0
        return f"€{total:,.0f}"
    total_monthly_rent.short_description = 'Total Monthly Rent'
    
    def response_time(self, obj):
        return f"{obj.response_time_hours}h"
    response_time.short_description = 'Response Time'
    response_time.admin_order_field = 'response_time_hours'
    
    def verify_landlords(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(is_verified=True, verification_date=timezone.now())
        self.message_user(request, f'{updated} landlords verified.')
    verify_landlords.short_description = 'Verify selected landlords'
    
    def unverify_landlords(self, request, queryset):
        updated = queryset.update(is_verified=False, verification_date=None)
        self.message_user(request, f'{updated} landlords unverified.')
    unverify_landlords.short_description = 'Unverify selected landlords'


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ['property', 'caption', 'is_main', 'order', 'created_at']
    list_filter = ['is_main', 'created_at']
    search_fields = ['property__title', 'caption']
    readonly_fields = ['created_at']
    autocomplete_fields = ['property']
    
    actions = ['set_as_main_image']
    
    def set_as_main_image(self, request, queryset):
        for image in queryset:
            # Set all other images for this property to not main
            PropertyImage.objects.filter(property=image.property).update(is_main=False)
            # Set this image as main
            image.is_main = True
            image.save()
        self.message_user(request, f'{queryset.count()} images set as main.')
    set_as_main_image.short_description = 'Set as main image'
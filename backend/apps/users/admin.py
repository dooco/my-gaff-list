from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q
from django.utils import timezone
from .models import (
    User, UserProfile, SavedProperty, PropertyEnquiry, UserActivity,
    IdentityVerification, EmailVerificationToken, PhoneVerificationCode
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        'email', 'full_name', 'user_type_badge', 'verification_badge',
        'is_active', 'is_staff', 'date_joined', 'last_login_display'
    ]
    list_filter = [
        'user_type', 'is_active', 'is_staff',
        'is_superuser', 'date_joined'
    ]
    search_fields = ['email', 'first_name', 'last_name', 'phone_number']
    ordering = ['-date_joined']
    readonly_fields = ['id', 'date_joined', 'last_login']
    
    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        ('Personal Info', {
            'fields': (
                'first_name', 'last_name', 'phone_number',
                'user_type'
            )
        }),
        ('Verification', {
            'fields': (
                'is_email_verified', 'is_phone_verified', 'identity_verified',
                'verification_level', 'trust_score'
            )
        }),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            )
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'password1', 'password2',
                'first_name', 'last_name', 'user_type'
            ),
        }),
    )
    
    actions = ['activate_users', 'deactivate_users']
    
    def full_name(self, obj):
        return obj.get_full_name() or obj.email
    full_name.short_description = 'Name'
    
    def user_type_badge(self, obj):
        color_map = {
            'renter': '#3b82f6',
            'landlord': '#10b981',
            'agent': '#f59e0b',
            'admin': '#ef4444'
        }
        color = color_map.get(obj.user_type, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 2px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.user_type.upper()
        )
    user_type_badge.short_description = 'Type'
    user_type_badge.admin_order_field = 'user_type'
    
    def verification_badge(self, obj):
        """Display verification level badge"""
        if obj.verification_level == 'premium':
            color = '#10b981'
            icon = '✓✓✓'
        elif obj.verification_level == 'standard':
            color = '#3b82f6'
            icon = '✓✓'
        elif obj.verification_level == 'basic':
            color = '#f59e0b'
            icon = '✓'
        else:
            color = '#6b7280'
            icon = '○'
        
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 2px 8px; border-radius: 3px; font-size: 11px;" '
            'title="Trust Score: {}">{} {}</span>',
            color, obj.trust_score, icon, obj.verification_level.upper()
        )
    verification_badge.short_description = 'Verification'
    verification_badge.admin_order_field = 'verification_level'
    
    def last_login_display(self, obj):
        if obj.last_login:
            delta = timezone.now() - obj.last_login
            if delta.days == 0:
                if delta.seconds < 3600:
                    return f"{delta.seconds // 60} mins ago"
                return f"{delta.seconds // 3600} hours ago"
            elif delta.days == 1:
                return "Yesterday"
            elif delta.days < 30:
                return f"{delta.days} days ago"
            else:
                return obj.last_login.strftime('%Y-%m-%d')
        return 'Never'
    last_login_display.short_description = 'Last Login'
    last_login_display.admin_order_field = 'last_login'
    
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} users activated.')
    activate_users.short_description = 'Activate selected users'
    
    def deactivate_users(self, request, queryset):
        # Don't deactivate superusers
        queryset = queryset.filter(is_superuser=False)
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} users deactivated.')
    deactivate_users.short_description = 'Deactivate selected users'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user_email', 'user_type', 'created_at'
    ]
    list_filter = [
        'user__user_type', 'created_at'
    ]
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'bio']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['user']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Profile', {
            'fields': ('bio', 'date_of_birth')
        }),
        ('Location', {
            'fields': ('address', 'city', 'country')
        }),
        ('Preferences', {
            'fields': (
                'preferred_counties', 'preferred_property_types',
                'max_budget', 'min_bedrooms'
            )
        }),
        ('Settings', {
            'fields': (
                'privacy_settings',
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'
    
    def user_type(self, obj):
        return obj.user.user_type
    user_type.short_description = 'User Type'


@admin.register(SavedProperty)
class SavedPropertyAdmin(admin.ModelAdmin):
    list_display = [
        'user_email', 'property_title', 'property_location',
        'property_rent', 'notes_preview', 'saved_at'
    ]
    list_filter = ['saved_at', 'property__county', 'property__town']
    search_fields = [
        'user__email', 'property__title', 'notes',
        'property__county__name', 'property__town__name'
    ]
    readonly_fields = ['saved_at']
    autocomplete_fields = ['user', 'property']
    date_hierarchy = 'saved_at'
    
    fieldsets = (
        ('User & Property', {
            'fields': ('user', 'property')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('saved_at',)
        }),
    )
    
    def user_email(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def property_title(self, obj):
        url = reverse('admin:core_property_change', args=[obj.property.id])
        return format_html('<a href="{}">{}</a>', url, obj.property.title)
    property_title.short_description = 'Property'
    property_title.admin_order_field = 'property__title'
    
    def property_location(self, obj):
        return f"{obj.property.town.name}, {obj.property.county.name}"
    property_location.short_description = 'Location'
    
    def property_rent(self, obj):
        return f"€{obj.property.rent_monthly:,.0f}/month"
    property_rent.short_description = 'Rent'
    property_rent.admin_order_field = 'property__rent_monthly'
    
    def notes_preview(self, obj):
        if obj.notes:
            return obj.notes[:50] + '...' if len(obj.notes) > 50 else obj.notes
        return '-'
    notes_preview.short_description = 'Notes'


@admin.register(PropertyEnquiry)
class PropertyEnquiryAdmin(admin.ModelAdmin):
    list_display = [
        'property_title', 'user_email', 'user_name',
        'status_badge', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = [
        'property__title', 'user__email', 'user__first_name',
        'user__last_name', 'message'
    ]
    readonly_fields = ['created_at']
    autocomplete_fields = ['user', 'property']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Enquiry Details', {
            'fields': ('user', 'property', 'message')
        }),
        ('Response', {
            'fields': ('status',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_pending', 'mark_as_viewed', 'mark_as_responded']
    
    def property_title(self, obj):
        url = reverse('admin:core_property_change', args=[obj.property.id])
        return format_html('<a href="{}">{}</a>', url, obj.property.title)
    property_title.short_description = 'Property'
    property_title.admin_order_field = 'property__title'
    
    def user_email(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'
    
    def user_name(self, obj):
        return obj.user.get_full_name()
    user_name.short_description = 'User Name'
    
    def status_badge(self, obj):
        color_map = {
            'sent': '#f59e0b',
            'read': '#3b82f6',
            'replied': '#10b981',
            'closed': '#6b7280'
        }
        color = color_map.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 2px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def mark_as_pending(self, request, queryset):
        updated = queryset.update(status='sent')
        self.message_user(request, f'{updated} enquiries marked as sent.')
    mark_as_pending.short_description = 'Mark as sent'
    
    def mark_as_viewed(self, request, queryset):
        updated = queryset.update(status='read')
        self.message_user(request, f'{updated} enquiries marked as read.')
    mark_as_viewed.short_description = 'Mark as read'
    
    def mark_as_responded(self, request, queryset):
        updated = queryset.update(status='replied')
        self.message_user(request, f'{updated} enquiries marked as responded.')
    mark_as_responded.short_description = 'Mark as responded'


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = [
        'user_email', 'activity_type_badge', 'description_preview',
        'ip_address', 'user_agent_preview', 'timestamp'
    ]
    list_filter = ['activity_type', 'timestamp']
    search_fields = [
        'user__email', 'description', 'ip_address',
        'user_agent', 'metadata'
    ]
    readonly_fields = ['timestamp', 'user', 'activity_type', 'description', 
                      'ip_address', 'user_agent', 'metadata']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Activity', {
            'fields': ('user', 'activity_type', 'description')
        }),
        ('Technical Details', {
            'fields': ('ip_address', 'user_agent', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('timestamp',)
        }),
    )
    
    def has_add_permission(self, request):
        # Prevent manual creation of activity logs
        return False
    
    def has_change_permission(self, request, obj=None):
        # Make activity logs read-only
        return False
    
    def user_email(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'Anonymous'
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def activity_type_badge(self, obj):
        color_map = {
            'login': '#10b981',
            'logout': '#6b7280',
            'register': '#3b82f6',
            'view_property': '#8b5cf6',
            'save_property': '#ec4899',
            'enquiry': '#f59e0b',
            'profile_update': '#06b6d4'
        }
        color = color_map.get(obj.activity_type, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 2px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.activity_type.replace('_', ' ').upper()
        )
    activity_type_badge.short_description = 'Type'
    activity_type_badge.admin_order_field = 'activity_type'
    
    def description_preview(self, obj):
        if obj.description:
            return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
        return '-'
    description_preview.short_description = 'Description'
    
    def user_agent_preview(self, obj):
        if obj.user_agent:
            # Extract browser and OS info
            ua = obj.user_agent.lower()
            browser = 'Unknown'
            if 'chrome' in ua:
                browser = 'Chrome'
            elif 'firefox' in ua:
                browser = 'Firefox'
            elif 'safari' in ua:
                browser = 'Safari'
            elif 'edge' in ua:
                browser = 'Edge'
            
            os = 'Unknown'
            if 'windows' in ua:
                os = 'Windows'
            elif 'mac' in ua:
                os = 'macOS'
            elif 'linux' in ua:
                os = 'Linux'
            elif 'android' in ua:
                os = 'Android'
            elif 'ios' in ua or 'iphone' in ua or 'ipad' in ua:
                os = 'iOS'
            
            return f"{browser} on {os}"
        return '-'
    user_agent_preview.short_description = 'Browser/OS'


@admin.register(IdentityVerification)
class IdentityVerificationAdmin(admin.ModelAdmin):
    list_display = [
        'user_email', 'verification_type', 'status_badge', 'provider',
        'document_type', 'risk_score_display', 'created_at', 'verified_at'
    ]
    list_filter = [
        'status', 'verification_type', 'provider', 'document_type',
        'requires_manual_review', 'created_at', 'verified_at'
    ]
    search_fields = [
        'user__email', 'user__first_name', 'user__last_name',
        'stripe_verification_session_id', 'stripe_verification_report_id',
        'failure_reason'
    ]
    readonly_fields = [
        'user', 'created_at', 'updated_at', 'verified_at',
        'stripe_verification_session_id', 'stripe_verification_report_id',
        'verification_data'
    ]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('User & Type', {
            'fields': ('user', 'verification_type', 'verification_level')
        }),
        ('Status', {
            'fields': ('status', 'failure_reason', 'requires_manual_review')
        }),
        ('Provider Details', {
            'fields': (
                'provider', 'provider_session_id', 'provider_verification_id',
                'stripe_verification_session_id', 'stripe_verification_report_id'
            )
        }),
        ('Document Information', {
            'fields': (
                'document_type', 'document_country',
                'document_front_url', 'document_back_url', 'selfie_url'
            ),
            'classes': ('collapse',)
        }),
        ('Risk Assessment', {
            'fields': ('risk_score', 'verification_data')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'verified_at', 'expires_at')
        }),
    )
    
    actions = ['mark_as_verified', 'mark_as_failed', 'require_manual_review']
    
    def user_email(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def status_badge(self, obj):
        color_map = {
            'pending': '#f59e0b',
            'processing': '#3b82f6',
            'verified': '#10b981',
            'failed': '#ef4444',
            'expired': '#6b7280',
            'requires_input': '#8b5cf6',
            'canceled': '#6b7280'
        }
        color = color_map.get(obj.status, '#6b7280')
        
        icon = ''
        if obj.status == 'verified':
            icon = '✓ '
        elif obj.status == 'failed':
            icon = '✗ '
        elif obj.status == 'processing':
            icon = '⟳ '
        elif obj.status == 'requires_input':
            icon = '! '
        
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 2px 8px; border-radius: 3px; font-size: 11px;">{}{}</span>',
            color, icon, obj.status.upper()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def risk_score_display(self, obj):
        if obj.risk_score is not None:
            # Convert to percentage
            score = obj.risk_score * 100
            if score < 30:
                color = '#10b981'  # Green - low risk
            elif score < 70:
                color = '#f59e0b'  # Yellow - medium risk
            else:
                color = '#ef4444'  # Red - high risk
            
            return format_html(
                '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
                color, score
            )
        return '-'
    risk_score_display.short_description = 'Risk Score'
    risk_score_display.admin_order_field = 'risk_score'
    
    def mark_as_verified(self, request, queryset):
        updated = queryset.update(
            status='verified',
            verified_at=timezone.now()
        )
        # Update users' identity verification status
        for verification in queryset:
            user = verification.user
            user.identity_verified = True
            user.save()
            user.update_verification_level()
        self.message_user(request, f'{updated} verifications marked as verified.')
    mark_as_verified.short_description = 'Mark as verified'
    
    def mark_as_failed(self, request, queryset):
        updated = queryset.update(status='failed')
        self.message_user(request, f'{updated} verifications marked as failed.')
    mark_as_failed.short_description = 'Mark as failed'
    
    def require_manual_review(self, request, queryset):
        updated = queryset.update(requires_manual_review=True)
        self.message_user(request, f'{updated} verifications marked for manual review.')
    require_manual_review.short_description = 'Flag for manual review'
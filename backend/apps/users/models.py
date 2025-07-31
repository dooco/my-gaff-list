from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
import uuid


class User(AbstractUser):
    """Custom User model extending Django's AbstractUser"""
    
    USER_TYPES = [
        ('renter', 'Renter'),
        ('landlord', 'Landlord'),
        ('agent', 'Estate Agent'),
        ('admin', 'Administrator'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='renter')
    
    # Additional fields
    phone_number = models.CharField(
        max_length=15, 
        blank=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
        )]
    )
    
    # Profile completion and verification
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    profile_completed = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use email as username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'auth_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class UserProfile(models.Model):
    """Extended user profile with preferences and additional information"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Personal Information
    bio = models.TextField(max_length=500, blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    avatar = models.URLField(blank=True, help_text="Profile picture URL")
    
    # Location Preferences
    preferred_counties = models.JSONField(default=list, blank=True, help_text="List of preferred county IDs")
    preferred_towns = models.JSONField(default=list, blank=True, help_text="List of preferred town IDs")
    
    # Search Preferences
    max_budget = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    min_bedrooms = models.PositiveIntegerField(default=1)
    preferred_property_types = models.JSONField(default=list, blank=True)
    preferred_furnished = models.CharField(
        max_length=20,
        choices=[('any', 'Any'), ('furnished', 'Furnished'), ('unfurnished', 'Unfurnished')],
        default='any'
    )
    
    # Notifications Preferences
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    new_property_alerts = models.BooleanField(default=True)
    price_drop_alerts = models.BooleanField(default=True)
    
    # Privacy Settings
    profile_visibility = models.CharField(
        max_length=20,
        choices=[('public', 'Public'), ('private', 'Private'), ('landlords_only', 'Landlords Only')],
        default='private'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.full_name}'s Profile"


class UserActivity(models.Model):
    """Track user activity for analytics and engagement"""
    
    ACTIVITY_TYPES = [
        ('login', 'Login'),
        ('property_view', 'Property Viewed'),
        ('search', 'Property Search'),
        ('enquiry_sent', 'Enquiry Sent'),
        ('property_saved', 'Property Saved'),
        ('property_unsaved', 'Property Unsaved'),
        ('profile_updated', 'Profile Updated'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional activity data")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'activity_type']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.activity_type} at {self.timestamp}"


class SavedProperty(models.Model):
    """User's saved/favorite properties"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_properties')
    property = models.ForeignKey('core.Property', on_delete=models.CASCADE, related_name='saved_by_users')
    saved_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(max_length=500, blank=True, help_text="Personal notes about this property")
    
    class Meta:
        unique_together = ['user', 'property']
        ordering = ['-saved_at']
    
    def __str__(self):
        return f"{self.user.email} saved {self.property.title}"


class PropertyEnquiry(models.Model):
    """Track property enquiries from users"""
    
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('read', 'Read by Landlord'),
        ('replied', 'Replied'),
        ('closed', 'Closed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enquiries', null=True, blank=True)
    property = models.ForeignKey('core.Property', on_delete=models.CASCADE, related_name='enquiries')
    
    # Contact details (for non-authenticated users)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    
    # Enquiry details
    message = models.TextField(max_length=1000)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    
    # Landlord response
    landlord_response = models.TextField(blank=True, help_text="Response from landlord")
    response_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['property', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        user_display = self.user.email if self.user else self.email
        return f"Enquiry from {user_display} for {self.property.title}"
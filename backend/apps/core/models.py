from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.conf import settings
import uuid
import os
import re

User = get_user_model()


def validate_eircode(value):
    """Validate Irish Eircode format"""
    if not value:
        return  # Allow blank for now during migration
    
    # Remove spaces and convert to uppercase for validation
    clean_value = value.upper().replace(' ', '')
    
    # Irish Eircode pattern: Letter + 2 digits + 4 alphanumeric
    pattern = r'^[A-Z]\d{2}[A-Z0-9]{4}$'
    
    if not re.match(pattern, clean_value):
        raise ValidationError(
            'Invalid Eircode format. Must be in format like D02 X285 or D02X285'
        )


class County(models.Model):
    """Irish County model"""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    
    class Meta:
        verbose_name_plural = "Counties"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Town(models.Model):
    """Irish Town/City model"""
    name = models.CharField(max_length=100)
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name='towns')
    slug = models.SlugField(max_length=100)
    
    class Meta:
        unique_together = ['name', 'county']
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name}, {self.county.name}"


class Landlord(models.Model):
    """Landlord/Agent model with verification system"""
    
    USER_TYPES = [
        ('landlord', 'Landlord'),
        ('agent', 'Estate Agent'),
        ('property_manager', 'Property Manager'),
    ]
    
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='landlord')
    
    # Verification system
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    verification_documents = models.JSONField(default=list, blank=True, help_text="List of verification document references")
    verification_notes = models.TextField(blank=True)
    
    # Business details for agents
    company_name = models.CharField(max_length=100, blank=True)
    license_number = models.CharField(max_length=50, blank=True, help_text="PSRA license number for agents")
    
    # Contact preferences
    preferred_contact_method = models.CharField(
        max_length=20, 
        choices=[('phone', 'Phone'), ('email', 'Email'), ('both', 'Both')],
        default='both'
    )
    response_time_hours = models.PositiveIntegerField(default=24, help_text="Typical response time in hours")
    
    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        verified_status = " (Verified)" if self.is_verified else " (Unverified)"
        return f"{self.name}{verified_status}"
    
    @property
    def display_name(self):
        """Display name with company if agent"""
        if self.company_name and self.user_type == 'agent':
            return f"{self.name} - {self.company_name}"
        return self.name


def property_image_upload_path(instance, filename):
    """Generate upload path for property images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return f"properties/{instance.property.id}/{filename}"


class PropertyImage(models.Model):
    """Property Image model for handling multiple images per property"""
    property = models.ForeignKey('Property', on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=property_image_upload_path)
    caption = models.CharField(max_length=200, blank=True)
    is_main = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"Image for {self.property.title} ({'Main' if self.is_main else 'Additional'})"
    
    def save(self, *args, **kwargs):
        # Ensure only one main image per property
        if self.is_main:
            PropertyImage.objects.filter(property=self.property, is_main=True).update(is_main=False)
        super().save(*args, **kwargs)


class Property(models.Model):
    """Irish Property Rental Listing model"""
    
    PROPERTY_TYPES = [
        ('apartment', 'Apartment'),
        ('house', 'House'),
        ('shared', 'Shared Accommodation'),
        ('studio', 'Studio'),
        ('room', 'Room'),
    ]
    
    HOUSE_TYPES = [
        ('detached', 'Detached House'),
        ('semi_detached', 'Semi-Detached House'),
        ('terraced', 'Terraced House'),
        ('end_terrace', 'End of Terrace House'),
        ('cottage', 'Cottage'),
        ('bungalow', 'Bungalow'),
        ('townhouse', 'Townhouse'),
        ('duplex', 'Duplex'),
    ]
    
    BER_RATINGS = [
        ('A1', 'A1'), ('A2', 'A2'), ('A3', 'A3'),
        ('B1', 'B1'), ('B2', 'B2'), ('B3', 'B3'),
        ('C1', 'C1'), ('C2', 'C2'), ('C3', 'C3'),
        ('D1', 'D1'), ('D2', 'D2'),
        ('E1', 'E1'), ('E2', 'E2'),
        ('F', 'F'), ('G', 'G'),
        ('EXEMPT', 'Exempt'),
    ]
    
    FURNISHED_CHOICES = [
        ('furnished', 'Furnished'),
        ('unfurnished', 'Unfurnished'),
        ('part_furnished', 'Part Furnished'),
    ]
    
    CONTACT_METHODS = [
        ('direct', 'Direct Contact'),
        ('message_only', 'Message Only'),
    ]
    
    LEASE_DURATION_TYPES = [
        ('short_term', 'Short-term (< 12 months)'),
        ('long_term', 'Long-term (12+ months)'),
    ]
    
    PARKING_TYPES = [
        ('none', 'No Parking'),
        ('street', 'Street Parking'),
        ('dedicated', 'Dedicated Spot'),
        ('garage', 'Garage'),
    ]
    
    OUTDOOR_SPACE_TYPES = [
        ('none', 'None'),
        ('balcony', 'Balcony'),
        ('patio', 'Patio'),
        ('garden', 'Garden'),
    ]
    
    VIEWING_TYPES = [
        ('in_person', 'In-Person Only'),
        ('virtual', 'Virtual Only'),
        ('both', 'In-Person or Virtual'),
    ]
    
    # Basic Info
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Location
    county = models.ForeignKey(County, on_delete=models.CASCADE)
    town = models.ForeignKey(Town, on_delete=models.CASCADE)
    address = models.CharField(max_length=300, blank=True, default='')  # Temporarily keep for migration, now optional
    
    # New structured address fields
    address_line_1 = models.CharField(max_length=200, blank=True, help_text="House/building number and street")
    address_line_2 = models.CharField(max_length=200, blank=True, help_text="Area, townland, or district")
    eircode = models.CharField(
        max_length=8, 
        blank=True, 
        validators=[validate_eircode],
        help_text="Irish postcode (e.g., D02 X285)"
    )
    
    # Geocoding fields
    latitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7, 
        null=True, 
        blank=True,
        help_text="Latitude coordinate for map display"
    )
    longitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7, 
        null=True, 
        blank=True,
        help_text="Longitude coordinate for map display"
    )
    
    # Property Details
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPES)
    house_type = models.CharField(max_length=20, choices=HOUSE_TYPES, blank=True)
    bedrooms = models.PositiveIntegerField(validators=[MinValueValidator(0), MaxValueValidator(10)])
    bathrooms = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    floor_area = models.PositiveIntegerField(null=True, blank=True, help_text="Floor area in sq metres")
    
    # Rental Info
    rent_monthly = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0)])
    deposit = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    furnished = models.CharField(max_length=20, choices=FURNISHED_CHOICES)
    lease_duration = models.CharField(max_length=50, blank=True, help_text="e.g., '12', '18', 'flexible'")
    
    # Energy Rating
    ber_rating = models.CharField(max_length=10, choices=BER_RATINGS, blank=True)
    ber_number = models.CharField(max_length=20, blank=True, help_text="BER Certificate Number")
    
    # Features
    features = models.JSONField(default=list, blank=True, help_text="List of property features")
    
    # Legacy image support (for backward compatibility)
    main_image = models.URLField(blank=True)
    image_urls = models.JSONField(default=list, blank=True, help_text="List of image URLs")
    
    # Availability
    available_from = models.DateField()
    available_to = models.DateField(null=True, blank=True, help_text="End date for lease (optional)")
    
    # Additional Filter Fields
    lease_duration_type = models.CharField(
        max_length=20, 
        choices=LEASE_DURATION_TYPES, 
        blank=True,
        help_text="Short-term (< 12 months) or Long-term (12+ months)"
    )
    pet_friendly = models.BooleanField(default=False, help_text="Are pets allowed?")
    parking_type = models.CharField(
        max_length=20, 
        choices=PARKING_TYPES, 
        default='none',
        help_text="Type of parking available"
    )
    outdoor_space = models.CharField(
        max_length=20, 
        choices=OUTDOOR_SPACE_TYPES, 
        default='none',
        help_text="Type of outdoor space available"
    )
    bills_included = models.BooleanField(default=False, help_text="Are bills included in rent?")
    viewing_type = models.CharField(
        max_length=20, 
        choices=VIEWING_TYPES, 
        default='both',
        help_text="How can the property be viewed?"
    )
    
    # Contact Method
    contact_method = models.CharField(max_length=20, choices=CONTACT_METHODS, default='direct')
    
    # Landlord/Agent relationship
    landlord = models.ForeignKey(Landlord, on_delete=models.CASCADE, related_name='properties', null=True, blank=True)
    # Link to actual user who created the listing
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_properties', null=True, blank=True)
    
    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Stats
    view_count = models.PositiveIntegerField(default=0)
    enquiry_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - €{self.rent_monthly}/month"
    
    @property
    def location_display(self):
        """Display location as 'Town, County'"""
        return f"{self.town.name}, {self.county.name}"
    
    @property
    def full_address(self):
        """Combine address fields for complete display"""
        parts = []
        if self.address_line_1:
            parts.append(self.address_line_1)
        if self.address_line_2:
            parts.append(self.address_line_2)
        if self.town:
            parts.append(self.town.name)
        if self.county:
            parts.append(f"Co. {self.county.name}")
        if self.eircode:
            # Format Eircode with space if not already formatted
            eircode_clean = self.eircode.upper().replace(' ', '')
            if len(eircode_clean) == 7:
                formatted_eircode = f"{eircode_clean[:3]} {eircode_clean[3:]}"
            else:
                formatted_eircode = self.eircode
            parts.append(formatted_eircode)
        return ", ".join(parts)
    
    @property
    def ber_color_class(self):
        """Return CSS class for BER rating color"""
        if self.ber_rating.startswith('A'):
            return 'ber-a'  # Dark green
        elif self.ber_rating.startswith('B'):
            return 'ber-b'  # Light green
        elif self.ber_rating.startswith('C'):
            return 'ber-c'  # Yellow
        elif self.ber_rating.startswith('D'):
            return 'ber-d'  # Orange
        elif self.ber_rating.startswith('E'):
            return 'ber-e'  # Red
        elif self.ber_rating == 'F':
            return 'ber-f'  # Dark red
        elif self.ber_rating == 'G':
            return 'ber-g'  # Maroon
        return 'ber-exempt'  # Grey for exempt
    
    def clean(self):
        """Validate model fields"""
        super().clean()
        
        # Validate date range
        if self.available_to and self.available_from:
            if self.available_to <= self.available_from:
                raise ValidationError({
                    'available_to': 'End date must be after start date.'
                })
        
        # Auto-set lease duration type based on dates if not set
        if self.available_from and self.available_to and not self.lease_duration_type:
            from datetime import timedelta
            duration = self.available_to - self.available_from
            if duration < timedelta(days=365):
                self.lease_duration_type = 'short_term'
            else:
                self.lease_duration_type = 'long_term'
    
    def save(self, *args, **kwargs):
        """Override save to geocode eircode when it changes"""
        # Run validation
        self.full_clean()
        
        # Check if eircode has changed
        geocode_needed = False
        
        if self.pk:  # Existing property
            try:
                old_property = Property.objects.get(pk=self.pk)
                if old_property.eircode != self.eircode:
                    geocode_needed = True
            except Property.DoesNotExist:
                geocode_needed = True if self.eircode else False
        else:  # New property
            geocode_needed = True if self.eircode else False
        
        # Save first
        super().save(*args, **kwargs)
        
        # Then geocode if needed (after save so we have an ID)
        if geocode_needed and self.eircode and not self.eircode.endswith('0000'):
            from apps.core.services.geocoding import geocode_property
            try:
                geocode_property(self)
            except Exception as e:
                # Log error but don't fail the save
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to geocode property {self.id}: {e}")
    
    def soft_delete(self):
        """Soft delete the property by setting deleted_at timestamp"""
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save()
    
    def restore(self):
        """Restore a soft deleted property"""
        self.deleted_at = None
        self.is_active = True
        self.save()
    
    @property
    def is_deleted(self):
        """Check if property is soft deleted"""
        return self.deleted_at is not None
    
    @property
    def main_image_url(self):
        """Get the main image URL, prioritizing uploaded images over legacy URLs"""
        main_image = self.images.filter(is_main=True).first()
        if main_image:
            return main_image.image.url
        elif self.images.exists():
            return self.images.first().image.url
        elif self.main_image:
            return self.main_image
        return None
    
    def increment_view_count(self):
        """Increment view count"""
        self.view_count += 1
        self.save(update_fields=['view_count'])
    
    def increment_enquiry_count(self):
        """Increment enquiry count"""
        self.enquiry_count += 1
        self.save(update_fields=['enquiry_count'])


class PropertySearchQuery(models.Model):
    """Track search queries for analytics and suggestions"""
    query = models.CharField(max_length=255)
    filters = models.JSONField(default=dict)
    results_count = models.PositiveIntegerField(default=0)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    searched_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-searched_at']
        verbose_name_plural = "Property search queries"
    
    def __str__(self):
        return f"Search: {self.query} ({self.results_count} results)"



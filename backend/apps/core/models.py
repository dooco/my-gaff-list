from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


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


class Property(models.Model):
    """Irish Property Rental Listing model"""
    
    PROPERTY_TYPES = [
        ('apartment', 'Apartment'),
        ('house', 'House'),
        ('shared', 'Shared Accommodation'),
        ('studio', 'Studio'),
        ('townhouse', 'Townhouse'),
    ]
    
    HOUSE_TYPES = [
        ('terraced', 'Terraced'),
        ('semi_detached', 'Semi-Detached'),
        ('detached', 'Detached'),
        ('bungalow', 'Bungalow'),
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
    
    # Basic Info
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Location
    county = models.ForeignKey(County, on_delete=models.CASCADE)
    town = models.ForeignKey(Town, on_delete=models.CASCADE)
    address = models.CharField(max_length=300, blank=True)
    
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
    
    # Energy Rating
    ber_rating = models.CharField(max_length=10, choices=BER_RATINGS, blank=True)
    ber_number = models.CharField(max_length=20, blank=True, help_text="BER Certificate Number")
    
    # Features
    features = models.JSONField(default=list, blank=True, help_text="List of property features")
    
    # Images
    main_image = models.URLField(blank=True)
    image_urls = models.JSONField(default=list, blank=True, help_text="List of image URLs")
    
    # Availability
    available_from = models.DateField()
    lease_length = models.CharField(max_length=50, blank=True, help_text="e.g., '12 months', 'Long term'")
    
    # Contact - Landlord/Agent relationship
    landlord = models.ForeignKey(Landlord, on_delete=models.CASCADE, related_name='properties', null=True, blank=True)
    
    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - €{self.rent_monthly}/month"
    
    @property
    def location_display(self):
        """Display location as 'Town, County'"""
        return f"{self.town.name}, {self.county.name}"
    
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

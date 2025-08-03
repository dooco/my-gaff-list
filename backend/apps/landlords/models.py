from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from apps.core.models import Landlord

User = get_user_model()


class LandlordProfile(models.Model):
    """Extended landlord profile linking User to Landlord"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='landlord_profile')
    landlord = models.OneToOneField(Landlord, on_delete=models.CASCADE, related_name='user_profile')
    
    # Business verification
    business_license = models.CharField(max_length=100, blank=True, help_text="Business license or registration number")
    tax_number = models.CharField(max_length=50, blank=True, help_text="Tax identification number")
    
    # Bank details for rent collection (encrypted)
    bank_name = models.CharField(max_length=100, blank=True)
    iban = models.CharField(
        max_length=34, 
        blank=True,
        validators=[RegexValidator(
            regex=r'^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{6,7}([A-Z0-9]?){0,16}$',
            message="Enter a valid IBAN number"
        )]
    )
    
    # Preferences
    auto_reply_enabled = models.BooleanField(default=False)
    auto_reply_message = models.TextField(blank=True, max_length=500, help_text="Automatic reply to enquiries")
    
    # Notification preferences
    email_on_enquiry = models.BooleanField(default=True)
    sms_on_enquiry = models.BooleanField(default=False)
    daily_summary = models.BooleanField(default=True)
    
    # Analytics preferences
    allow_analytics = models.BooleanField(default=True)
    public_profile = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Profile for {self.landlord.name}"
    
    @property
    def total_properties(self):
        return self.landlord.properties.filter(is_active=True).count()
    
    @property
    def total_enquiries(self):
        return sum(prop.enquiries.count() for prop in self.landlord.properties.all())


class PropertyStats(models.Model):
    """Daily property statistics for analytics"""
    
    property = models.ForeignKey('core.Property', on_delete=models.CASCADE, related_name='daily_stats')
    date = models.DateField()
    
    # Daily metrics
    views = models.PositiveIntegerField(default=0)
    enquiries = models.PositiveIntegerField(default=0)
    saves = models.PositiveIntegerField(default=0)
    
    # Cumulative metrics (for quick access)
    total_views = models.PositiveIntegerField(default=0)
    total_enquiries = models.PositiveIntegerField(default=0)
    total_saves = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ['property', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.property.title} - {self.date}"
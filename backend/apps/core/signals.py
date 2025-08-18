"""
Signals for the core app
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Property
from .services.geocoding import geocode_property
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Property)
def geocode_property_on_save(sender, instance, created, **kwargs):
    """
    Automatically geocode a property when it's created or updated
    """
    # Skip if the property already has coordinates
    if instance.latitude and instance.longitude:
        return
    
    # Skip if there's no eircode or address to geocode
    if not instance.eircode and not instance.address:
        return
    
    # Skip placeholder eircodes
    if instance.eircode and '0000' in instance.eircode:
        return
    
    # Geocode the property asynchronously to avoid blocking the save
    try:
        geocode_property(instance)
        logger.info(f"Successfully geocoded property {instance.id}")
    except Exception as e:
        logger.error(f"Failed to geocode property {instance.id}: {e}")
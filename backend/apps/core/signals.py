"""
Signals for the core app
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Property, County, Town
from .services.geocoding import geocode_property
from .cache import invalidate_property_cache, invalidate_location_cache
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


@receiver(post_save, sender=Property)
def invalidate_property_cache_on_save(sender, instance, created, **kwargs):
    """
    Invalidate property caches when a property is created or updated
    """
    try:
        invalidate_property_cache(property_id=str(instance.id))
        logger.debug(f"Invalidated cache for property {instance.id}")
    except Exception as e:
        logger.warning(f"Failed to invalidate property cache: {e}")


@receiver(post_delete, sender=Property)
def invalidate_property_cache_on_delete(sender, instance, **kwargs):
    """
    Invalidate property caches when a property is deleted
    """
    try:
        invalidate_property_cache(property_id=str(instance.id))
        logger.debug(f"Invalidated cache after deleting property {instance.id}")
    except Exception as e:
        logger.warning(f"Failed to invalidate property cache on delete: {e}")


@receiver([post_save, post_delete], sender=County)
def invalidate_location_cache_on_county_change(sender, instance, **kwargs):
    """
    Invalidate location caches when counties change
    """
    try:
        invalidate_location_cache()
        logger.debug(f"Invalidated location cache after county change")
    except Exception as e:
        logger.warning(f"Failed to invalidate location cache: {e}")


@receiver([post_save, post_delete], sender=Town)
def invalidate_location_cache_on_town_change(sender, instance, **kwargs):
    """
    Invalidate location caches when towns change
    """
    try:
        invalidate_location_cache()
        logger.debug(f"Invalidated location cache after town change")
    except Exception as e:
        logger.warning(f"Failed to invalidate location cache: {e}")
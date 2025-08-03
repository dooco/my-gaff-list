from rest_framework import permissions
from .models import LandlordProfile


class IsLandlord(permissions.BasePermission):
    """
    Permission to check if user is a landlord
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user type is landlord
        if request.user.user_type not in ['landlord', 'agent']:
            return False
        
        # Check if landlord profile exists
        try:
            LandlordProfile.objects.get(user=request.user)
            return True
        except LandlordProfile.DoesNotExist:
            return False


class IsPropertyOwner(permissions.BasePermission):
    """
    Permission to check if user owns the property
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user is the owner of the property
        return obj.owner == request.user or obj.landlord.user_profile.user == request.user
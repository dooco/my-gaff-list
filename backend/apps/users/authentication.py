"""
Custom JWT authentication that reads tokens from httpOnly cookies.
CRITICAL-6: Secure token storage implementation.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication class that reads the access token from
    an httpOnly cookie instead of the Authorization header.
    
    This provides better security against XSS attacks since JavaScript
    cannot access httpOnly cookies.
    """
    
    def authenticate(self, request):
        # First, try to get token from cookie
        raw_token = request.COOKIES.get(
            getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'access_token')
        )
        
        if raw_token is None:
            # Fall back to header-based auth for backwards compatibility
            # (e.g., mobile apps that can't use cookies)
            return super().authenticate(request)
        
        # Validate the token
        try:
            validated_token = self.get_validated_token(raw_token)
        except InvalidToken as e:
            # Token is invalid or expired
            return None
        
        try:
            user = self.get_user(validated_token)
        except AuthenticationFailed:
            return None
        
        return (user, validated_token)

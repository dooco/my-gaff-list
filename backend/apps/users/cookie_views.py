"""
Custom JWT views that use httpOnly cookies for token storage.
CRITICAL-6: Secure token storage implementation.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

User = get_user_model()


def get_cookie_settings():
    """Get cookie settings from Django settings."""
    jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
    debug = getattr(settings, 'DEBUG', False)
    
    return {
        'access_cookie': jwt_settings.get('AUTH_COOKIE', 'access_token'),
        'refresh_cookie': jwt_settings.get('AUTH_COOKIE_REFRESH', 'refresh_token'),
        'secure': jwt_settings.get('AUTH_COOKIE_SECURE', not debug),
        'httponly': jwt_settings.get('AUTH_COOKIE_HTTP_ONLY', True),
        'path': jwt_settings.get('AUTH_COOKIE_PATH', '/'),
        'samesite': jwt_settings.get('AUTH_COOKIE_SAMESITE', 'Lax'),
        'access_max_age': int(jwt_settings.get('ACCESS_TOKEN_LIFETIME').total_seconds())
            if jwt_settings.get('ACCESS_TOKEN_LIFETIME') else 3600,
        'refresh_max_age': int(jwt_settings.get('REFRESH_TOKEN_LIFETIME').total_seconds())
            if jwt_settings.get('REFRESH_TOKEN_LIFETIME') else 604800,
    }


def set_auth_cookies(response, access_token, refresh_token=None):
    """Set httpOnly cookies for JWT tokens."""
    cookie_settings = get_cookie_settings()
    
    # Set access token cookie
    response.set_cookie(
        key=cookie_settings['access_cookie'],
        value=str(access_token),
        max_age=cookie_settings['access_max_age'],
        secure=cookie_settings['secure'],
        httponly=cookie_settings['httponly'],
        path=cookie_settings['path'],
        samesite=cookie_settings['samesite'],
    )
    
    # Set refresh token cookie if provided
    if refresh_token:
        response.set_cookie(
            key=cookie_settings['refresh_cookie'],
            value=str(refresh_token),
            max_age=cookie_settings['refresh_max_age'],
            secure=cookie_settings['secure'],
            httponly=cookie_settings['httponly'],
            path=cookie_settings['path'],
            samesite=cookie_settings['samesite'],
        )
    
    return response


def clear_auth_cookies(response):
    """Clear JWT token cookies."""
    cookie_settings = get_cookie_settings()
    
    response.delete_cookie(
        key=cookie_settings['access_cookie'],
        path=cookie_settings['path'],
    )
    response.delete_cookie(
        key=cookie_settings['refresh_cookie'],
        path=cookie_settings['path'],
    )
    
    return response


class CookieTokenObtainPairView(TokenObtainPairView):
    """
    Login view that sets JWT tokens in httpOnly cookies.
    
    Takes email and password, returns user data.
    Access and refresh tokens are set as httpOnly cookies.
    """
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            return Response(
                {'detail': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get the tokens
        access_token = serializer.validated_data.get('access')
        refresh_token = serializer.validated_data.get('refresh')
        
        # Get the user
        user = User.objects.get(email=request.data.get('email'))
        user_data = UserSerializer(user).data
        
        # Create response with user data (no tokens in body)
        response = Response({
            'user': user_data,
            'message': 'Login successful',
        }, status=status.HTTP_200_OK)
        
        # Set cookies
        set_auth_cookies(response, access_token, refresh_token)
        
        return response


class CookieTokenRefreshView(APIView):
    """
    Refresh view that reads refresh token from httpOnly cookie
    and sets new tokens in cookies.
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        cookie_settings = get_cookie_settings()
        refresh_token = request.COOKIES.get(cookie_settings['refresh_cookie'])
        
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token not found'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            # Validate and get new tokens
            token = RefreshToken(refresh_token)
            access_token = str(token.access_token)
            
            # Get new refresh token if rotation is enabled
            new_refresh_token = None
            jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
            if jwt_settings.get('ROTATE_REFRESH_TOKENS', False):
                # Blacklist the old token if enabled
                if jwt_settings.get('BLACKLIST_AFTER_ROTATION', False):
                    try:
                        token.blacklist()
                    except AttributeError:
                        # Blacklist not enabled
                        pass
                # Create new refresh token
                new_refresh_token = str(RefreshToken.for_user(token.payload.get('user_id')))
            
            # Create response
            response = Response({
                'message': 'Token refreshed successfully',
            }, status=status.HTTP_200_OK)
            
            # Set new cookies
            set_auth_cookies(response, access_token, new_refresh_token or refresh_token)
            
            return response
            
        except TokenError as e:
            return Response(
                {'detail': 'Invalid or expired refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class CookieLogoutView(APIView):
    """
    Logout view that clears JWT token cookies and optionally
    blacklists the refresh token.
    """
    permission_classes = [AllowAny]  # Allow logout even if token expired
    
    def post(self, request, *args, **kwargs):
        cookie_settings = get_cookie_settings()
        refresh_token = request.COOKIES.get(cookie_settings['refresh_cookie'])
        
        # Try to blacklist the refresh token
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, AttributeError):
                # Token invalid or blacklist not enabled - that's okay
                pass
        
        # Create response and clear cookies
        response = Response({
            'message': 'Logout successful',
        }, status=status.HTTP_200_OK)
        
        clear_auth_cookies(response)
        
        return response


class CookieAuthStatusView(APIView):
    """
    Check if the current session is authenticated.
    Useful for the frontend to verify auth status on page load.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, *args, **kwargs):
        if request.user and request.user.is_authenticated:
            user_data = UserSerializer(request.user).data
            return Response({
                'authenticated': True,
                'user': user_data,
            }, status=status.HTTP_200_OK)
        
        return Response({
            'authenticated': False,
            'user': None,
        }, status=status.HTTP_200_OK)

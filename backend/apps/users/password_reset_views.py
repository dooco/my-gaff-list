from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta

from .models import PasswordResetToken
from .services import EmailService
from .serializers import UserSerializer

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Request a password reset email"""
    email = request.data.get('email')
    
    if not email:
        return Response({
            'error': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generic success message to prevent user enumeration
    success_message = "If an account exists with this email, a password reset link has been sent."
    
    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        # Return success even if user doesn't exist (security)
        return Response({
            'message': success_message,
            'success': True
        })
    
    # Check for recent reset requests (rate limiting)
    recent_tokens = PasswordResetToken.objects.filter(
        user=user,
        created_at__gte=timezone.now() - timedelta(hours=1),
        is_used=False
    ).count()
    
    if recent_tokens >= 3:
        # Still return success message but don't send email
        return Response({
            'message': success_message,
            'success': True
        })
    
    # Get client IP for security logging
    client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or \
                request.META.get('REMOTE_ADDR')
    
    # Create password reset token
    token = EmailService.create_password_reset_token(user, client_ip)
    
    # Send password reset email
    email_sent = EmailService.send_password_reset_email(user, token)
    
    return Response({
        'message': success_message,
        'success': True
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_reset_token(request):
    """Verify if a password reset token is valid"""
    token = request.data.get('token')
    
    if not token:
        return Response({
            'error': 'Token is required',
            'valid': False
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        reset_token = PasswordResetToken.objects.get(
            token=token,
            is_used=False
        )
        
        if reset_token.is_expired:
            return Response({
                'error': 'Token has expired',
                'valid': False
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'valid': True,
            'email': reset_token.user.email
        })
        
    except PasswordResetToken.DoesNotExist:
        return Response({
            'error': 'Invalid token',
            'valid': False
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password with a valid token"""
    token = request.data.get('token')
    password = request.data.get('password')
    password_confirm = request.data.get('password_confirm')
    
    # Validate input
    if not all([token, password, password_confirm]):
        return Response({
            'error': 'Token, password, and password confirmation are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if password != password_confirm:
        return Response({
            'error': 'Passwords do not match'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate password strength
    if len(password) < 8:
        return Response({
            'error': 'Password must be at least 8 characters long'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        reset_token = PasswordResetToken.objects.get(
            token=token,
            is_used=False
        )
        
        if reset_token.is_expired:
            return Response({
                'error': 'Token has expired. Please request a new password reset.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update user password
        user = reset_token.user
        user.set_password(password)
        user.save()
        
        # Mark token as used
        reset_token.is_used = True
        reset_token.used_at = timezone.now()
        reset_token.save()
        
        # Invalidate all other password reset tokens for this user
        PasswordResetToken.objects.filter(
            user=user,
            is_used=False
        ).exclude(id=reset_token.id).update(
            is_used=True,
            used_at=timezone.now()
        )
        
        # Optional: Send confirmation email
        EmailService.send_password_change_confirmation(user)
        
        return Response({
            'message': 'Password successfully reset. You can now log in with your new password.',
            'success': True
        })
        
    except PasswordResetToken.DoesNotExist:
        return Response({
            'error': 'Invalid or expired token'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_password_strength(request):
    """Validate password strength without saving"""
    password = request.data.get('password')
    
    if not password:
        return Response({
            'valid': False,
            'errors': ['Password is required']
        })
    
    errors = []
    strength = 0
    
    # Check length
    if len(password) < 8:
        errors.append('Password must be at least 8 characters long')
    else:
        strength += 25
    
    # Check for uppercase
    if not any(c.isupper() for c in password):
        errors.append('Password should contain at least one uppercase letter')
    else:
        strength += 25
    
    # Check for lowercase
    if not any(c.islower() for c in password):
        errors.append('Password should contain at least one lowercase letter')
    else:
        strength += 25
    
    # Check for numbers
    if not any(c.isdigit() for c in password):
        errors.append('Password should contain at least one number')
    else:
        strength += 25
    
    # Determine strength level
    strength_level = 'weak'
    if strength >= 75:
        strength_level = 'strong'
    elif strength >= 50:
        strength_level = 'medium'
    
    return Response({
        'valid': len(errors) == 0,
        'strength': strength,
        'strength_level': strength_level,
        'errors': errors
    })
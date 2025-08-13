from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import User, EmailVerificationToken, PhoneVerificationCode, IdentityVerification
from .services import EmailService, SMSService, IdentityVerificationService
from .serializers import UserSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_email_verification(request):
    """Send or resend email verification link"""
    user = request.user
    
    # Check if already verified
    if user.is_email_verified:
        return Response({
            'message': 'Email is already verified'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check for recent verification emails (rate limiting)
    recent_token = EmailVerificationToken.objects.filter(
        user=user,
        created_at__gte=timezone.now() - timezone.timedelta(minutes=5)
    ).first()
    
    if recent_token and not recent_token.is_used:
        return Response({
            'message': 'Verification email recently sent. Please check your inbox or wait a few minutes before requesting again.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Create and send verification token
    token = EmailService.create_verification_token(user)
    email_sent = EmailService.send_verification_email(user, token)
    
    if email_sent:
        return Response({
            'message': 'Verification email sent successfully',
            'email': user.email
        })
    else:
        return Response({
            'message': 'Failed to send verification email. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """Verify email using token from email link"""
    token = request.data.get('token')
    
    if not token:
        return Response({
            'error': 'Token is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    success, message = EmailService.verify_email_token(token)
    
    if success:
        # Get the user for the response
        token_obj = EmailVerificationToken.objects.get(token=token)
        user_serializer = UserSerializer(token_obj.user)
        
        return Response({
            'success': True,
            'message': message,
            'user': user_serializer.data
        })
    else:
        return Response({
            'success': False,
            'error': message
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_phone_verification(request):
    """Send SMS verification code"""
    user = request.user
    phone_number = request.data.get('phone_number')
    
    if not phone_number:
        return Response({
            'error': 'Phone number is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Basic phone validation
    if not phone_number.startswith('+'):
        phone_number = f'+353{phone_number[1:] if phone_number.startswith("0") else phone_number}'
    
    # Check if already verified
    if user.is_phone_verified and user.phone_number == phone_number:
        return Response({
            'message': 'Phone number is already verified'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check for recent codes (rate limiting)
    recent_code = PhoneVerificationCode.objects.filter(
        user=user,
        created_at__gte=timezone.now() - timezone.timedelta(minutes=2)
    ).first()
    
    if recent_code and not recent_code.is_used:
        return Response({
            'message': 'Verification code recently sent. Please wait before requesting a new code.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Create and send verification code
    code = SMSService.create_verification_code(user, phone_number)
    sms_sent = SMSService.send_verification_sms(phone_number, code)
    
    if sms_sent:
        return Response({
            'message': 'Verification code sent successfully',
            'phone_number': phone_number,
            'expires_in_seconds': 600  # 10 minutes
        })
    else:
        return Response({
            'message': 'Failed to send verification code. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_phone(request):
    """Verify phone number using SMS code"""
    user = request.user
    code = request.data.get('code')
    
    if not code:
        return Response({
            'error': 'Verification code is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    success, message = SMSService.verify_phone_code(user, code)
    
    if success:
        user_serializer = UserSerializer(user)
        return Response({
            'success': True,
            'message': message,
            'user': user_serializer.data
        })
    else:
        return Response({
            'success': False,
            'error': message
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_identity_verification(request):
    """Initiate identity verification process"""
    user = request.user
    verification_type = request.data.get('verification_type', 'document')
    
    # Check for existing pending verification
    existing = IdentityVerification.objects.filter(
        user=user,
        verification_type=verification_type,
        status__in=['pending', 'processing']
    ).first()
    
    if existing:
        return Response({
            'message': 'Verification already in progress',
            'verification_id': existing.id,
            'status': existing.status
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if already verified
    verified = IdentityVerification.objects.filter(
        user=user,
        verification_type=verification_type,
        status='verified'
    ).first()
    
    if verified:
        return Response({
            'message': 'Already verified',
            'verification_id': verified.id,
            'verified_at': verified.verified_at
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create verification record
    verification = IdentityVerificationService.create_verification_record(
        user=user,
        verification_type=verification_type
    )
    
    # TODO: Integrate with Stripe Identity or other provider
    # For now, return placeholder response
    return Response({
        'message': 'Identity verification initiated',
        'verification_id': verification.id,
        'verification_url': f'/verify-identity/{verification.id}',
        'provider': verification.provider
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verification_status(request):
    """Get user's verification status"""
    user = request.user
    
    # Get latest identity verifications
    identity_verifications = IdentityVerification.objects.filter(
        user=user
    ).values('verification_type', 'status', 'verified_at', 'created_at')
    
    # Get recent email tokens
    email_tokens = EmailVerificationToken.objects.filter(
        user=user
    ).order_by('-created_at')[:1].values('created_at', 'is_used', 'expires_at')
    
    # Get recent phone codes
    phone_codes = PhoneVerificationCode.objects.filter(
        user=user
    ).order_by('-created_at')[:1].values('created_at', 'is_used', 'expires_at')
    
    verification_level = 'none'
    if user.is_email_verified:
        verification_level = 'email'
        if user.is_phone_verified:
            verification_level = 'phone'
            if identity_verifications.filter(status='verified').exists():
                verification_level = 'identity'
    
    return Response({
        'email_verified': user.is_email_verified,
        'phone_verified': user.is_phone_verified,
        'identity_verifications': list(identity_verifications),
        'verification_level': verification_level,
        'recent_email_token': list(email_tokens)[0] if email_tokens else None,
        'recent_phone_code': list(phone_codes)[0] if phone_codes else None
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def webhook_stripe_identity(request):
    """Webhook endpoint for Stripe Identity verification updates"""
    # TODO: Implement Stripe webhook verification and processing
    # This would handle verification session completion
    pass


@api_view(['POST'])
@permission_classes([AllowAny])
def webhook_twilio_verify(request):
    """Webhook endpoint for Twilio Verify status updates"""
    # TODO: Implement Twilio webhook processing
    pass
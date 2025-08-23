"""
API views for identity verification
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.conf import settings
from datetime import timedelta
import json
import stripe

from .models import User, IdentityVerification
from .stripe_config import (
    create_verification_session,
    retrieve_verification_session,
    cancel_verification_session,
    STRIPE_IDENTITY_CONFIG
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_identity_verification_session(request):
    """
    Create a new Stripe Identity verification session for the authenticated user
    """
    user = request.user
    
    # Check if Stripe Identity is enabled
    if not STRIPE_IDENTITY_CONFIG['enabled']:
        return Response(
            {'error': 'Identity verification is not currently available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    # Check if user already has a pending verification
    # First clean up old verifications without Stripe sessions
    old_verifications = IdentityVerification.objects.filter(
        user=user,
        status__in=['pending', 'processing', 'requires_input'],
        stripe_verification_session_id__isnull=True
    )
    if old_verifications.exists():
        old_verifications.update(status='expired', failure_reason='Legacy verification without Stripe session')
    
    # Now check for pending verifications with Stripe sessions
    pending_verification = IdentityVerification.objects.filter(
        user=user,
        status__in=['pending', 'processing', 'requires_input'],
        verification_type='full',
        stripe_verification_session_id__isnull=False
    ).first()
    
    if pending_verification and pending_verification.stripe_verification_session_id:
        # Check if verification is older than 60 minutes (extended timeout)
        time_since_creation = timezone.now() - pending_verification.created_at
        if time_since_creation > timedelta(minutes=60):
            # Mark old verification as expired and allow new one
            pending_verification.status = 'expired'
            pending_verification.failure_reason = 'Session expired after 60 minutes'
            pending_verification.save()
        else:
            # Try to retrieve the existing session
            try:
                existing_session = retrieve_verification_session(
                    pending_verification.stripe_verification_session_id
                )
                if existing_session and existing_session.status in ['requires_input', 'processing']:
                    return Response({
                        'session_id': existing_session.id,
                        'client_secret': existing_session.client_secret,
                        'status': existing_session.status,
                        'existing': True
                    })
                elif existing_session and existing_session.status in ['verified', 'canceled']:
                    # Update our records if Stripe status changed
                    pending_verification.status = existing_session.status
                    pending_verification.save()
                else:
                    # Session is invalid or expired, mark as expired
                    pending_verification.status = 'expired'
                    pending_verification.failure_reason = 'Stripe session invalid or expired'
                    pending_verification.save()
            except Exception as e:
                # If we can't retrieve the session, mark it as expired
                pending_verification.status = 'expired'
                pending_verification.failure_reason = f'Could not retrieve session: {str(e)}'
                pending_verification.save()
    
    # Get return URLs from request or use defaults
    return_url = request.data.get('return_url')
    refresh_url = request.data.get('refresh_url')
    
    # Create new Stripe verification session
    session = create_verification_session(user, return_url, refresh_url)
    
    if not session:
        return Response(
            {'error': 'Failed to create verification session'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Create or update IdentityVerification record
    verification = IdentityVerification.objects.create(
        user=user,
        verification_type='full',
        status='pending',
        provider='stripe',
        stripe_verification_session_id=session.id,
        provider_session_id=session.id,
        verification_data={
            'session_created': timezone.now().isoformat(),
            'session_type': session.type,
        }
    )
    
    return Response({
        'session_id': session.id,
        'client_secret': session.client_secret,
        'status': session.status,
        'verification_id': verification.id,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_verification_status(request):
    """
    Get the current verification status for the authenticated user
    """
    user = request.user
    
    # First, clean up any orphaned verifications without Stripe sessions
    IdentityVerification.objects.filter(
        user=user,
        status__in=['pending', 'processing', 'requires_input'],
        stripe_verification_session_id__isnull=True
    ).update(status='expired', failure_reason='Orphaned verification without Stripe session')
    
    # Get latest verification attempt (only those with Stripe sessions)
    latest_verification = IdentityVerification.objects.filter(
        user=user,
        verification_type='full',
        stripe_verification_session_id__isnull=False
    ).first()
    
    # If no Stripe verifications, check for legacy ones
    if not latest_verification:
        latest_verification = IdentityVerification.objects.filter(
            user=user,
            verification_type='full'
        ).first()
    
    verification_data = {
        'email_verified': user.is_email_verified,
        'phone_verified': user.is_phone_verified,
        'identity_verified': user.identity_verified,
        'verification_level': user.verification_level,
        'trust_score': user.trust_score,
        'latest_identity_verification': None,
        'can_verify': True,
        'benefits': STRIPE_IDENTITY_CONFIG['benefits'].get(user.verification_level, {}),
    }
    
    if latest_verification:
        verification_data['latest_identity_verification'] = {
            'id': latest_verification.id,
            'status': latest_verification.status,
            'created_at': latest_verification.created_at,
            'verified_at': latest_verification.verified_at,
            'expires_at': latest_verification.expires_at,
            'failure_reason': latest_verification.failure_reason,
            'is_valid': latest_verification.is_valid,
        }
        
        # Check if we can create a new verification
        if latest_verification.status in ['pending', 'processing', 'requires_input']:
            # Check if verification is older than 60 minutes (extended timeout)
            time_since_creation = timezone.now() - latest_verification.created_at
            if time_since_creation > timedelta(minutes=60):
                # Mark as expired and allow new verification
                latest_verification.status = 'expired'
                latest_verification.failure_reason = 'Session expired after 60 minutes'
                latest_verification.save()
                verification_data['can_verify'] = True
                verification_data['latest_identity_verification']['status'] = 'expired'
                verification_data['latest_identity_verification']['failure_reason'] = 'Session expired after 60 minutes'
            else:
                verification_data['can_verify'] = False
                # Add time remaining info
                time_remaining = timedelta(minutes=60) - time_since_creation
                verification_data['time_until_expiry'] = int(time_remaining.total_seconds())
    
    return Response(verification_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_verification_benefits(request):
    """
    Get the benefits of each verification level
    """
    return Response({
        'current_level': request.user.verification_level,
        'current_trust_score': request.user.trust_score,
        'levels': {
            'basic': {
                'requirements': 'Email verification',
                'trust_score': 40,
                'benefits': [
                    'Basic messaging capabilities',
                    'Save favorite properties',
                    'Email notifications',
                ],
            },
            'standard': {
                'requirements': 'Email + Phone verification',
                'trust_score': 70,
                'benefits': [
                    'All Basic benefits',
                    'Extended messaging limits',
                    'Priority in search results',
                    'SMS notifications',
                    'Phone-verified badge',
                ],
            },
            'premium': {
                'requirements': 'Email + Phone + Identity verification',
                'trust_score': 100,
                'benefits': [
                    'All Standard benefits',
                    'Fully Verified badge',
                    'Unlimited messaging',
                    'Priority customer support',
                    'Advanced analytics',
                    'Featured property listings',
                    'Verified filter in search',
                ],
            },
        },
    })


@csrf_exempt
@api_view(['POST', 'OPTIONS'])  # Add OPTIONS for CORS preflight
def stripe_identity_webhook(request):
    """
    Handle Stripe Identity webhook events
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return Response(status=status.HTTP_200_OK)
    
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = STRIPE_IDENTITY_CONFIG['webhook_secret']
    
    # Allow test requests without signature in development
    if not sig_header and settings.DEBUG:
        return JsonResponse({'error': 'Test mode: webhook signature required', 'test': True}, status=400)
    
    if not webhook_secret:
        return JsonResponse({'error': 'Webhook not configured'}, status=400)
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        # Invalid payload
        return JsonResponse({'error': 'Invalid payload'}, status=400)
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return JsonResponse({'error': 'Invalid signature'}, status=400)
    
    # Handle the event
    if event['type'] == 'identity.verification_session.verified':
        session = event['data']['object']
        handle_verification_succeeded(session)
    
    elif event['type'] == 'identity.verification_session.requires_input':
        session = event['data']['object']
        handle_verification_requires_input(session)
    
    elif event['type'] == 'identity.verification_session.failed':
        session = event['data']['object']
        handle_verification_failed(session)
    
    elif event['type'] == 'identity.verification_session.canceled':
        session = event['data']['object']
        handle_verification_canceled(session)
    
    elif event['type'] == 'identity.verification_session.processing':
        session = event['data']['object']
        handle_verification_processing(session)
    
    return JsonResponse({'status': 'success'})


def handle_verification_succeeded(session):
    """
    Handle successful verification
    """
    try:
        # Find the verification record
        verification = IdentityVerification.objects.filter(
            stripe_verification_session_id=session['id']
        ).first()
        
        if not verification:
            print(f"Verification record not found for session {session['id']}")
            return
        
        # Update verification record
        verification.status = 'verified'
        verification.verified_at = timezone.now()
        verification.stripe_verification_report_id = session.get('last_verification_report')
        
        # Store verification data
        verification.verification_data = {
            **verification.verification_data,
            'verified_at': timezone.now().isoformat(),
            'verification_report': session.get('last_verification_report'),
            'provided_details': session.get('provided_details', {}),
            'verified_outputs': session.get('verified_outputs', {}),
        }
        
        # Extract document info if available
        if 'verified_outputs' in session:
            outputs = session['verified_outputs']
            if 'document' in outputs:
                doc = outputs['document']
                verification.document_type = doc.get('type')
                verification.document_country = doc.get('issuing_country')
        
        verification.save()
        
        # Update user's identity verification status
        user = verification.user
        user.identity_verified = True
        user.save()
        
        # Update overall verification level
        user.update_verification_level()
        
        # TODO: Send congratulations email
        
    except Exception as e:
        print(f"Error handling verification success: {e}")


def handle_verification_failed(session):
    """
    Handle failed verification
    """
    try:
        verification = IdentityVerification.objects.filter(
            stripe_verification_session_id=session['id']
        ).first()
        
        if not verification:
            return
        
        verification.status = 'failed'
        verification.failure_reason = session.get('last_error', {}).get('reason', 'Unknown error')
        verification.verification_data = {
            **verification.verification_data,
            'failed_at': timezone.now().isoformat(),
            'last_error': session.get('last_error', {}),
        }
        verification.save()
        
        # TODO: Send failure notification email with next steps
        
    except Exception as e:
        print(f"Error handling verification failure: {e}")


def handle_verification_requires_input(session):
    """
    Handle verification requiring more input
    """
    try:
        verification = IdentityVerification.objects.filter(
            stripe_verification_session_id=session['id']
        ).first()
        
        if not verification:
            return
        
        verification.status = 'requires_input'
        verification.verification_data = {
            **verification.verification_data,
            'requires_input_at': timezone.now().isoformat(),
        }
        verification.save()
        
    except Exception as e:
        print(f"Error handling verification requires input: {e}")


def handle_verification_canceled(session):
    """
    Handle canceled verification
    """
    try:
        verification = IdentityVerification.objects.filter(
            stripe_verification_session_id=session['id']
        ).first()
        
        if not verification:
            return
        
        verification.status = 'canceled'
        verification.verification_data = {
            **verification.verification_data,
            'canceled_at': timezone.now().isoformat(),
        }
        verification.save()
        
    except Exception as e:
        print(f"Error handling verification cancellation: {e}")


def handle_verification_processing(session):
    """
    Handle verification in processing state
    """
    try:
        verification = IdentityVerification.objects.filter(
            stripe_verification_session_id=session['id']
        ).first()
        
        if not verification:
            return
        
        verification.status = 'processing'
        verification.verification_data = {
            **verification.verification_data,
            'processing_started_at': timezone.now().isoformat(),
        }
        verification.save()
        
    except Exception as e:
        print(f"Error handling verification processing: {e}")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_verification(request, verification_id):
    """
    Cancel a pending verification session
    """
    user = request.user
    
    try:
        verification = IdentityVerification.objects.get(
            id=verification_id,
            user=user,
            status__in=['pending', 'processing', 'requires_input']
        )
    except IdentityVerification.DoesNotExist:
        return Response(
            {'error': 'Verification not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Cancel the Stripe session
    if verification.stripe_verification_session_id:
        canceled_session = cancel_verification_session(
            verification.stripe_verification_session_id
        )
        
        if canceled_session:
            verification.status = 'canceled'
            verification.save()
            
            return Response({
                'message': 'Verification session canceled',
                'verification_id': verification.id,
            })
    
    return Response(
        {'error': 'Failed to cancel verification'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_session_health(request):
    """
    Check the health of the current verification session
    """
    user = request.user
    
    # Get the latest verification session
    latest_verification = IdentityVerification.objects.filter(
        user=user,
        verification_type='full',
        stripe_verification_session_id__isnull=False
    ).first()
    
    if not latest_verification:
        return Response({
            'healthy': True,
            'message': 'No active verification session',
            'can_start_new': True
        })
    
    # Check if session is stuck
    if latest_verification.status in ['pending', 'processing', 'requires_input']:
        time_since_creation = timezone.now() - latest_verification.created_at
        
        if time_since_creation > timedelta(minutes=60):
            # Session is expired
            return Response({
                'healthy': False,
                'message': 'Session expired',
                'can_start_new': True,
                'action_required': 'reset',
                'session_age_minutes': int(time_since_creation.total_seconds() / 60)
            })
        elif time_since_creation > timedelta(minutes=45):
            # Session is about to expire
            time_remaining = timedelta(minutes=60) - time_since_creation
            return Response({
                'healthy': 'warning',
                'message': f'Session expires in {int(time_remaining.total_seconds() / 60)} minutes',
                'can_start_new': False,
                'action_required': 'complete_soon',
                'session_age_minutes': int(time_since_creation.total_seconds() / 60),
                'time_remaining_seconds': int(time_remaining.total_seconds())
            })
        else:
            # Session is healthy
            time_remaining = timedelta(minutes=60) - time_since_creation
            return Response({
                'healthy': True,
                'message': 'Session active',
                'can_start_new': False,
                'session_age_minutes': int(time_since_creation.total_seconds() / 60),
                'time_remaining_seconds': int(time_remaining.total_seconds())
            })
    
    # Session is in final state
    return Response({
        'healthy': True,
        'message': f'Session {latest_verification.status}',
        'can_start_new': latest_verification.status in ['verified', 'failed', 'canceled', 'expired']
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_verification(request):
    """
    Reset stuck verification sessions for the authenticated user.
    This is useful when a verification gets stuck in a pending state.
    """
    user = request.user
    
    # Find and reset all stuck verifications (including legacy ones)
    stuck_verifications = IdentityVerification.objects.filter(
        user=user,
        status__in=['pending', 'processing', 'requires_input']
    )
    
    reset_count = 0
    for verification in stuck_verifications:
        # Try to cancel the Stripe session if it exists
        if verification.stripe_verification_session_id:
            try:
                cancel_verification_session(verification.stripe_verification_session_id)
            except Exception as e:
                print(f"Could not cancel Stripe session: {e}")
        
        # Mark verification as canceled/expired
        verification.status = 'canceled'
        verification.failure_reason = 'Reset by user'
        verification.save()
        reset_count += 1
    
    return Response({
        'message': f'Reset {reset_count} stuck verification(s)',
        'can_verify': True,
    })
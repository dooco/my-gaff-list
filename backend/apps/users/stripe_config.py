"""
Stripe configuration for identity verification
"""

import stripe
from django.conf import settings
from decouple import config

# Initialize Stripe with API key
stripe.api_key = config('STRIPE_SECRET_KEY', default='')

# Stripe Identity configuration
STRIPE_IDENTITY_CONFIG = {
    'enabled': config('STRIPE_IDENTITY_ENABLED', default=False, cast=bool),
    'test_mode': config('STRIPE_TEST_MODE', default=True, cast=bool),
    'webhook_secret': config('STRIPE_WEBHOOK_SECRET', default=''),
    
    # Verification session options
    'session_options': {
        'type': 'identity.verification_session',
        'options': {
            'document': {
                'require_matching_selfie': True,
                'require_live_capture': True,
                'allowed_types': ['passport', 'driving_license', 'id_card'],
            },
            'selfie': {
                'require_live_capture': True,
            },
            'address': {
                'require_address': False,  # Optional for now
            },
        },
    },
    
    # Verification requirements by user type
    'requirements': {
        'landlord': {
            'required': False,  # Not required, but encouraged
            'prompt_after_days': 7,  # Prompt after 7 days
            'reminder_frequency_days': 30,  # Remind every 30 days
        },
        'agent': {
            'required': False,  # Not required, but encouraged
            'prompt_after_days': 3,  # Prompt after 3 days
            'reminder_frequency_days': 14,  # Remind every 14 days
        },
        'renter': {
            'required': False,  # Optional for renters
            'prompt_after_days': 30,  # Prompt after 30 days
            'reminder_frequency_days': 60,  # Remind every 60 days
        },
    },
    
    # Benefits for verified users
    'benefits': {
        'basic': {
            'trust_score': 40,
            'badge': 'email-verified',
            'features': ['basic_messaging', 'save_properties'],
        },
        'standard': {
            'trust_score': 70,
            'badge': 'phone-verified',
            'features': ['extended_messaging', 'priority_search'],
        },
        'premium': {
            'trust_score': 100,
            'badge': 'fully-verified',
            'features': ['unlimited_messaging', 'priority_support', 'analytics', 'featured_listings'],
        },
    },
}


def create_verification_session(user, return_url=None, refresh_url=None):
    """
    Create a Stripe Identity verification session for a user
    """
    if not STRIPE_IDENTITY_CONFIG['enabled']:
        return None
    
    try:
        # Create metadata for the session
        metadata = {
            'user_id': str(user.id),
            'user_email': user.email,
            'user_type': user.user_type,
        }
        
        # Default URLs if not provided
        if not return_url:
            return_url = f"{settings.FRONTEND_URL}/verification/complete"
        if not refresh_url:
            refresh_url = f"{settings.FRONTEND_URL}/verification"
        
        # Create the verification session
        session = stripe.identity.VerificationSession.create(
            type='document',
            metadata=metadata,
            return_url=return_url,
            refresh_url=refresh_url,
            options={
                'document': {
                    'require_matching_selfie': True,
                    'require_live_capture': True,
                    'allowed_types': ['driving_license', 'passport', 'id_card'],
                },
            },
        )
        
        return session
    except stripe.error.StripeError as e:
        # Log the error
        print(f"Stripe error creating verification session: {e}")
        return None


def retrieve_verification_session(session_id):
    """
    Retrieve a verification session from Stripe
    """
    if not STRIPE_IDENTITY_CONFIG['enabled']:
        return None
    
    try:
        session = stripe.identity.VerificationSession.retrieve(session_id)
        return session
    except stripe.error.StripeError as e:
        print(f"Stripe error retrieving verification session: {e}")
        return None


def cancel_verification_session(session_id):
    """
    Cancel a verification session
    """
    if not STRIPE_IDENTITY_CONFIG['enabled']:
        return None
    
    try:
        # First retrieve the session to check its status
        session = stripe.identity.VerificationSession.retrieve(session_id)
        
        # Only cancel if the session is in a cancellable state
        if session.status in ['requires_input', 'processing']:
            canceled_session = stripe.identity.VerificationSession.cancel(session_id)
            return canceled_session
        else:
            # Session is in a final state (verified, canceled, failed)
            # Return the session as-is since it's already in a terminal state
            print(f"Session {session_id} is already in terminal state: {session.status}")
            return session
    except stripe.error.StripeError as e:
        print(f"Stripe error canceling verification session: {e}")
        # Check if it's a specific error about session not being cancellable
        if 'cannot cancel' in str(e).lower():
            # Try to retrieve the session to get its current status
            try:
                session = stripe.identity.VerificationSession.retrieve(session_id)
                return session
            except:
                pass
        return None


def redact_verification_session(session_id):
    """
    Redact (permanently delete) verification session data for GDPR compliance
    """
    if not STRIPE_IDENTITY_CONFIG['enabled']:
        return None
    
    try:
        session = stripe.identity.VerificationSession.redact(session_id)
        return session
    except stripe.error.StripeError as e:
        print(f"Stripe error redacting verification session: {e}")
        return None


def get_verification_report(report_id):
    """
    Retrieve a verification report
    """
    if not STRIPE_IDENTITY_CONFIG['enabled']:
        return None
    
    try:
        report = stripe.identity.VerificationReport.retrieve(report_id)
        return report
    except stripe.error.StripeError as e:
        print(f"Stripe error retrieving verification report: {e}")
        return None
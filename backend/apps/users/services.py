import secrets
import string
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import send_mail
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from twilio.rest import Client
import random

from .models import EmailVerificationToken, PhoneVerificationCode, IdentityVerification


class EmailService:
    """Service for handling email verification and notifications"""
    
    @staticmethod
    def generate_verification_token():
        """Generate a secure random token for email verification"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def create_verification_token(user):
        """Create a new email verification token for a user"""
        # Invalidate any existing unused tokens
        EmailVerificationToken.objects.filter(
            user=user,
            is_used=False
        ).update(is_used=True)
        
        # Create new token
        token = EmailVerificationToken.objects.create(
            user=user,
            token=EmailService.generate_verification_token(),
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        return token
    
    @staticmethod
    def send_verification_email(user, token):
        """Send email verification link to user"""
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
        
        # For now, skip SendGrid Web API and use Django's backend directly
        # which will use SMTP with SendGrid
        return EmailService._send_with_django(
            to_email=user.email,
            subject="Verify your Rentified email",
            html_content=EmailService._get_verification_email_html(user, verification_url)
        )
    
    @staticmethod
    def _get_verification_email_html(user, verification_url):
        """Generate HTML content for verification email"""
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px;">
                <h1 style="color: #333; margin-bottom: 20px;">Verify Your Email</h1>
                
                <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    Hi {user.first_name or 'there'},
                </p>
                
                <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    Welcome to Rentified! Please verify your email address to complete your registration
                    and unlock all features of your account.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" 
                       style="background-color: #3b82f6; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;
                              font-weight: bold; font-size: 16px;">
                        Verify Email Address
                    </a>
                </div>
                
                <p style="color: #999; font-size: 14px; line-height: 1.5;">
                    Or copy and paste this link into your browser:<br>
                    <span style="color: #3b82f6; word-break: break-all;">{verification_url}</span>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; line-height: 1.5;">
                    This link will expire in 24 hours. If you didn't create an account with Rentified,
                    you can safely ignore this email.
                </p>
            </div>
        </div>
        """
        return html_content
    
    @staticmethod
    def _send_with_sendgrid(to_email, subject, html_content):
        """Send email using SendGrid API"""
        try:
            message = Mail(
                from_email=settings.DEFAULT_FROM_EMAIL,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)
            return response.status_code == 202
        except Exception as e:
            print(f"SendGrid error: {e}")
            return False
    
    @staticmethod
    def _send_with_django(to_email, subject, html_content):
        """Send email using Django's email backend"""
        try:
            send_mail(
                subject=subject,
                message="",  # Plain text version
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=False
            )
            return True
        except Exception as e:
            print(f"Email error: {e}")
            return False
    
    @staticmethod
    def verify_email_token(token_string):
        """Verify an email token and mark user as verified"""
        try:
            token = EmailVerificationToken.objects.get(
                token=token_string,
                is_used=False
            )
            
            if token.is_expired:
                return False, "Token has expired"
            
            # Mark token as used
            token.is_used = True
            token.used_at = timezone.now()
            token.save()
            
            # Mark user as email verified
            user = token.user
            user.is_email_verified = True
            user.save()
            
            return True, "Email verified successfully"
            
        except EmailVerificationToken.DoesNotExist:
            return False, "Invalid token"


class SMSService:
    """Service for handling SMS/phone verification using Twilio Verify API"""
    
    @staticmethod
    def send_verification_sms(phone_number, user=None):
        """Send SMS verification code using Twilio Verify API"""
        if not hasattr(settings, 'TWILIO_ACCOUNT_SID') or not settings.TWILIO_ACCOUNT_SID:
            print(f"[DEV] SMS verification would be sent to {phone_number}")
            return True
        
        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            # Use Twilio Verify API to send verification
            verification = client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID) \
                .verifications \
                .create(
                    to=phone_number,
                    channel='sms'
                )
            
            # Store phone verification attempt in database for tracking
            if user:
                # Invalidate any existing codes for this user
                PhoneVerificationCode.objects.filter(
                    user=user,
                    is_used=False
                ).update(is_used=True)
                
                # Create a record for tracking (but Twilio handles the actual code)
                PhoneVerificationCode.objects.create(
                    user=user,
                    phone_number=phone_number,
                    code='TWILIO',  # Placeholder since Twilio manages the code
                    expires_at=timezone.now() + timedelta(minutes=10)
                )
            
            return verification.status == 'pending'
        except Exception as e:
            print(f"Twilio Verify error: {e}")
            return False
    
    @staticmethod
    def verify_phone_code(user, code_string, phone_number):
        """Verify a phone verification code using Twilio Verify API"""
        if not hasattr(settings, 'TWILIO_ACCOUNT_SID') or not settings.TWILIO_ACCOUNT_SID:
            print(f"[DEV] Would verify code {code_string} for {phone_number}")
            # In dev mode, accept any 6-digit code
            if len(code_string) == 6 and code_string.isdigit():
                user.is_phone_verified = True
                user.phone_number = phone_number
                user.save()
                return True, "Phone number verified successfully (dev mode)"
            return False, "Invalid code (dev mode)"
        
        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            # Use Twilio Verify API to check the code
            verification_check = client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID) \
                .verification_checks \
                .create(
                    to=phone_number,
                    code=code_string
                )
            
            if verification_check.status == 'approved':
                # Mark the database record as used
                code_record = PhoneVerificationCode.objects.filter(
                    user=user,
                    phone_number=phone_number,
                    is_used=False
                ).order_by('-created_at').first()
                
                if code_record:
                    code_record.is_used = True
                    code_record.used_at = timezone.now()
                    code_record.save()
                
                # Mark user's phone as verified
                user.is_phone_verified = True
                user.phone_number = phone_number
                user.save()
                
                return True, "Phone number verified successfully"
            else:
                return False, f"Verification failed: {verification_check.status}"
            
        except Exception as e:
            error_msg = str(e)
            if 'max check attempts reached' in error_msg.lower():
                return False, "Too many attempts. Please request a new code."
            elif 'expired' in error_msg.lower():
                return False, "Code has expired. Please request a new code."
            else:
                print(f"Twilio Verify error: {e}")
                return False, "Invalid verification code"


class IdentityVerificationService:
    """Service for handling identity verification with third-party providers"""
    
    @staticmethod
    def create_stripe_verification_session(user):
        """Create a Stripe Identity verification session"""
        # This would integrate with Stripe Identity API
        # Placeholder for now - requires Stripe account setup
        pass
    
    @staticmethod
    def create_verification_record(user, verification_type, provider='stripe'):
        """Create an identity verification record"""
        verification = IdentityVerification.objects.create(
            user=user,
            verification_type=verification_type,
            provider=provider,
            status='pending'
        )
        return verification
    
    @staticmethod
    def update_verification_status(verification_id, status, data=None):
        """Update verification status based on webhook data"""
        try:
            verification = IdentityVerification.objects.get(id=verification_id)
            verification.status = status
            
            if data:
                verification.verification_data = data
            
            if status == 'verified':
                verification.verified_at = timezone.now()
            
            verification.save()
            return verification
        except IdentityVerification.DoesNotExist:
            return None
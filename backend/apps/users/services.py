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
    """Service for handling SMS/phone verification"""
    
    @staticmethod
    def generate_verification_code():
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=6))
    
    @staticmethod
    def create_verification_code(user, phone_number):
        """Create a new phone verification code"""
        # Invalidate existing unused codes
        PhoneVerificationCode.objects.filter(
            user=user,
            is_used=False
        ).update(is_used=True)
        
        # Create new code
        code = PhoneVerificationCode.objects.create(
            user=user,
            phone_number=phone_number,
            code=SMSService.generate_verification_code(),
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        return code
    
    @staticmethod
    def send_verification_sms(phone_number, code):
        """Send SMS verification code using Twilio"""
        if not hasattr(settings, 'TWILIO_ACCOUNT_SID') or not settings.TWILIO_ACCOUNT_SID:
            print(f"[DEV] SMS verification code for {phone_number}: {code.code}")
            return True
        
        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            message = client.messages.create(
                body=f"Your MyGaffList verification code is: {code.code}. This code expires in 10 minutes.",
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone_number
            )
            
            return message.sid is not None
        except Exception as e:
            print(f"Twilio error: {e}")
            return False
    
    @staticmethod
    def verify_phone_code(user, code_string):
        """Verify a phone verification code"""
        try:
            code = PhoneVerificationCode.objects.filter(
                user=user,
                code=code_string,
                is_used=False
            ).order_by('-created_at').first()
            
            if not code:
                return False, "Invalid code"
            
            # Increment attempts
            code.attempts += 1
            code.save()
            
            if code.attempts >= 3:
                code.is_used = True
                code.save()
                return False, "Too many attempts. Please request a new code."
            
            if code.is_expired:
                return False, "Code has expired"
            
            # Mark code as used
            code.is_used = True
            code.used_at = timezone.now()
            code.save()
            
            # Mark user's phone as verified
            user.is_phone_verified = True
            user.phone_number = code.phone_number
            user.save()
            
            return True, "Phone number verified successfully"
            
        except Exception as e:
            return False, str(e)


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
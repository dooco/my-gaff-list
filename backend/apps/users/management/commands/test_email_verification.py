from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from apps.users.models import User, EmailVerificationToken
from apps.users.services import EmailService
import sys


class Command(BaseCommand):
    help = 'Test email verification functionality with SendGrid'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address to test with (must be an existing user)',
        )
        parser.add_argument(
            '--create-user',
            action='store_true',
            help='Create a test user if it doesn\'t exist',
        )
        parser.add_argument(
            '--force-send',
            action='store_true',
            help='Force send even if using console backend',
        )

    def handle(self, *args, **options):
        email = options.get('email') or 'test@example.com'
        create_user = options.get('create_user', False)
        force_send = options.get('force_send', False)
        
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS('EMAIL VERIFICATION TEST'))
        self.stdout.write("=" * 60)
        
        # Check configuration
        self.stdout.write("\n📋 Configuration Check:")
        self.stdout.write(f"  Email Backend: {settings.EMAIL_BACKEND}")
        self.stdout.write(f"  SendGrid API Key: {'✅ SET' if settings.SENDGRID_API_KEY else '❌ NOT SET'}")
        self.stdout.write(f"  Default From Email: {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(f"  Frontend URL: {settings.FRONTEND_URL}")
        
        if not settings.SENDGRID_API_KEY:
            self.stdout.write(self.style.WARNING("\n⚠️  SendGrid API key not configured!"))
            self.stdout.write("Please add SENDGRID_API_KEY to your .env file")
            if not force_send:
                if 'console' not in settings.EMAIL_BACKEND.lower():
                    self.stdout.write(self.style.ERROR("Exiting. Use --force-send to continue anyway."))
                    return
        
        # Get or create user
        self.stdout.write(f"\n👤 Looking for user: {email}")
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"  Found existing user: {user.get_full_name() or user.username}")
            self.stdout.write(f"  Email verified: {'✅ Yes' if user.is_email_verified else '❌ No'}")
        except User.DoesNotExist:
            if create_user:
                self.stdout.write("  Creating test user...")
                user = User.objects.create_user(
                    email=email,
                    username=email.split('@')[0],
                    password='testpass123',
                    first_name='Test',
                    last_name='User'
                )
                self.stdout.write(self.style.SUCCESS(f"  ✅ Created user: {email}"))
            else:
                self.stdout.write(self.style.ERROR(f"  ❌ User not found: {email}"))
                self.stdout.write("  Use --create-user flag to create a test user")
                return
        
        # Check if already verified
        if user.is_email_verified:
            self.stdout.write(self.style.WARNING("\n⚠️  User email is already verified"))
            self.stdout.write("  Resetting verification status for testing...")
            user.is_email_verified = False
            user.save()
            self.stdout.write("  ✅ Reset verification status")
        
        # Check for recent tokens
        self.stdout.write("\n🎫 Checking existing tokens...")
        recent_tokens = EmailVerificationToken.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timezone.timedelta(hours=24)
        ).order_by('-created_at')
        
        if recent_tokens.exists():
            self.stdout.write(f"  Found {recent_tokens.count()} recent token(s)")
            for token in recent_tokens[:3]:
                status = '✅ Used' if token.is_used else ('⏰ Expired' if token.is_expired else '🔵 Valid')
                self.stdout.write(f"    - {token.token[:20]}... [{status}]")
        
        # Create new verification token
        self.stdout.write("\n🔑 Creating verification token...")
        token = EmailService.create_verification_token(user)
        self.stdout.write(f"  Token: {token.token}")
        self.stdout.write(f"  Expires: {token.expires_at}")
        
        # Generate verification URL
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
        self.stdout.write(f"\n🔗 Verification URL:")
        self.stdout.write(self.style.SUCCESS(f"  {verification_url}"))
        
        # Send verification email
        self.stdout.write("\n📧 Sending verification email...")
        self.stdout.write(f"  To: {user.email}")
        self.stdout.write(f"  From: {settings.DEFAULT_FROM_EMAIL}")
        
        try:
            success = EmailService.send_verification_email(user, token)
            
            if success:
                self.stdout.write(self.style.SUCCESS("\n✅ Email sent successfully!"))
                
                if 'console' in settings.EMAIL_BACKEND.lower():
                    self.stdout.write(self.style.WARNING("\n📝 Note: Using console backend - check server output for email content"))
                elif settings.SENDGRID_API_KEY:
                    self.stdout.write(self.style.SUCCESS("\n📬 Check your inbox for the verification email"))
                    self.stdout.write("  Also check SendGrid Activity Feed: https://app.sendgrid.com/email_activity")
                
            else:
                self.stdout.write(self.style.ERROR("\n❌ Failed to send email"))
                self.stdout.write("  Check your SendGrid API key and configuration")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ Error sending email: {str(e)}"))
            import traceback
            self.stdout.write(traceback.format_exc())
        
        # Test verification
        self.stdout.write("\n🧪 Testing token verification...")
        test_success, test_message = EmailService.verify_email_token(token.token)
        
        if test_success:
            self.stdout.write(self.style.SUCCESS(f"  ✅ Token verification works: {test_message}"))
            # Reset for actual testing
            user.is_email_verified = False
            user.save()
            token.is_used = False
            token.save()
            self.stdout.write("  ↩️  Reset verification status for manual testing")
        else:
            self.stdout.write(self.style.ERROR(f"  ❌ Token verification failed: {test_message}"))
        
        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("TEST COMPLETE"))
        self.stdout.write("=" * 60)
        self.stdout.write("\n📝 Next Steps:")
        self.stdout.write("  1. Check your email inbox for the verification email")
        self.stdout.write("  2. Click the verification link or visit the URL above")
        self.stdout.write("  3. Check if user.is_email_verified is now True")
        self.stdout.write("  4. Try logging in and check the verification badge in the UI")
        self.stdout.write("\n💡 To test via API:")
        self.stdout.write(f"  1. Login as {email}")
        self.stdout.write("  2. POST to /api/users/verification/email/send/")
        self.stdout.write("  3. Check email and click verification link")
        self.stdout.write("\n")
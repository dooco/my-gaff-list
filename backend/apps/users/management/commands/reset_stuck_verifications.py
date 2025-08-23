"""
Management command to reset stuck identity verifications
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.users.models import IdentityVerification
from apps.users.stripe_config import cancel_verification_session


class Command(BaseCommand):
    help = 'Reset stuck identity verification sessions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            type=str,
            help='Reset verifications for specific user email'
        )
        parser.add_argument(
            '--older-than-minutes',
            type=int,
            default=30,
            help='Reset verifications older than specified minutes (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be reset without actually resetting'
        )

    def handle(self, *args, **options):
        user_email = options['user_email']
        older_than_minutes = options['older_than_minutes']
        dry_run = options['dry_run']
        
        # Build query for stuck verifications
        query = IdentityVerification.objects.filter(
            status__in=['pending', 'processing', 'requires_input'],
            verification_type='full'
        )
        
        if user_email:
            query = query.filter(user__email=user_email)
        
        # Filter by age
        cutoff_time = timezone.now() - timedelta(minutes=older_than_minutes)
        query = query.filter(created_at__lt=cutoff_time)
        
        stuck_verifications = query.all()
        
        if not stuck_verifications:
            self.stdout.write(self.style.SUCCESS('No stuck verifications found'))
            return
        
        self.stdout.write(f"Found {len(stuck_verifications)} stuck verification(s)")
        
        for verification in stuck_verifications:
            age_minutes = (timezone.now() - verification.created_at).total_seconds() / 60
            self.stdout.write(
                f"  - User: {verification.user.email}, "
                f"Status: {verification.status}, "
                f"Age: {int(age_minutes)} minutes, "
                f"Session ID: {verification.stripe_verification_session_id[:20]}..."
            )
            
            if not dry_run:
                # Try to cancel the Stripe session
                if verification.stripe_verification_session_id:
                    try:
                        cancel_verification_session(verification.stripe_verification_session_id)
                        self.stdout.write(f"    Canceled Stripe session")
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"    Could not cancel Stripe session: {e}"))
                
                # Mark verification as expired
                verification.status = 'expired'
                verification.failure_reason = 'Reset via management command - session expired'
                verification.save()
                self.stdout.write(self.style.SUCCESS(f"    Reset verification"))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN - No changes made'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\nSuccessfully reset {len(stuck_verifications)} verification(s)'))
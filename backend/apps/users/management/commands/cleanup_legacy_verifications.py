"""
Management command to cleanup legacy verification records
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.users.models import IdentityVerification


class Command(BaseCommand):
    help = 'Cleanup legacy verification records without Stripe sessions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cleaned up without actually doing it'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find all legacy verifications without Stripe sessions
        legacy_verifications = IdentityVerification.objects.filter(
            stripe_verification_session_id__isnull=True
        )
        
        # Categorize by status
        pending_legacy = legacy_verifications.filter(
            status__in=['pending', 'processing', 'requires_input']
        )
        other_legacy = legacy_verifications.exclude(
            status__in=['pending', 'processing', 'requires_input']
        )
        
        self.stdout.write(f"\n=== LEGACY VERIFICATIONS FOUND ===")
        self.stdout.write(f"Total legacy records (no Stripe session): {legacy_verifications.count()}")
        self.stdout.write(f"  - Stuck (pending/processing): {pending_legacy.count()}")
        self.stdout.write(f"  - Other statuses: {other_legacy.count()}")
        
        if pending_legacy.exists():
            self.stdout.write(f"\n=== STUCK LEGACY VERIFICATIONS ===")
            for v in pending_legacy[:20]:  # Show first 20
                age = timezone.now() - v.created_at
                age_hours = int(age.total_seconds() / 3600)
                self.stdout.write(
                    f"  ID: {v.id}, User: {v.user.email}, "
                    f"Status: {v.status}, Type: {v.verification_type}, "
                    f"Age: {age_hours} hours"
                )
        
        if not dry_run and pending_legacy.exists():
            # Mark all stuck legacy verifications as expired
            updated = pending_legacy.update(
                status='expired',
                failure_reason='Legacy verification without Stripe session - cleaned up'
            )
            self.stdout.write(
                self.style.SUCCESS(f"\n✅ Cleaned up {updated} stuck legacy verifications")
            )
        
        # Also clean up any verifications with 'document' type (old system)
        document_type = IdentityVerification.objects.filter(
            verification_type='document',
            status__in=['pending', 'processing', 'requires_input']
        )
        
        if document_type.exists():
            self.stdout.write(f"\n=== OLD DOCUMENT TYPE VERIFICATIONS ===")
            self.stdout.write(f"Found {document_type.count()} old 'document' type verifications")
            
            if not dry_run:
                updated = document_type.update(
                    status='expired',
                    failure_reason='Old verification type - replaced by new system'
                )
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Cleaned up {updated} old document type verifications")
                )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('\n⚠️  DRY RUN - No changes made. Run without --dry-run to apply changes.')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('\n✅ Cleanup complete!')
            )
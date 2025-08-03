from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.users.models import PropertyEnquiry


class Command(BaseCommand):
    help = 'Clear recent property enquiries to allow new enquiries'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Clear all enquiries (not just recent ones)',
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Clear enquiries for a specific user email',
        )
        parser.add_argument(
            '--property',
            type=str,
            help='Clear enquiries for a specific property ID',
        )

    def handle(self, *args, **options):
        # Build the query
        queryset = PropertyEnquiry.objects.all()
        
        if not options['all']:
            # By default, only clear enquiries from the last 24 hours
            recent_cutoff = timezone.now() - timedelta(hours=24)
            queryset = queryset.filter(created_at__gte=recent_cutoff)
        
        if options['user']:
            queryset = queryset.filter(user__email=options['user'])
            self.stdout.write(f"Filtering by user: {options['user']}")
        
        if options['property']:
            queryset = queryset.filter(property_id=options['property'])
            self.stdout.write(f"Filtering by property: {options['property']}")
        
        # Count before deletion
        count = queryset.count()
        
        if count == 0:
            self.stdout.write(self.style.WARNING('No enquiries found matching the criteria.'))
            return
        
        # Show what will be deleted
        self.stdout.write(f"\nFound {count} enquiries to delete:")
        for enquiry in queryset[:10]:  # Show first 10
            self.stdout.write(
                f"  - {enquiry.user.email} → {enquiry.property.title} "
                f"(sent {enquiry.created_at.strftime('%Y-%m-%d %H:%M')})"
            )
        if count > 10:
            self.stdout.write(f"  ... and {count - 10} more")
        
        # Confirm deletion
        if input("\nDo you want to delete these enquiries? (yes/no): ").lower() != 'yes':
            self.stdout.write(self.style.WARNING('Operation cancelled.'))
            return
        
        # Delete the enquiries
        queryset.delete()
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted {count} enquiries.')
        )
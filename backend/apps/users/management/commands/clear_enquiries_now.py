from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.users.models import PropertyEnquiry


class Command(BaseCommand):
    help = 'Clear property enquiries without confirmation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Clear enquiries for a specific user email',
        )

    def handle(self, *args, **options):
        # Build the query - clear enquiries from last 24 hours
        recent_cutoff = timezone.now() - timedelta(hours=24)
        queryset = PropertyEnquiry.objects.filter(created_at__gte=recent_cutoff)
        
        if options['user']:
            queryset = queryset.filter(user__email=options['user'])
            self.stdout.write(f"Clearing enquiries for user: {options['user']}")
        
        # Count and delete
        count = queryset.count()
        
        if count == 0:
            self.stdout.write(self.style.WARNING('No recent enquiries found.'))
            return
        
        # Delete the enquiries
        queryset.delete()
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully cleared {count} recent enquiries.')
        )
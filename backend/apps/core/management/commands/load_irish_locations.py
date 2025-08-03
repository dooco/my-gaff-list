from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from apps.core.models import County, Town
import os


class Command(BaseCommand):
    help = 'Load Irish counties and towns from fixtures'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing counties and towns before loading',
        )
        parser.add_argument(
            '--backup',
            action='store_true',
            help='Create backup of existing data before loading',
        )

    def handle(self, *args, **options):
        self.stdout.write("Loading Irish locations...")
        
        # Create backup if requested
        if options['backup']:
            self.stdout.write("Creating backup...")
            call_command('dumpdata', 'core.County', 'core.Town', 
                        output='irish_locations_backup.json', 
                        indent=2)
            self.stdout.write(self.style.SUCCESS("Backup created: irish_locations_backup.json"))
        
        # Clear existing data if requested
        if options['clear']:
            self.stdout.write("Clearing existing data...")
            with transaction.atomic():
                Town.objects.all().delete()
                County.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing data cleared"))
        
        # Load the fixture
        fixture_path = os.path.join('apps', 'core', 'fixtures', 'irish_locations.json')
        
        try:
            call_command('loaddata', fixture_path)
            
            # Print summary
            county_count = County.objects.count()
            town_count = Town.objects.count()
            
            self.stdout.write(self.style.SUCCESS(
                f"\nSuccessfully loaded {county_count} counties and {town_count} towns"
            ))
            
            # Show some sample data
            self.stdout.write("\nSample counties loaded:")
            for county in County.objects.all()[:5]:
                town_count = county.towns.count()
                self.stdout.write(f"  - {county.name} ({town_count} towns)")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error loading fixtures: {str(e)}"))
            return
            
        self.stdout.write(self.style.SUCCESS("\nIrish locations loaded successfully!"))
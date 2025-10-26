"""
Management command to update search_vector field for all properties
"""
from django.core.management.base import BaseCommand
from django.contrib.postgres.search import SearchVector
from django.db.models import Value
from apps.core.models import Property


class Command(BaseCommand):
    help = 'Update search_vector field for all properties to enable full-text search'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of properties to update in each batch (default: 100)',
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']

        self.stdout.write(self.style.WARNING('Updating search vectors for all properties...'))

        # Get all properties with related data
        properties = Property.objects.select_related('town', 'county').all()
        total_count = properties.count()
        self.stdout.write(f'Found {total_count} properties to update')

        if total_count == 0:
            self.stdout.write(self.style.WARNING('No properties found to update'))
            return

        # Update properties by calling save() which will populate search_vector
        updated_count = 0

        for prop in properties:
            # Simply calling save() will trigger the search_vector update
            # The save() method in models.py handles this automatically
            try:
                # Use update_fields to prevent triggering geocoding unnecessarily
                Property.objects.filter(pk=prop.pk).update(
                    search_vector=(
                        SearchVector(Value(prop.title), weight='A', config='english') +
                        SearchVector(Value(prop.description), weight='B', config='english') +
                        SearchVector(Value(prop.town.name if prop.town else ''), weight='C', config='english') +
                        SearchVector(Value(prop.county.name if prop.county else ''), weight='C', config='english') +
                        SearchVector(Value(prop.address or ''), weight='D', config='english') +
                        SearchVector(Value(prop.eircode or ''), weight='D', config='simple')
                    )
                )
                updated_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error updating property {prop.id}: {e}'))
                continue

            # Show progress
            if updated_count % batch_size == 0:
                self.stdout.write(f'Updated {updated_count}/{total_count} properties...')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated search vectors for {updated_count} properties'
            )
        )

        # Provide usage tip
        self.stdout.write(
            self.style.SUCCESS(
                '\nFull-text search is now enabled! '
                'The search_vector field will be automatically updated when properties are saved.'
            )
        )

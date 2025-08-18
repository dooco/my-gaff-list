"""
Management command to geocode properties using HERE Maps or Google Maps API
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.core.models import Property
from apps.core.services.geocoding import geocoder, geocode_property
import time


class Command(BaseCommand):
    help = 'Geocode properties using HERE Maps or Google Maps API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Geocode all properties (including already geocoded)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without actually updating the database',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of properties to geocode',
        )
        parser.add_argument(
            '--eircode-only',
            action='store_true',
            help='Only geocode properties with eircodes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        geocode_all = options['all']
        limit = options['limit']
        eircode_only = options['eircode_only']
        
        # Check if any API key is configured
        if not settings.HERE_API_KEY and not settings.GOOGLE_MAPS_API_KEY:
            self.stdout.write(
                self.style.ERROR(
                    "\n❌ No geocoding API configured!"
                    "\n\nTo use geocoding, configure at least one of:"
                    "\n\nHERE Maps (recommended for Ireland):"
                    "\n1. Sign up at https://developer.here.com"
                    "\n2. Get your API key"
                    "\n3. Add to .env file: HERE_API_KEY=your-key-here"
                    "\n\nGoogle Maps (optional fallback):"
                    "\n1. Go to https://console.cloud.google.com"
                    "\n2. Enable Geocoding API"
                    "\n3. Get your API key"
                    "\n4. Add to .env file: GOOGLE_MAPS_API_KEY=your-key-here\n"
                )
            )
            return
        
        # Show which services are configured
        self.stdout.write("\n📍 Geocoding services configured:")
        if settings.HERE_API_KEY:
            self.stdout.write(self.style.SUCCESS("  ✅ HERE Maps API"))
        if settings.GOOGLE_MAPS_API_KEY:
            self.stdout.write(self.style.SUCCESS("  ✅ Google Maps API (fallback)"))
        
        # Get properties to geocode
        properties = Property.objects.all()
        
        if eircode_only:
            properties = properties.filter(
                eircode__isnull=False
            ).exclude(
                eircode=''
            ).exclude(
                eircode__endswith='0000'  # Skip placeholder eircodes
            )
        
        if not geocode_all:
            # Only get properties without coordinates
            properties = properties.filter(
                latitude__isnull=True,
                longitude__isnull=True
            )
        
        if limit:
            properties = properties[:limit]
        
        total = properties.count()
        
        if total == 0:
            self.stdout.write(self.style.SUCCESS("\nNo properties need geocoding"))
            return
        
        self.stdout.write(f"\n📍 Found {total} properties to geocode")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN MODE - No changes will be saved\n"))
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        
        for idx, prop in enumerate(properties, 1):
            self.stdout.write(f"\n[{idx}/{total}] Processing: {prop.title}")
            
            # Show what we're geocoding with
            if prop.eircode and '0000' not in prop.eircode:
                self.stdout.write(f"  📮 Eircode: {prop.eircode}")
            else:
                self.stdout.write(f"  📍 Address: {prop.address or 'N/A'}")
                self.stdout.write(f"  📍 Location: {prop.town.name if prop.town else 'Unknown'}, {prop.county.name if prop.county else 'Unknown'}")
            
            # Check if it's a placeholder eircode
            if prop.eircode and '0000' in prop.eircode:
                self.stdout.write(self.style.WARNING("  ⏭️  Skipping placeholder eircode"))
                skipped_count += 1
                continue
            
            if dry_run:
                # Just check if we can geocode it
                if prop.eircode and '0000' not in prop.eircode:
                    result = geocoder.geocode_eircode(prop.eircode)
                else:
                    # Build address for geocoding
                    address_parts = []
                    if prop.address:
                        address_parts.append(prop.address)
                    if prop.town:
                        address_parts.append(str(prop.town))
                    if prop.county:
                        address_parts.append(str(prop.county))
                    
                    if address_parts:
                        full_address = ', '.join(address_parts) + ', Ireland'
                        result = geocoder.geocode_address(full_address)
                    else:
                        result = None
                
                if result:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ Would geocode to: {result['latitude']:.6f}, {result['longitude']:.6f} (via {result['source']})"
                        )
                    )
                    success_count += 1
                else:
                    self.stdout.write(self.style.ERROR("  ❌ Would fail to geocode"))
                    failed_count += 1
            else:
                # Actually geocode and save
                if geocode_property(prop):
                    # Refresh from database
                    prop.refresh_from_db()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ Geocoded: {prop.latitude:.6f}, {prop.longitude:.6f}"
                        )
                    )
                    success_count += 1
                else:
                    self.stdout.write(self.style.ERROR("  ❌ Failed to geocode"))
                    failed_count += 1
            
            # Small delay to respect rate limits
            if idx < total:
                time.sleep(0.1)
        
        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS(f"\n✅ Successfully geocoded: {success_count}"))
        if failed_count > 0:
            self.stdout.write(self.style.ERROR(f"❌ Failed: {failed_count}"))
        if skipped_count > 0:
            self.stdout.write(self.style.WARNING(f"⏭️  Skipped (placeholder): {skipped_count}"))
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "\n🔍 This was a dry run. Run without --dry-run to update the database."
                )
            )
        elif success_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n🎉 {success_count} properties have been geocoded and saved!"
                )
            )
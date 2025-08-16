# Generated data migration to parse existing addresses

from django.db import migrations
import re


def parse_existing_addresses(apps, schema_editor):
    """Parse existing address field into structured fields"""
    Property = apps.get_model('core', 'Property')
    
    # Eircode placeholder mapping for common areas
    eircode_placeholders = {
        'Dublin': 'D',
        'Cork': 'T',
        'Galway': 'H',
        'Limerick': 'V',
        'Waterford': 'X',
        'Kilkenny': 'R',
        'Wexford': 'Y',
        'Carlow': 'R',
        'Kildare': 'W',
        'Meath': 'C',
        'Westmeath': 'N',
        'Laois': 'R',
        'Offaly': 'R',
        'Longford': 'N',
        'Louth': 'A',
        'Monaghan': 'H',
        'Cavan': 'H',
        'Donegal': 'F',
        'Sligo': 'F',
        'Mayo': 'F',
        'Roscommon': 'F',
        'Leitrim': 'N',
        'Clare': 'V',
        'Tipperary': 'E',
        'Kerry': 'V',
    }
    
    for property in Property.objects.all():
        if not property.address:
            continue
            
        address = property.address.strip()
        
        # Try to detect if there's a Dublin postal code at the end
        dublin_postal = re.search(r'Dublin\s+(\d{1,2})$', address, re.IGNORECASE)
        
        if dublin_postal:
            # Remove the Dublin postal code from address for parsing
            address_without_postal = address[:dublin_postal.start()].strip().rstrip(',')
            postal_code = dublin_postal.group(1)
            
            # Generate placeholder Eircode for Dublin
            property.eircode = f"D{postal_code.zfill(2)} 0000"
            
            # Parse the rest of the address
            if ',' in address_without_postal:
                parts = [p.strip() for p in address_without_postal.split(',')]
                property.address_line_1 = parts[0]
                if len(parts) > 1:
                    property.address_line_2 = ', '.join(parts[1:])
            else:
                property.address_line_1 = address_without_postal
        else:
            # Handle non-Dublin addresses
            if ',' in address:
                parts = [p.strip() for p in address.split(',')]
                property.address_line_1 = parts[0]
                
                # If there are more parts, put them in address_line_2
                # But exclude the town name if it matches
                remaining_parts = []
                for part in parts[1:]:
                    # Check if this part is the town name
                    if property.town and part.lower() != property.town.name.lower():
                        remaining_parts.append(part)
                
                if remaining_parts:
                    property.address_line_2 = ', '.join(remaining_parts)
            else:
                property.address_line_1 = address
            
            # Generate placeholder Eircode based on county
            if property.county:
                county_name = property.county.name
                eircode_prefix = eircode_placeholders.get(county_name, 'A')
                property.eircode = f"{eircode_prefix}00 0000"
            else:
                property.eircode = "A00 0000"  # Default placeholder
        
        # Clean up any trailing/leading whitespace
        property.address_line_1 = property.address_line_1.strip()
        property.address_line_2 = property.address_line_2.strip() if property.address_line_2 else ''
        
        property.save()
        
        print(f"Migrated: {property.title}")
        print(f"  Original: {property.address}")
        print(f"  Line 1: {property.address_line_1}")
        print(f"  Line 2: {property.address_line_2}")
        print(f"  Eircode: {property.eircode}")
        print("---")


def reverse_migration(apps, schema_editor):
    """Clear the new fields if migration is reversed"""
    Property = apps.get_model('core', 'Property')
    
    for property in Property.objects.all():
        property.address_line_1 = ''
        property.address_line_2 = ''
        property.eircode = ''
        property.save()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_add_structured_address_fields'),
    ]

    operations = [
        migrations.RunPython(parse_existing_addresses, reverse_migration),
    ]
# Generated manually to fix field defaults

from django.db import migrations

def set_defaults(apps, schema_editor):
    """Set default values for fields that need them."""
    Message = apps.get_model('messaging', 'Message')
    
    # Update any NULL values to defaults
    Message.objects.filter(original_content__isnull=True).update(original_content='')
    Message.objects.filter(edit_history__isnull=True).update(edit_history=[])
    
    # SQLite doesn't handle NULL properly, so update empty values too
    Message.objects.filter(original_content='').update(original_content='')

def reverse_defaults(apps, schema_editor):
    """Reverse operation - does nothing."""
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0004_fix_edit_history_null'),
    ]

    operations = [
        migrations.RunPython(set_defaults, reverse_defaults),
        migrations.RunSQL(
            # For SQLite, we need to recreate the table with proper defaults
            # This is a workaround for SQLite's limitations
            sql=[
                "UPDATE messaging_message SET original_content = '' WHERE original_content IS NULL;",
                "UPDATE messaging_message SET edit_history = '[]' WHERE edit_history IS NULL;",
            ],
            reverse_sql=[
                "SELECT 1;",  # No-op for reverse
            ],
            state_operations=[]
        ),
    ]
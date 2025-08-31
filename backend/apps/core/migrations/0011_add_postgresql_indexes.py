# Generated manually for PostgreSQL-specific indexes
from django.db import migrations, models
from django.conf import settings


class Migration(migrations.Migration):
    
    dependencies = [
        ('core', '0010_add_property_search_query'),
    ]
    
    operations = []
    
    # Only add PostgreSQL-specific operations if using PostgreSQL
    if settings.DATABASES['default']['ENGINE'] == 'django.db.backends.postgresql':
        operations.extend([
            # Add search vector field for full-text search
            migrations.AddField(
                model_name='property',
                name='search_vector',
                field=models.TextField(null=True, blank=True, editable=False),
            ),
            
            # Create composite index on frequently queried fields
            migrations.AddIndex(
                model_name='property',
                index=models.Index(
                    fields=['county', 'town', 'rent_monthly', 'bedrooms'],
                    name='core_prop_composite_idx'
                ),
            ),
            
            # Create index on availability dates
            migrations.AddIndex(
                model_name='property',
                index=models.Index(
                    fields=['available_from', 'available_to'],
                    name='core_prop_availability_idx'
                ),
            ),
            
            # Create index on property type and features
            migrations.AddIndex(
                model_name='property',
                index=models.Index(
                    fields=['property_type', 'furnished', 'pet_friendly'],
                    name='core_prop_features_idx'
                ),
            ),
            
            # Create index for active properties with timestamps
            migrations.AddIndex(
                model_name='property',
                index=models.Index(
                    fields=['is_active', '-created_at'],
                    name='core_prop_active_recent_idx'
                ),
            ),
            
            # Create index for price ranges
            migrations.AddIndex(
                model_name='property',
                index=models.Index(
                    fields=['rent_monthly', 'bedrooms'],
                    name='core_prop_price_beds_idx'
                ),
            ),
            
            # Add GIN index for full-text search (raw SQL)
            migrations.RunSQL(
                sql="""
                    CREATE EXTENSION IF NOT EXISTS pg_trgm;
                    CREATE EXTENSION IF NOT EXISTS unaccent;
                    
                    -- Create GIN index for trigram similarity search
                    CREATE INDEX IF NOT EXISTS core_property_title_trgm_idx 
                    ON core_property USING gin (title gin_trgm_ops);
                    
                    CREATE INDEX IF NOT EXISTS core_property_description_trgm_idx 
                    ON core_property USING gin (description gin_trgm_ops);
                    
                    -- Create function to update search vector
                    CREATE OR REPLACE FUNCTION update_property_search_vector() 
                    RETURNS trigger AS $$
                    BEGIN
                        NEW.search_vector := 
                            setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
                            setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
                            setweight(to_tsvector('english', coalesce(NEW.address, '')), 'C') ||
                            setweight(to_tsvector('english', coalesce(NEW.eircode, '')), 'C');
                        RETURN NEW;
                    END
                    $$ LANGUAGE plpgsql;
                    
                    -- Create trigger to auto-update search vector
                    DROP TRIGGER IF EXISTS property_search_vector_update ON core_property;
                    CREATE TRIGGER property_search_vector_update 
                    BEFORE INSERT OR UPDATE ON core_property
                    FOR EACH ROW 
                    EXECUTE FUNCTION update_property_search_vector();
                    
                    -- Update existing rows
                    UPDATE core_property SET 
                        search_vector = 
                            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                            setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
                            setweight(to_tsvector('english', coalesce(address, '')), 'C') ||
                            setweight(to_tsvector('english', coalesce(eircode, '')), 'C');
                    
                    -- Create GIN index on search vector
                    CREATE INDEX IF NOT EXISTS core_property_search_vector_idx 
                    ON core_property USING gin (to_tsvector('english', search_vector));
                """,
                reverse_sql="""
                    DROP TRIGGER IF EXISTS property_search_vector_update ON core_property;
                    DROP FUNCTION IF EXISTS update_property_search_vector();
                    DROP INDEX IF EXISTS core_property_search_vector_idx;
                    DROP INDEX IF EXISTS core_property_description_trgm_idx;
                    DROP INDEX IF EXISTS core_property_title_trgm_idx;
                """
            ),
        ])
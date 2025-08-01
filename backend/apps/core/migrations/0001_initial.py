# Generated by Django 5.1 on 2025-07-30 18:52

import django.core.validators
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='County',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('slug', models.SlugField(unique=True)),
            ],
            options={
                'verbose_name_plural': 'Counties',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Town',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug', models.SlugField(max_length=100)),
                ('county', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='towns', to='core.county')),
            ],
            options={
                'ordering': ['name'],
                'unique_together': {('name', 'county')},
            },
        ),
        migrations.CreateModel(
            name='Property',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('address', models.CharField(blank=True, max_length=300)),
                ('property_type', models.CharField(choices=[('apartment', 'Apartment'), ('house', 'House'), ('shared', 'Shared Accommodation'), ('studio', 'Studio'), ('townhouse', 'Townhouse')], max_length=20)),
                ('house_type', models.CharField(blank=True, choices=[('terraced', 'Terraced'), ('semi_detached', 'Semi-Detached'), ('detached', 'Detached'), ('bungalow', 'Bungalow')], max_length=20)),
                ('bedrooms', models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(10)])),
                ('bathrooms', models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(10)])),
                ('floor_area', models.PositiveIntegerField(blank=True, help_text='Floor area in sq metres', null=True)),
                ('rent_monthly', models.DecimalField(decimal_places=2, max_digits=6, validators=[django.core.validators.MinValueValidator(0)])),
                ('deposit', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('furnished', models.CharField(choices=[('furnished', 'Furnished'), ('unfurnished', 'Unfurnished'), ('part_furnished', 'Part Furnished')], max_length=20)),
                ('ber_rating', models.CharField(blank=True, choices=[('A1', 'A1'), ('A2', 'A2'), ('A3', 'A3'), ('B1', 'B1'), ('B2', 'B2'), ('B3', 'B3'), ('C1', 'C1'), ('C2', 'C2'), ('C3', 'C3'), ('D1', 'D1'), ('D2', 'D2'), ('E1', 'E1'), ('E2', 'E2'), ('F', 'F'), ('G', 'G'), ('EXEMPT', 'Exempt')], max_length=10)),
                ('ber_number', models.CharField(blank=True, help_text='BER Certificate Number', max_length=20)),
                ('features', models.JSONField(blank=True, default=list, help_text='List of property features')),
                ('main_image', models.URLField(blank=True)),
                ('image_urls', models.JSONField(blank=True, default=list, help_text='List of image URLs')),
                ('available_from', models.DateField()),
                ('lease_length', models.CharField(blank=True, help_text="e.g., '12 months', 'Long term'", max_length=50)),
                ('contact_name', models.CharField(max_length=100)),
                ('contact_phone', models.CharField(blank=True, max_length=20)),
                ('contact_email', models.EmailField(max_length=254)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('county', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.county')),
                ('town', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.town')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]

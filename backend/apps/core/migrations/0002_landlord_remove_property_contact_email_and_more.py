# Generated by Django 5.1 on 2025-07-31 07:30

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Landlord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('user_type', models.CharField(choices=[('landlord', 'Landlord'), ('agent', 'Estate Agent'), ('property_manager', 'Property Manager')], default='landlord', max_length=20)),
                ('is_verified', models.BooleanField(default=False)),
                ('verification_date', models.DateTimeField(blank=True, null=True)),
                ('verification_documents', models.JSONField(blank=True, default=list, help_text='List of verification document references')),
                ('verification_notes', models.TextField(blank=True)),
                ('company_name', models.CharField(blank=True, max_length=100)),
                ('license_number', models.CharField(blank=True, help_text='PSRA license number for agents', max_length=50)),
                ('preferred_contact_method', models.CharField(choices=[('phone', 'Phone'), ('email', 'Email'), ('both', 'Both')], default='both', max_length=20)),
                ('response_time_hours', models.PositiveIntegerField(default=24, help_text='Typical response time in hours')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.RemoveField(
            model_name='property',
            name='contact_email',
        ),
        migrations.RemoveField(
            model_name='property',
            name='contact_name',
        ),
        migrations.RemoveField(
            model_name='property',
            name='contact_phone',
        ),
        migrations.AddField(
            model_name='property',
            name='landlord',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='properties', to='core.landlord'),
        ),
    ]

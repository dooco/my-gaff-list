"""
Management command to create a superuser if one doesn't exist.
Used in production deployments to ensure admin access.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decouple import config
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser if one does not exist'

    def handle(self, *args, **options):
        # Get credentials from environment variables
        admin_email = config('ADMIN_EMAIL', default='admin@mygafflist.com')
        admin_password = config('ADMIN_PASSWORD', default=None)
        
        # Check if superuser already exists
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(
                self.style.SUCCESS('Superuser already exists')
            )
            return
        
        # Create superuser if password is provided
        if admin_password:
            try:
                user = User.objects.create_superuser(
                    email=admin_email,
                    username=admin_email,
                    password=admin_password,
                    first_name='Admin',
                    last_name='User'
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully created superuser: {admin_email}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating superuser: {str(e)}')
                )
        else:
            self.stdout.write(
                self.style.WARNING(
                    'ADMIN_PASSWORD not set in environment variables. '
                    'Skipping superuser creation.'
                )
            )
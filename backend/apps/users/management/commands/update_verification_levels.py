"""
Management command to update verification levels for all users
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.users.models import User


class Command(BaseCommand):
    help = 'Update verification levels and trust scores for all users'

    def handle(self, *args, **options):
        self.stdout.write('Updating verification levels for all users...')
        
        users = User.objects.all()
        updated_count = 0
        
        with transaction.atomic():
            for user in users:
                old_level = user.verification_level
                new_level = user.update_verification_level()
                
                if old_level != new_level:
                    updated_count += 1
                    self.stdout.write(
                        f'Updated {user.email}: {old_level} -> {new_level} '
                        f'(Trust Score: {user.trust_score})'
                    )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {updated_count} users'
            )
        )
        
        # Print summary
        self.stdout.write('\n--- Verification Level Summary ---')
        for level in ['none', 'basic', 'standard', 'premium']:
            count = User.objects.filter(verification_level=level).count()
            self.stdout.write(f'{level.capitalize()}: {count} users')
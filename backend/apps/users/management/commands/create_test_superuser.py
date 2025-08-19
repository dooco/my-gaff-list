from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a test superuser account for development'

    def handle(self, *args, **options):
        email = 'admin@mygafflist.ie'
        password = 'admin123'
        
        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'Superuser {email} already exists')
            )
            return
        
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name='Admin',
            last_name='User',
            user_type='admin'
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created superuser:\n'
                              f'Email: {email}\n'
                              f'Password: {password}')
        )
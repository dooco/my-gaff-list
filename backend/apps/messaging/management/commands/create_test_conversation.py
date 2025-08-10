from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.messaging.models import Conversation

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates a test conversation between two users'

    def handle(self, *args, **options):
        # Get or create test users
        user1, created1 = User.objects.get_or_create(
            email='test1@example.com',
            defaults={
                'username': 'testuser1',
                'first_name': 'Test',
                'last_name': 'User1',
                'user_type': 'tenant'
            }
        )
        if created1:
            user1.set_password('testpass123')
            user1.save()
            self.stdout.write(f'Created user: {user1.email}')
        else:
            self.stdout.write(f'Found existing user: {user1.email}')

        user2, created2 = User.objects.get_or_create(
            email='test2@example.com',
            defaults={
                'username': 'testuser2',
                'first_name': 'Test',
                'last_name': 'User2',
                'user_type': 'landlord'
            }
        )
        if created2:
            user2.set_password('testpass123')
            user2.save()
            self.stdout.write(f'Created user: {user2.email}')
        else:
            self.stdout.write(f'Found existing user: {user2.email}')

        # Create test conversation (will generate UUID automatically)
        # First check if conversation exists between these users
        conversation = Conversation.objects.filter(
            participant1__in=[user1, user2],
            participant2__in=[user1, user2]
        ).first()
        
        if not conversation:
            conversation = Conversation.objects.create(
                participant1=user1,
                participant2=user2,
            )
            created = True
        else:
            created = False
        
        if created:
            self.stdout.write(self.style.SUCCESS(
                f'Created test conversation: {conversation.id}\n'
                f'Between {user1.email} and {user2.email}'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Test conversation already exists: {conversation.id}\n'
                f'Between {conversation.participant1.email} and {conversation.participant2.email}'
            ))
        
        self.stdout.write(self.style.WARNING(
            f'\nIMPORTANT: Use this conversation ID in the test chat: {conversation.id}'
        ))
        
        # Generate JWT tokens for testing
        from rest_framework_simplejwt.tokens import RefreshToken
        
        for user in [user1, user2]:
            refresh = RefreshToken.for_user(user)
            self.stdout.write(f'\nTokens for {user.email}:')
            self.stdout.write(f'Password: testpass123')
            self.stdout.write(f'Access token:\n{refresh.access_token}')
            self.stdout.write(f'Refresh token:\n{refresh}')
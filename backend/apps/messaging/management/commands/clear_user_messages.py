from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Q
from apps.messaging.models import Conversation, Message
from apps.users.models import PropertyEnquiry

User = get_user_model()


class Command(BaseCommand):
    help = 'Clear all messages and conversations for specific users'

    def add_arguments(self, parser):
        parser.add_argument(
            'emails',
            nargs='+',
            type=str,
            help='Email addresses of users to clear messages for',
        )
        parser.add_argument(
            '--enquiries',
            action='store_true',
            help='Also clear property enquiries',
        )

    def handle(self, *args, **options):
        emails = options['emails']
        
        for email in emails:
            self.stdout.write(f"\nProcessing user: {email}")
            
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'User not found: {email}'))
                continue
            
            # Clear conversations where user is a participant
            conversations = Conversation.objects.filter(
                Q(participant1=user) | Q(participant2=user)
            )
            conv_count = conversations.count()
            
            # Count messages before deletion
            message_count = Message.objects.filter(
                Q(conversation__participant1=user) | 
                Q(conversation__participant2=user)
            ).count()
            
            # Delete conversations (this will cascade delete messages)
            conversations.delete()
            
            self.stdout.write(
                f"  - Deleted {conv_count} conversations and {message_count} messages"
            )
            
            # Clear property enquiries if requested
            if options['enquiries']:
                enquiries = PropertyEnquiry.objects.filter(user=user)
                enq_count = enquiries.count()
                enquiries.delete()
                self.stdout.write(f"  - Deleted {enq_count} property enquiries")
        
        self.stdout.write(self.style.SUCCESS('\nSuccessfully cleared all data!'))
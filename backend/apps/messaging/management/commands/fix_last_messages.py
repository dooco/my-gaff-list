from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.messaging.models import Conversation, Message
from django.utils import timezone


class Command(BaseCommand):
    help = 'Fix missing last_message data in conversations'

    def handle(self, *args, **options):
        self.stdout.write('Fixing last_message data for all conversations...')
        
        # Get all conversations
        conversations = Conversation.objects.all()
        total = conversations.count()
        fixed = 0
        already_ok = 0
        no_messages = 0
        
        for conversation in conversations:
            # Get the latest message for this conversation
            latest_message = Message.objects.filter(
                conversation=conversation,
                is_system_message=False
            ).order_by('-created_at').first()
            
            if latest_message:
                # Check if last_message needs updating
                if (not conversation.last_message or 
                    conversation.last_message_at != latest_message.created_at or
                    conversation.last_message_by != latest_message.sender):
                    
                    # Update the conversation's last message info
                    conversation.last_message = latest_message.content[:100]
                    conversation.last_message_at = latest_message.created_at
                    conversation.last_message_by = latest_message.sender
                    conversation.save(update_fields=[
                        'last_message', 'last_message_at', 'last_message_by', 'updated_at'
                    ])
                    fixed += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Fixed conversation {conversation.id} - '
                            f'Participants: {conversation.participant1.email} & {conversation.participant2.email}'
                        )
                    )
                else:
                    already_ok += 1
            else:
                # No messages in this conversation
                if conversation.last_message:
                    # Clear the last_message fields if they were incorrectly set
                    conversation.last_message = ''
                    conversation.last_message_at = None
                    conversation.last_message_by = None
                    conversation.save(update_fields=[
                        'last_message', 'last_message_at', 'last_message_by', 'updated_at'
                    ])
                    fixed += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f'Cleared conversation {conversation.id} (no messages found)'
                        )
                    )
                else:
                    no_messages += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary:\n'
                f'Total conversations: {total}\n'
                f'Fixed: {fixed}\n'
                f'Already OK: {already_ok}\n'
                f'No messages: {no_messages}'
            )
        )
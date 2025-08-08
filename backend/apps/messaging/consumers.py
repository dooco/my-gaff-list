import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import Conversation, Message
from .serializers import MessageSerializer

User = get_user_model()


def convert_uuids_to_strings(data):
    """Recursively convert all UUID objects to strings in a dictionary."""
    if isinstance(data, dict):
        return {key: convert_uuids_to_strings(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_uuids_to_strings(item) for item in data]
    elif isinstance(data, uuid.UUID):
        return str(data)
    else:
        return data


class MessageConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time messaging."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.user_group_name = None
        self.conversation_groups = set()
        
    async def connect(self):
        """Handle WebSocket connection."""
        print(f"WebSocket connect attempt - scope user: {self.scope.get('user')}")
        
        # Get user from scope (set by middleware)
        self.user = self.scope.get('user')
        
        if self.user and self.user.is_authenticated:
            print(f"WebSocket authenticated user: {self.user.email}")
            await self.accept()
            
            # Add user to their personal notification group
            self.user_group_name = f'user_{self.user.id}'
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'user_id': str(self.user.id)
            }))
        else:
            print(f"WebSocket authentication failed - user: {self.user}")
            await self.close(code=4001)  # Unauthorized
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if self.user and self.user_group_name:
            # Remove from user group
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            
            # Remove from all conversation groups
            for group_name in self.conversation_groups:
                await self.channel_layer.group_discard(
                    group_name,
                    self.channel_name
                )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        if not self.user:
            return
            
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'join_conversation':
                await self.join_conversation(data.get('conversation_id'))
            elif message_type == 'leave_conversation':
                await self.leave_conversation(data.get('conversation_id'))
            elif message_type == 'send_message':
                await self.send_message(data)
            elif message_type == 'typing':
                await self.send_typing_indicator(data)
            elif message_type == 'mark_read':
                await self.mark_messages_read(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON")
        except Exception as e:
            await self.send_error(str(e))
    
    async def join_conversation(self, conversation_id):
        """Join a conversation group."""
        print(f"Join conversation request for: {conversation_id}")
        
        if not conversation_id:
            return
            
        # Verify user has access to this conversation
        has_access = await self.verify_conversation_access(conversation_id)
        if has_access:
            group_name = f'conversation_{conversation_id}'
            print(f"Adding user {self.user.email} to group: {group_name}")
            
            self.conversation_groups.add(group_name)
            await self.channel_layer.group_add(
                group_name,
                self.channel_name
            )
            
            print(f"User joined group successfully. Current groups: {self.conversation_groups}")
            
            await self.send(text_data=json.dumps({
                'type': 'joined_conversation',
                'conversation_id': conversation_id
            }))
        else:
            print(f"Access denied for user {self.user} to conversation {conversation_id}")
    
    async def leave_conversation(self, conversation_id):
        """Leave a conversation group."""
        if not conversation_id:
            return
            
        group_name = f'conversation_{conversation_id}'
        if group_name in self.conversation_groups:
            self.conversation_groups.remove(group_name)
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name
            )
            await self.send(text_data=json.dumps({
                'type': 'left_conversation',
                'conversation_id': conversation_id
            }))
    
    async def send_message(self, data):
        """Handle sending a new message."""
        print(f"WebSocket send_message called with data: {data}")
        
        conversation_id = data.get('conversation_id')
        content = data.get('content')
        
        if not conversation_id or not content:
            await self.send_error("Missing conversation_id or content")
            return
            
        # Verify access
        has_access = await self.verify_conversation_access(conversation_id)
        if not has_access:
            print(f"Access denied for user {self.user} to conversation {conversation_id}")
            await self.send_error("Access denied")
            return
            
        # Create message
        message = await self.create_message(conversation_id, content)
        if message:
            print(f"Created message: {message.id}")
            
            # Serialize message
            message_data = await self.serialize_message(message)
            print(f"Serialized message data: {message_data}")
            
            # Send to conversation group
            group_name = f'conversation_{conversation_id}'
            print(f"Broadcasting to group: {group_name}")
            
            await self.channel_layer.group_send(
                group_name,
                {
                    'type': 'new_message',
                    'message': message_data
                }
            )
            
            # Send to other participant's user group for notifications
            other_participant = await self.get_other_participant(conversation_id)
            if other_participant:
                print(f"Sending notification to user: {other_participant.id}")
                await self.channel_layer.group_send(
                    f'user_{other_participant.id}',
                    {
                        'type': 'new_message_notification',
                        'message': message_data,
                        'conversation_id': conversation_id
                    }
                )
    
    async def send_typing_indicator(self, data):
        """Send typing indicator to conversation participants."""
        conversation_id = data.get('conversation_id')
        is_typing = data.get('is_typing', False)
        
        if not conversation_id:
            return
            
        # Verify access
        has_access = await self.verify_conversation_access(conversation_id)
        if not has_access:
            return
            
        # Send to conversation group
        await self.channel_layer.group_send(
            f'conversation_{conversation_id}',
            {
                'type': 'typing_indicator',
                'user_id': str(self.user.id),
                'is_typing': is_typing,
                'conversation_id': conversation_id
            }
        )
    
    async def mark_messages_read(self, data):
        """Mark messages as read."""
        conversation_id = data.get('conversation_id')
        message_ids = data.get('message_ids', [])
        
        if not conversation_id:
            return
            
        # Mark conversation as read
        await self.mark_conversation_read(conversation_id)
        
        # Send read receipt to conversation group
        await self.channel_layer.group_send(
            f'conversation_{conversation_id}',
            {
                'type': 'messages_read',
                'user_id': str(self.user.id),
                'conversation_id': conversation_id,
                'message_ids': message_ids
            }
        )
    
    # Channel layer message handlers
    async def new_message(self, event):
        """Handle new message broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': event['message']
        }))
    
    async def new_message_notification(self, event):
        """Handle new message notification."""
        await self.send(text_data=json.dumps({
            'type': 'new_message_notification',
            'message': event['message'],
            'conversation_id': event['conversation_id']
        }))
    
    async def typing_indicator(self, event):
        """Handle typing indicator broadcast."""
        # Don't send typing indicator to the user who is typing
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing_indicator',
                'user_id': event['user_id'],
                'is_typing': event['is_typing'],
                'conversation_id': event['conversation_id']
            }))
    
    async def messages_read(self, event):
        """Handle read receipt broadcast."""
        # Don't send read receipt to the user who read the messages
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'messages_read',
                'user_id': event['user_id'],
                'conversation_id': event['conversation_id'],
                'message_ids': event.get('message_ids', [])
            }))
    
    # Helper methods
    async def send_error(self, error_message):
        """Send error message to client."""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': error_message
        }))
    
    
    @database_sync_to_async
    def verify_conversation_access(self, conversation_id):
        """Verify user has access to conversation."""
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            return (self.user == conversation.participant1 or 
                    self.user == conversation.participant2)
        except Conversation.DoesNotExist:
            return False
    
    @database_sync_to_async
    def create_message(self, conversation_id, content):
        """Create a new message."""
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            message = Message.objects.create(
                conversation=conversation,
                sender=self.user,
                content=content
            )
            return message
        except Conversation.DoesNotExist:
            return None
    
    @database_sync_to_async
    def serialize_message(self, message):
        """Serialize message for WebSocket transmission."""
        serializer = MessageSerializer(message)
        # Ensure all UUIDs are converted to strings
        return convert_uuids_to_strings(serializer.data)
    
    @database_sync_to_async
    def get_other_participant(self, conversation_id):
        """Get the other participant in a conversation."""
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            return conversation.get_other_participant(self.user)
        except Conversation.DoesNotExist:
            return None
    
    @database_sync_to_async
    def mark_conversation_read(self, conversation_id):
        """Mark conversation as read for current user."""
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            conversation.mark_as_read(self.user)
            
            # Mark all unread messages as read
            Message.objects.filter(
                conversation=conversation,
                is_read=False
            ).exclude(sender=self.user).update(is_read=True)
            
        except Conversation.DoesNotExist:
            pass
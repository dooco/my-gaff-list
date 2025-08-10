import json
import uuid
import time
import re
from html import escape
from typing import Dict, Optional
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import Conversation, Message, MessageReaction
from .serializers import MessageSerializer, MessageReactionSerializer

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
    """WebSocket consumer for real-time messaging with security enhancements."""
    
    # Rate limiting settings
    MAX_MESSAGES_PER_MINUTE = 30
    MAX_TYPING_INDICATORS_PER_MINUTE = 60
    MAX_MESSAGE_LENGTH = 5000
    
    # Security patterns
    URL_PATTERN = re.compile(r'https?://[^\s<>"]+', re.IGNORECASE)
    SCRIPT_PATTERN = re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.user_group_name = None
        self.conversation_groups = set()
        self.rate_limit_cache_prefix = 'ws_rate_limit_'
        self.last_activity_time = time.time()
        
    async def connect(self):
        """Handle WebSocket connection with origin validation."""
        print(f"WebSocket connect attempt - scope user: {self.scope.get('user')}")
        
        # Validate origin header for CSRF protection
        origin = None
        for header in self.scope.get('headers', []):
            if header[0] == b'origin':
                origin = header[1].decode('utf-8')
                break
        
        # Check if origin is allowed
        allowed_origins = getattr(settings, 'ALLOWED_WS_ORIGINS', [])
        if not allowed_origins:
            # Fall back to ALLOWED_HOSTS if no specific WS origins configured
            allowed_origins = [f"http://{host}" for host in settings.ALLOWED_HOSTS]
            allowed_origins.extend([f"https://{host}" for host in settings.ALLOWED_HOSTS])
            if settings.DEBUG:
                allowed_origins.extend(['http://localhost:3000', 'http://127.0.0.1:3000'])
        
        if origin and origin not in allowed_origins:
            print(f"WebSocket connection rejected - invalid origin: {origin}")
            await self.close(code=4003)  # Forbidden
            return
        
        # Get user from scope (set by middleware)
        self.user = self.scope.get('user')
        
        if self.user and self.user.is_authenticated:
            print(f"WebSocket authenticated user: {self.user.email}")
            
            # Check if user is rate limited
            if await self.is_connection_rate_limited():
                print(f"WebSocket connection rejected - rate limited: {self.user.email}")
                await self.close(code=4029)  # Too Many Requests
                return
            
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
        """Handle incoming WebSocket messages with validation and rate limiting."""
        if not self.user:
            return
        
        # Check message size
        if len(text_data) > 10000:  # 10KB max message size
            await self.send_error("Message too large")
            return
            
        try:
            data = json.loads(text_data)
            
            # Validate message structure
            if not isinstance(data, dict) or 'type' not in data:
                await self.send_error("Invalid message format")
                return
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
            elif message_type == 'add_reaction':
                await self.add_reaction(data)
            elif message_type == 'remove_reaction':
                await self.remove_reaction(data)
            elif message_type == 'edit_message':
                await self.edit_message(data)
            elif message_type == 'delete_message':
                await self.delete_message(data)
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
        """Handle sending a new message with validation and sanitization."""
        print(f"WebSocket send_message called with data: {data}")
        
        # Rate limiting check
        if await self.is_message_rate_limited():
            await self.send_error("Rate limit exceeded. Please slow down.")
            return
        
        conversation_id = data.get('conversation_id')
        content = data.get('content')
        temp_id = data.get('temp_id')
        
        if not conversation_id or not content:
            await self.send_error("Missing conversation_id or content")
            return
        
        # Validate content length
        if len(content) > self.MAX_MESSAGE_LENGTH:
            await self.send_error(f"Message too long. Maximum {self.MAX_MESSAGE_LENGTH} characters.")
            return
        
        # Sanitize content
        content = await self.sanitize_message_content(content)
            
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
            
            # Include temp_id for message confirmation
            await self.channel_layer.group_send(
                group_name,
                {
                    'type': 'new_message',
                    'message': message_data,
                    'temp_id': temp_id
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
        """Send typing indicator with rate limiting."""
        # Rate limiting for typing indicators
        if await self.is_typing_rate_limited():
            return  # Silently ignore if rate limited
        
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
    
    async def reaction_added(self, event):
        """Handle reaction added broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'reaction_added',
            'message_id': event['message_id'],
            'reaction': event['reaction']
        }))
    
    async def reaction_removed(self, event):
        """Handle reaction removed broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'reaction_removed',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'emoji': event['emoji']
        }))
    
    async def message_edited(self, event):
        """Handle message edited broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'message': event['message']
        }))
    
    async def message_deleted(self, event):
        """Handle message deleted broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'deletion_type': event['deletion_type']
        }))
    
    # Helper methods
    async def send_error(self, error_message, temp_id=None):
        """Send error message to client."""
        error_data = {
            'type': 'error',
            'message': error_message
        }
        if temp_id:
            error_data['temp_id'] = temp_id
        await self.send(text_data=json.dumps(error_data))
    
    
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
    
    # Security and rate limiting methods
    async def sanitize_message_content(self, content: str) -> str:
        """Sanitize message content to prevent XSS attacks."""
        # Remove script tags
        content = self.SCRIPT_PATTERN.sub('', content)
        
        # Escape HTML entities
        content = escape(content)
        
        # Re-enable safe URLs (but keep them escaped)
        # This allows URLs to be clickable but prevents XSS
        content = self.URL_PATTERN.sub(
            lambda m: f'<a href="{escape(m.group())}" target="_blank" rel="noopener noreferrer">{escape(m.group())}</a>',
            content
        )
        
        return content
    
    @database_sync_to_async
    def is_connection_rate_limited(self) -> bool:
        """Check if user has too many recent connections."""
        cache_key = f"{self.rate_limit_cache_prefix}conn_{self.user.id}"
        connections = cache.get(cache_key, 0)
        
        if connections >= 5:  # Max 5 connections per minute
            return True
        
        cache.set(cache_key, connections + 1, 60)  # Expire after 1 minute
        return False
    
    @database_sync_to_async
    def is_message_rate_limited(self) -> bool:
        """Check if user is sending messages too quickly."""
        cache_key = f"{self.rate_limit_cache_prefix}msg_{self.user.id}"
        message_count = cache.get(cache_key, 0)
        
        if message_count >= self.MAX_MESSAGES_PER_MINUTE:
            return True
        
        cache.set(cache_key, message_count + 1, 60)  # Expire after 1 minute
        return False
    
    async def add_reaction(self, data):
        """Add a reaction to a message."""
        message_id = data.get('message_id')
        emoji = data.get('emoji')
        
        if not message_id or not emoji:
            await self.send_error("Missing message_id or emoji")
            return
        
        # Validate emoji length
        if len(emoji) > 10:
            await self.send_error("Invalid emoji")
            return
        
        # Add reaction
        reaction = await self.create_reaction(message_id, emoji)
        if reaction:
            # Get conversation ID from message
            conversation_id = await self.get_message_conversation_id(message_id)
            if conversation_id:
                # Serialize reaction
                reaction_data = await self.serialize_reaction(reaction)
                
                # Broadcast to conversation
                await self.channel_layer.group_send(
                    f'conversation_{conversation_id}',
                    {
                        'type': 'reaction_added',
                        'message_id': message_id,
                        'reaction': reaction_data
                    }
                )
    
    async def remove_reaction(self, data):
        """Remove a reaction from a message."""
        message_id = data.get('message_id')
        emoji = data.get('emoji')
        
        if not message_id or not emoji:
            await self.send_error("Missing message_id or emoji")
            return
        
        # Remove reaction
        removed = await self.delete_reaction(message_id, emoji)
        if removed:
            # Get conversation ID from message
            conversation_id = await self.get_message_conversation_id(message_id)
            if conversation_id:
                # Broadcast to conversation
                await self.channel_layer.group_send(
                    f'conversation_{conversation_id}',
                    {
                        'type': 'reaction_removed',
                        'message_id': message_id,
                        'user_id': str(self.user.id),
                        'emoji': emoji
                    }
                )
    
    async def edit_message(self, data):
        """Edit a message."""
        message_id = data.get('message_id')
        content = data.get('content')
        
        if not message_id or not content:
            await self.send_error("Missing message_id or content")
            return
        
        # Validate content length
        if len(content) > self.MAX_MESSAGE_LENGTH:
            await self.send_error(f"Message too long. Maximum {self.MAX_MESSAGE_LENGTH} characters.")
            return
        
        # Sanitize content
        content = await self.sanitize_message_content(content)
        
        # Edit message
        message = await self.update_message_content(message_id, content)
        if message:
            # Serialize message
            message_data = await self.serialize_message(message)
            
            # Get conversation ID
            conversation_id = str(message.conversation_id)
            
            # Broadcast to conversation
            await self.channel_layer.group_send(
                f'conversation_{conversation_id}',
                {
                    'type': 'message_edited',
                    'message': message_data
                }
            )
    
    async def delete_message(self, data):
        """Delete a message."""
        message_id = data.get('message_id')
        deletion_type = data.get('deletion_type', 'soft')
        
        if not message_id:
            await self.send_error("Missing message_id")
            return
        
        # Delete message
        deleted = await self.soft_delete_message(message_id)
        if deleted:
            # Get conversation ID from message
            conversation_id = await self.get_message_conversation_id(message_id)
            if conversation_id:
                # Broadcast to conversation
                await self.channel_layer.group_send(
                    f'conversation_{conversation_id}',
                    {
                        'type': 'message_deleted',
                        'message_id': message_id,
                        'deletion_type': deletion_type
                    }
                )
    
    @database_sync_to_async
    def create_reaction(self, message_id, emoji):
        """Create a reaction in the database."""
        try:
            message = Message.objects.get(id=message_id)
            
            # Check if user has access to this message
            if self.user not in [message.conversation.participant1, message.conversation.participant2]:
                return None
            
            # Create or get reaction
            reaction, created = MessageReaction.objects.get_or_create(
                message=message,
                user=self.user,
                emoji=emoji
            )
            
            return reaction
        except Message.DoesNotExist:
            return None
    
    @database_sync_to_async
    def delete_reaction(self, message_id, emoji):
        """Delete a reaction from the database."""
        try:
            reaction = MessageReaction.objects.get(
                message_id=message_id,
                user=self.user,
                emoji=emoji
            )
            reaction.delete()
            return True
        except MessageReaction.DoesNotExist:
            return False
    
    @database_sync_to_async
    def update_message_content(self, message_id, content):
        """Update message content."""
        try:
            message = Message.objects.get(id=message_id)
            
            # Use the model's edit_message method
            message.edit_message(content, self.user)
            
            return message
        except (Message.DoesNotExist, ValueError):
            return None
    
    @database_sync_to_async
    def soft_delete_message(self, message_id):
        """Soft delete a message."""
        try:
            message = Message.objects.get(id=message_id)
            
            # Use the model's soft_delete method
            message.soft_delete(self.user)
            
            return True
        except (Message.DoesNotExist, ValueError):
            return False
    
    @database_sync_to_async
    def get_message_conversation_id(self, message_id):
        """Get conversation ID from message."""
        try:
            message = Message.objects.get(id=message_id)
            return str(message.conversation_id)
        except Message.DoesNotExist:
            return None
    
    @database_sync_to_async
    def serialize_reaction(self, reaction):
        """Serialize reaction for WebSocket transmission."""
        serializer = MessageReactionSerializer(reaction)
        return convert_uuids_to_strings(serializer.data)
    
    @database_sync_to_async
    def is_typing_rate_limited(self) -> bool:
        """Check if user is sending typing indicators too frequently."""
        cache_key = f"{self.rate_limit_cache_prefix}type_{self.user.id}"
        typing_count = cache.get(cache_key, 0)
        
        if typing_count >= self.MAX_TYPING_INDICATORS_PER_MINUTE:
            return True
        
        cache.set(cache_key, typing_count + 1, 60)  # Expire after 1 minute
        return False
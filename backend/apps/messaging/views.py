from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination, CursorPagination
from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Max, Case, When, F
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer, ConversationDetailSerializer,
    MessageSerializer, CreateMessageSerializer,
    StartConversationSerializer
)
from apps.core.models import Property

User = get_user_model()


class MessagePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


class MessageCursorPagination(CursorPagination):
    """Cursor pagination for infinite scrolling of messages."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50
    ordering = '-created_at'  # Most recent first
    cursor_query_param = 'cursor'
    cursor_query_description = 'The pagination cursor value.'


class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversations.
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = MessagePagination
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        elif self.action == 'start':
            return StartConversationSerializer
        return ConversationSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Get all conversations where user is a participant
        queryset = Conversation.objects.filter(
            Q(participant1=user) | Q(participant2=user)
        ).select_related(
            'participant1', 'participant2', 'property', 'last_message_by'
        )
        
        # Add annotations for better filtering
        queryset = queryset.annotate(
            is_archived=Case(
                When(participant1=user, then='participant1_archived'),
                When(participant2=user, then='participant2_archived'),
                default=False
            ),
            is_blocked=Case(
                When(participant1=user, then='participant1_blocked'),
                When(participant2=user, then='participant2_blocked'),
                default=False
            )
        )
        
        # Filter by archive status
        archive_filter = self.request.query_params.get('archived', 'false').lower()
        if archive_filter == 'true':
            queryset = queryset.filter(is_archived=True)
        else:
            queryset = queryset.filter(is_archived=False)
        
        # Filter by property
        property_id = self.request.query_params.get('property')
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        
        # Filter by other participant
        other_user_id = self.request.query_params.get('user')
        if other_user_id:
            queryset = queryset.filter(
                Q(participant1_id=other_user_id) | Q(participant2_id=other_user_id)
            )
        
        # Sort by last message time
        return queryset.order_by('-last_message_at', '-created_at')
    
    def retrieve(self, request, *args, **kwargs):
        """Get conversation details with messages."""
        conversation = self.get_object()
        
        # Mark conversation as read
        conversation.mark_as_read(request.user)
        
        # Mark all unread messages as read
        messages_to_update = conversation.messages.filter(
            is_read=False
        ).exclude(sender=request.user)
        
        for message in messages_to_update:
            message.mark_as_read()
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start a new conversation or get existing one."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        recipient = User.objects.get(id=serializer.validated_data['recipient_id'])
        property_obj = None
        
        if 'property_id' in serializer.validated_data and serializer.validated_data['property_id']:
            property_obj = get_object_or_404(Property, id=serializer.validated_data['property_id'])
        
        # Check if conversation already exists
        existing_conversation = Conversation.objects.filter(
            Q(participant1=request.user, participant2=recipient) |
            Q(participant1=recipient, participant2=request.user)
        )
        
        if property_obj:
            existing_conversation = existing_conversation.filter(property=property_obj)
        
        if existing_conversation.exists():
            conversation = existing_conversation.first()
        else:
            # Create new conversation
            conversation = Conversation.objects.create(
                participant1=request.user,
                participant2=recipient,
                property=property_obj
            )
        
        # Create the first message
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=serializer.validated_data['message']
        )
        
        # Ensure conversation's last_message is updated (should be done by Message.save() but verify)
        if not conversation.last_message:
            conversation.last_message = message.content[:100]
            conversation.last_message_at = message.created_at
            conversation.last_message_by = message.sender
            conversation.save(update_fields=['last_message', 'last_message_at', 'last_message_by'])
        
        return Response(
            ConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get paginated messages for a conversation with cursor pagination."""
        conversation = self.get_object()
        
        # Check if user is a participant
        if request.user not in [conversation.participant1, conversation.participant2]:
            return Response(
                {'error': 'You are not a participant in this conversation.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get query parameters
        after = request.query_params.get('after')  # Load messages after this timestamp
        before = request.query_params.get('before')  # Load messages before this timestamp
        limit = int(request.query_params.get('limit', 20))
        
        # Build queryset
        messages = conversation.messages.all()
        
        if after:
            try:
                after_date = datetime.fromisoformat(after.replace('Z', '+00:00'))
                messages = messages.filter(created_at__gt=after_date)
            except (ValueError, AttributeError):
                pass
        
        if before:
            try:
                before_date = datetime.fromisoformat(before.replace('Z', '+00:00'))
                messages = messages.filter(created_at__lt=before_date)
            except (ValueError, AttributeError):
                pass
        
        # Order and limit
        messages = messages.order_by('-created_at')[:limit]
        
        # Serialize
        serializer = MessageSerializer(messages, many=True)
        
        return Response({
            'results': serializer.data,
            'has_more': messages.count() == limit,
            'conversation_id': str(conversation.id)
        })
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message in a conversation."""
        conversation = self.get_object()
        
        # Check if user is a participant
        if request.user not in [conversation.participant1, conversation.participant2]:
            return Response(
                {'error': 'You are not a participant in this conversation.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if conversation is blocked
        if conversation.is_blocked_by(conversation.get_other_participant(request.user)):
            return Response(
                {'error': 'This conversation has been blocked.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=serializer.validated_data['content']
        )
        
        # Unarchive conversation for both participants when a new message is sent
        conversation.participant1_archived = False
        conversation.participant2_archived = False
        conversation.save()
        
        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages in conversation as read."""
        conversation = self.get_object()
        
        # Mark conversation as read
        conversation.mark_as_read(request.user)
        
        # Mark all unread messages as read
        messages_updated = conversation.messages.filter(
            is_read=False
        ).exclude(sender=request.user).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'success': True,
            'messages_marked': messages_updated
        })
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a conversation."""
        conversation = self.get_object()
        conversation.archive_for(request.user)
        
        return Response({'success': True, 'archived': True})
    
    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """Unarchive a conversation."""
        conversation = self.get_object()
        conversation.unarchive_for(request.user)
        
        return Response({'success': True, 'archived': False})
    
    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        """Block a conversation."""
        conversation = self.get_object()
        
        if request.user == conversation.participant1:
            conversation.participant1_blocked = True
        elif request.user == conversation.participant2:
            conversation.participant2_blocked = True
        
        conversation.save()
        
        return Response({'success': True, 'blocked': True})
    
    @action(detail=True, methods=['post'])
    def unblock(self, request, pk=None):
        """Unblock a conversation."""
        conversation = self.get_object()
        
        if request.user == conversation.participant1:
            conversation.participant1_blocked = False
        elif request.user == conversation.participant2:
            conversation.participant2_blocked = False
        
        conversation.save()
        
        return Response({'success': True, 'blocked': False})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get total unread message count."""
        user = request.user
        
        # Get all conversations for user
        conversations = Conversation.objects.filter(
            Q(participant1=user) | Q(participant2=user)
        )
        
        total_unread = 0
        for conversation in conversations:
            total_unread += conversation.get_unread_count(user)
        
        return Response({
            'total_unread': total_unread,
            'conversations_with_unread': conversations.filter(
                Q(
                    participant1=user,
                    messages__created_at__gt=F('participant1_last_read'),
                    messages__sender__ne=user
                ) |
                Q(
                    participant2=user,
                    messages__created_at__gt=F('participant2_last_read'),
                    messages__sender__ne=user
                )
            ).distinct().count()
        })


class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for reading messages.
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = MessagePagination

    def get_queryset(self):
        user = self.request.user

        # Only show messages from conversations where user is a participant
        return Message.objects.filter(
            Q(conversation__participant1=user) |
            Q(conversation__participant2=user)
        ).select_related('sender', 'conversation').order_by('-created_at')

    @action(detail=False, methods=['get'])
    def poll(self, request):
        """Poll for new messages since a given timestamp."""
        user = request.user
        since = request.query_params.get('since')

        # Get messages from user's conversations
        queryset = self.get_queryset()

        # Filter by timestamp if provided
        if since:
            try:
                since_date = datetime.fromisoformat(since.replace('Z', '+00:00'))
                queryset = queryset.filter(created_at__gt=since_date)
            except (ValueError, AttributeError):
                pass

        # Only get recent messages (last 5 minutes if no timestamp)
        if not since:
            five_minutes_ago = timezone.now() - timedelta(minutes=5)
            queryset = queryset.filter(created_at__gte=five_minutes_ago)

        # Exclude messages sent by the requesting user
        queryset = queryset.exclude(sender=user)

        # Limit to reasonable number
        messages = queryset[:50]

        serializer = self.get_serializer(messages, many=True)

        return Response({
            'messages': serializer.data,
            'count': len(serializer.data),
            'timestamp': timezone.now().isoformat()
        })
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Count
from .models import Conversation, Message, MessageAttachment, MessageReaction
from apps.core.serializers import PropertyListSerializer
from apps.users.serializers import UserSerializer

User = get_user_model()


class MessageReactionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'emoji', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReactionSummarySerializer(serializers.Serializer):
    """Serializer for reaction summary."""
    emoji = serializers.CharField()
    count = serializers.IntegerField()
    users = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    has_reacted = serializers.BooleanField(required=False)


class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = ['id', 'filename', 'file_size', 'mime_type', 'uploaded_at', 'file']
        read_only_fields = ['id', 'uploaded_at']


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    reactions = serializers.SerializerMethodField()
    reaction_summary = serializers.SerializerMethodField()
    is_deleted = serializers.BooleanField(read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'content', 
            'created_at', 'edited_at', 'is_edited', 
            'is_read', 'read_at', 'is_system_message',
            'attachments', 'reactions', 'reaction_summary',
            'is_deleted', 'deleted_at', 'deletion_type',
            'can_edit', 'can_delete'
        ]
        read_only_fields = [
            'id', 'conversation', 'sender', 'created_at', 
            'edited_at', 'is_edited', 'read_at', 'deleted_at',
            'deletion_type'
        ]
    
    def get_reactions(self, obj):
        """Get all reactions for this message."""
        reactions = obj.reactions.select_related('user').all()
        return MessageReactionSerializer(reactions, many=True).data
    
    def get_reaction_summary(self, obj):
        """Get summarized reaction data."""
        request = self.context.get('request')
        user = request.user if request else None
        
        summary = obj.reactions.values('emoji').annotate(
            count=Count('emoji')
        ).order_by('-count')
        
        result = []
        for item in summary:
            reaction_users = obj.reactions.filter(emoji=item['emoji']).select_related('user')
            item_data = {
                'emoji': item['emoji'],
                'count': item['count'],
                'users': [r.user.get_full_name() or r.user.email for r in reaction_users[:3]],
                'has_reacted': False
            }
            
            if user:
                item_data['has_reacted'] = reaction_users.filter(user=user).exists()
            
            result.append(item_data)
        
        return result
    
    def get_can_edit(self, obj):
        """Check if current user can edit this message."""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        # Only sender can edit within 15 minutes
        if obj.sender != request.user:
            return False
        
        from django.utils import timezone
        time_since = timezone.now() - obj.created_at
        return time_since.total_seconds() <= 900  # 15 minutes
    
    def get_can_delete(self, obj):
        """Check if current user can delete this message."""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        return obj.sender == request.user or request.user.is_staff


class ConversationSerializer(serializers.ModelSerializer):
    participant1 = UserSerializer(read_only=True)
    participant2 = UserSerializer(read_only=True)
    property = PropertyListSerializer(read_only=True)
    last_message_by = UserSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    is_archived = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'property', 'participant1', 'participant2',
            'created_at', 'updated_at', 'last_message', 
            'last_message_at', 'last_message_by',
            'unread_count', 'other_participant', 'is_archived'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.get_unread_count(request.user)
        return 0
    
    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.get_other_participant(request.user)
            if other:
                return UserSerializer(other).data
        return None
    
    def get_is_archived(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.is_archived_for(request.user)
        return False
    
    def to_representation(self, instance):
        """Override to ensure last_message data is always populated."""
        data = super().to_representation(instance)
        
        # If last_message is empty but conversation has messages, populate it
        if not data.get('last_message') and instance.messages.exists():
            latest_message = instance.messages.filter(
                is_system_message=False
            ).order_by('-created_at').first()
            
            if latest_message:
                # Update the data to include last message info
                data['last_message'] = latest_message.content[:100]
                data['last_message_at'] = latest_message.created_at.isoformat()
                data['last_message_by'] = UserSerializer(latest_message.sender).data
                
                # Also update the model instance for future requests
                instance.last_message = latest_message.content[:100]
                instance.last_message_at = latest_message.created_at
                instance.last_message_by = latest_message.sender
                instance.save(update_fields=[
                    'last_message', 'last_message_at', 'last_message_by'
                ])
        
        return data


class ConversationDetailSerializer(ConversationSerializer):
    messages = serializers.SerializerMethodField()
    
    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ['messages']
    
    def get_messages(self, obj):
        # Get last 50 messages by default
        messages = obj.messages.all().order_by('-created_at')[:50]
        return MessageSerializer(messages, many=True).data


class CreateMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['content']
    
    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        return value.strip()


class EditMessageSerializer(serializers.Serializer):
    """Serializer for editing a message."""
    content = serializers.CharField(min_length=1, max_length=5000)
    
    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        return value.strip()


class AddReactionSerializer(serializers.Serializer):
    """Serializer for adding a reaction."""
    emoji = serializers.CharField(max_length=10)
    
    def validate_emoji(self, value):
        # Basic emoji validation
        if not value or len(value) > 10:
            raise serializers.ValidationError("Invalid emoji.")
        return value


class StartConversationSerializer(serializers.Serializer):
    recipient_id = serializers.UUIDField()
    property_id = serializers.UUIDField(required=False, allow_null=True)
    message = serializers.CharField(min_length=1, max_length=5000)
    
    def validate_recipient_id(self, value):
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Recipient not found.")
        return value
    
    def validate(self, data):
        request = self.context.get('request')
        if request and str(request.user.id) == str(data['recipient_id']):
            raise serializers.ValidationError("You cannot start a conversation with yourself.")
        return data
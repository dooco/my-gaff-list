from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message, MessageAttachment
from apps.core.serializers import PropertyListSerializer
from apps.users.serializers import UserSerializer

User = get_user_model()


class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = ['id', 'filename', 'file_size', 'mime_type', 'uploaded_at', 'file']
        read_only_fields = ['id', 'uploaded_at']


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'content', 
            'created_at', 'edited_at', 'is_edited', 
            'is_read', 'read_at', 'is_system_message',
            'attachments'
        ]
        read_only_fields = [
            'id', 'conversation', 'sender', 'created_at', 
            'edited_at', 'is_edited', 'read_at'
        ]


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
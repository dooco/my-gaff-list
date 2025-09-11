import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from rest_framework.test import APIRequestFactory

from apps.core.models import Property, Landlord, County, Town
from apps.messaging.models import Conversation, Message, MessageReaction, MessageAttachment
from apps.messaging.serializers import (
    MessageReactionSerializer,
    ReactionSummarySerializer,
    MessageAttachmentSerializer,
    MessageSerializer,
    ConversationSerializer,
    ConversationDetailSerializer,
    CreateMessageSerializer,
    StartConversationSerializer
)

User = get_user_model()


@pytest.mark.django_db
class TestMessageReactionSerializer:
    """Test suite for MessageReactionSerializer"""
    
    @pytest.fixture
    def reaction_setup(self):
        """Setup reaction test data"""
        user1 = User.objects.create_user(
            username='reactor',
            email='reactor@test.com',
            first_name='React',
            last_name='User'
        )
        user2 = User.objects.create_user(
            username='sender',
            email='sender@test.com'
        )
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        message = Message.objects.create(
            conversation=conversation,
            sender=user2,
            content='React to this!'
        )
        
        reaction = MessageReaction.objects.create(
            message=message,
            user=user1,
            emoji='👍'
        )
        
        return {
            'user': user1,
            'message': message,
            'reaction': reaction
        }
    
    def test_serialize_reaction(self, reaction_setup):
        """Test serializing a message reaction"""
        serializer = MessageReactionSerializer(reaction_setup['reaction'])
        data = serializer.data
        
        assert 'id' in data
        assert 'user' in data
        assert 'emoji' in data
        assert 'created_at' in data
        
        # Check user details are included
        assert data['user']['email'] == 'reactor@test.com'
        assert data['emoji'] == '👍'
    
    def test_read_only_fields(self, reaction_setup):
        """Test that id and created_at are read-only"""
        data = {
            'id': 'new-id',
            'emoji': '❤️',
            'created_at': timezone.now()
        }
        
        serializer = MessageReactionSerializer(reaction_setup['reaction'], data=data, partial=True)
        assert serializer.is_valid()
        
        # Save and check that read-only fields weren't changed
        serializer.save()
        reaction_setup['reaction'].refresh_from_db()
        
        # ID should not change
        assert str(reaction_setup['reaction'].id) != 'new-id'
        # Emoji should change
        assert reaction_setup['reaction'].emoji == '❤️'


@pytest.mark.django_db
class TestReactionSummarySerializer:
    """Test suite for ReactionSummarySerializer"""
    
    def test_serialize_summary(self):
        """Test serializing reaction summary data"""
        data = {
            'emoji': '👍',
            'count': 5,
            'users': ['John Doe', 'Jane Smith', 'Bob Wilson'],
            'has_reacted': True
        }
        
        serializer = ReactionSummarySerializer(data=data)
        assert serializer.is_valid()
        
        validated_data = serializer.validated_data
        assert validated_data['emoji'] == '👍'
        assert validated_data['count'] == 5
        assert len(validated_data['users']) == 3
        assert validated_data['has_reacted'] is True
    
    def test_optional_fields(self):
        """Test that users and has_reacted are optional"""
        data = {
            'emoji': '❤️',
            'count': 2
        }
        
        serializer = ReactionSummarySerializer(data=data)
        assert serializer.is_valid()
        
        validated_data = serializer.validated_data
        assert 'users' not in validated_data
        assert 'has_reacted' not in validated_data


@pytest.mark.django_db
class TestMessageAttachmentSerializer:
    """Test suite for MessageAttachmentSerializer"""
    
    @pytest.fixture
    def attachment(self):
        """Create test attachment"""
        user = User.objects.create_user('user', 'user@test.com')
        conversation = Conversation.objects.create(
            participant1=user,
            participant2=User.objects.create_user('user2', 'user2@test.com')
        )
        message = Message.objects.create(
            conversation=conversation,
            sender=user,
            content='Message'
        )
        
        return MessageAttachment.objects.create(
            message=message,
            filename='document.pdf',
            file_size=1024000,
            mime_type='application/pdf'
        )
    
    def test_serialize_attachment(self, attachment):
        """Test serializing an attachment"""
        serializer = MessageAttachmentSerializer(attachment)
        data = serializer.data
        
        assert 'id' in data
        assert 'filename' in data
        assert 'file_size' in data
        assert 'mime_type' in data
        assert 'uploaded_at' in data
        assert 'file' in data
        
        assert data['filename'] == 'document.pdf'
        assert data['file_size'] == 1024000
        assert data['mime_type'] == 'application/pdf'


@pytest.mark.django_db
class TestMessageSerializer:
    """Test suite for MessageSerializer"""
    
    @pytest.fixture
    def message_setup(self):
        """Setup message test data"""
        user1 = User.objects.create_user(
            username='sender',
            email='sender@test.com',
            first_name='Send',
            last_name='User'
        )
        user2 = User.objects.create_user(
            username='receiver',
            email='receiver@test.com'
        )
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        message = Message.objects.create(
            conversation=conversation,
            sender=user1,
            content='Test message content'
        )
        
        # Add reactions
        MessageReaction.objects.create(
            message=message,
            user=user1,
            emoji='👍'
        )
        MessageReaction.objects.create(
            message=message,
            user=user2,
            emoji='👍'
        )
        MessageReaction.objects.create(
            message=message,
            user=user2,
            emoji='❤️'
        )
        
        # Add attachment
        MessageAttachment.objects.create(
            message=message,
            filename='test.txt',
            file_size=1000,
            mime_type='text/plain'
        )
        
        return {
            'user1': user1,
            'user2': user2,
            'conversation': conversation,
            'message': message
        }
    
    def test_serialize_message(self, message_setup):
        """Test serializing a message"""
        request = APIRequestFactory().get('/')
        request.user = message_setup['user1']
        
        serializer = MessageSerializer(message_setup['message'], context={'request': request})
        data = serializer.data
        
        # Check all fields are present
        assert 'id' in data
        assert 'conversation' in data
        assert 'sender' in data
        assert 'content' in data
        assert 'created_at' in data
        assert 'edited_at' in data
        assert 'is_edited' in data
        assert 'is_read' in data
        assert 'read_at' in data
        assert 'is_system_message' in data
        assert 'attachments' in data
        assert 'reactions' in data
        assert 'reaction_summary' in data
        assert 'is_deleted' in data
        assert 'can_edit' in data
        assert 'can_delete' in data
        
        # Check values
        assert data['content'] == 'Test message content'
        assert data['sender']['email'] == 'sender@test.com'
        assert data['is_edited'] is False
        assert data['is_read'] is False
        assert data['is_system_message'] is False
        assert data['is_deleted'] is False
        
        # Check attachments
        assert len(data['attachments']) == 1
        assert data['attachments'][0]['filename'] == 'test.txt'
        
        # Check reactions
        assert len(data['reactions']) == 3
        
        # Check reaction summary
        assert len(data['reaction_summary']) == 2
        thumbs_up = next(r for r in data['reaction_summary'] if r['emoji'] == '👍')
        assert thumbs_up['count'] == 2
        assert thumbs_up['has_reacted'] is True
    
    def test_can_edit_permission(self, message_setup):
        """Test can_edit permission logic"""
        # Test as sender within time limit
        request = APIRequestFactory().get('/')
        request.user = message_setup['user1']
        
        serializer = MessageSerializer(message_setup['message'], context={'request': request})
        data = serializer.data
        
        assert data['can_edit'] is True
        
        # Test as non-sender
        request.user = message_setup['user2']
        serializer = MessageSerializer(message_setup['message'], context={'request': request})
        data = serializer.data
        
        assert data['can_edit'] is False
        
        # Test after time limit
        message_setup['message'].created_at = timezone.now() - timedelta(minutes=20)
        message_setup['message'].save()
        
        request.user = message_setup['user1']
        serializer = MessageSerializer(message_setup['message'], context={'request': request})
        data = serializer.data
        
        assert data['can_edit'] is False
    
    def test_can_delete_permission(self, message_setup):
        """Test can_delete permission logic"""
        # Test as sender
        request = APIRequestFactory().get('/')
        request.user = message_setup['user1']
        
        serializer = MessageSerializer(message_setup['message'], context={'request': request})
        data = serializer.data
        
        assert data['can_delete'] is True
        
        # Test as non-sender
        request.user = message_setup['user2']
        serializer = MessageSerializer(message_setup['message'], context={'request': request})
        data = serializer.data
        
        assert data['can_delete'] is False
        
        # Test as staff
        staff_user = User.objects.create_user(
            username='staff',
            email='staff@test.com',
            is_staff=True
        )
        request.user = staff_user
        serializer = MessageSerializer(message_setup['message'], context={'request': request})
        data = serializer.data
        
        assert data['can_delete'] is True
    
    def test_deleted_message_serialization(self, message_setup):
        """Test serialization of deleted message"""
        message_setup['message'].soft_delete(message_setup['user1'])
        
        request = APIRequestFactory().get('/')
        request.user = message_setup['user1']
        
        serializer = MessageSerializer(message_setup['message'], context={'request': request})
        data = serializer.data
        
        assert data['is_deleted'] is True
        assert data['deleted_at'] is not None
        assert data['deletion_type'] == 'soft'


@pytest.mark.django_db
class TestConversationSerializer:
    """Test suite for ConversationSerializer"""
    
    @pytest.fixture
    def conversation_setup(self):
        """Setup conversation test data"""
        county = County.objects.create(name='Dublin')
        town = Town.objects.create(name='Dublin City', county=county)
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
        
        property = Property.objects.create(
            title='Test Property',
            landlord=landlord,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent=Decimal('1200.00'),
            address='123 Test Street',
            county=county,
            town=town
        )
        
        user1 = User.objects.create_user(
            username='user1',
            email='user1@test.com',
            first_name='John',
            last_name='Doe'
        )
        user2 = User.objects.create_user(
            username='user2',
            email='user2@test.com',
            first_name='Jane',
            last_name='Smith'
        )
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2,
            property=property
        )
        
        # Add messages
        Message.objects.create(
            conversation=conversation,
            sender=user1,
            content='Hello!'
        )
        Message.objects.create(
            conversation=conversation,
            sender=user2,
            content='Hi there!'
        )
        
        return {
            'user1': user1,
            'user2': user2,
            'property': property,
            'conversation': conversation
        }
    
    def test_serialize_conversation(self, conversation_setup):
        """Test serializing a conversation"""
        request = APIRequestFactory().get('/')
        request.user = conversation_setup['user1']
        
        serializer = ConversationSerializer(
            conversation_setup['conversation'],
            context={'request': request}
        )
        data = serializer.data
        
        assert 'id' in data
        assert 'property' in data
        assert 'participant1' in data
        assert 'participant2' in data
        assert 'last_message' in data
        assert 'last_message_at' in data
        assert 'last_message_by' in data
        assert 'created_at' in data
        assert 'updated_at' in data
        
        # Check property details
        assert data['property']['title'] == 'Test Property'
        
        # Check participants
        assert data['participant1']['email'] == 'user1@test.com'
        assert data['participant2']['email'] == 'user2@test.com'
        
        # Check last message info
        assert data['last_message'] == 'Hi there!'


@pytest.mark.django_db
class TestConversationDetailSerializer:
    """Test suite for ConversationDetailSerializer"""
    
    @pytest.fixture
    def conversation_detail_setup(self):
        """Setup conversation with messages"""
        user1 = User.objects.create_user('user1', 'user1@test.com')
        user2 = User.objects.create_user('user2', 'user2@test.com')
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        # Add messages
        Message.objects.create(
            conversation=conversation,
            sender=user1,
            content='First message'
        )
        Message.objects.create(
            conversation=conversation,
            sender=user2,
            content='Reply message'
        )
        
        return {
            'user1': user1,
            'user2': user2,
            'conversation': conversation
        }
    
    def test_serialize_conversation_detail(self, conversation_detail_setup):
        """Test serializing conversation with messages"""
        request = APIRequestFactory().get('/')
        request.user = conversation_detail_setup['user1']
        
        serializer = ConversationDetailSerializer(
            conversation_detail_setup['conversation'],
            context={'request': request}
        )
        data = serializer.data
        
        assert 'id' in data
        assert 'participant1' in data
        assert 'participant2' in data
        assert 'messages' in data
        
        # Check messages are included
        assert len(data['messages']) == 2
        assert data['messages'][0]['content'] == 'First message'
        assert data['messages'][1]['content'] == 'Reply message'


@pytest.mark.django_db
class TestCreateMessageSerializer:
    """Test suite for CreateMessageSerializer"""
    
    @pytest.fixture
    def create_setup(self):
        """Setup for message creation"""
        user1 = User.objects.create_user('sender', 'sender@test.com')
        user2 = User.objects.create_user('receiver', 'receiver@test.com')
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        return {
            'sender': user1,
            'receiver': user2,
            'conversation': conversation
        }
    
    def test_create_message(self, create_setup):
        """Test creating a message through serializer"""
        data = {
            'content': 'New message content',
            'is_system_message': False
        }
        
        serializer = CreateMessageSerializer(data=data)
        assert serializer.is_valid()
        
        message = serializer.save(
            conversation=create_setup['conversation'],
            sender=create_setup['sender']
        )
        
        assert message.content == 'New message content'
        assert message.conversation == create_setup['conversation']
        assert message.sender == create_setup['sender']
        assert message.is_system_message is False
    
    def test_content_required(self):
        """Test that content is required"""
        data = {
            'is_system_message': False
        }
        
        serializer = CreateMessageSerializer(data=data)
        assert not serializer.is_valid()
        assert 'content' in serializer.errors
    
    def test_system_message_creation(self, create_setup):
        """Test creating a system message"""
        data = {
            'content': 'User joined the conversation',
            'is_system_message': True
        }
        
        serializer = CreateMessageSerializer(data=data)
        assert serializer.is_valid()
        
        message = serializer.save(
            conversation=create_setup['conversation'],
            sender=create_setup['sender']
        )
        
        assert message.is_system_message is True
import pytest
import json
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import Property, Landlord, County, Town
from apps.messaging.models import Conversation, Message, MessageReaction

User = get_user_model()


@pytest.mark.django_db
class TestConversationViewSet:
    """Test suite for ConversationViewSet"""
    
    @pytest.fixture
    def authenticated_users(self):
        """Create authenticated users"""
        user1 = User.objects.create_user(
            username='user1',
            email='user1@test.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        user2 = User.objects.create_user(
            username='user2',
            email='user2@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith'
        )
        
        # Create authenticated clients
        client1 = APIClient()
        refresh1 = RefreshToken.for_user(user1)
        client1.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh1.access_token}')
        
        client2 = APIClient()
        refresh2 = RefreshToken.for_user(user2)
        client2.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh2.access_token}')
        
        return {
            'user1': user1,
            'user2': user2,
            'client1': client1,
            'client2': client2
        }
    
    @pytest.fixture
    def property(self):
        """Create a test property"""
        county = County.objects.create(name='Dublin')
        town = Town.objects.create(name='Dublin City', county=county)
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
        
        return Property.objects.create(
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
    
    def test_list_conversations(self, authenticated_users):
        """Test listing user's conversations"""
        # Create conversations
        conv1 = Conversation.objects.create(
            participant1=authenticated_users['user1'],
            participant2=authenticated_users['user2']
        )
        
        # Add a message to make it appear in list
        Message.objects.create(
            conversation=conv1,
            sender=authenticated_users['user1'],
            content='Hello'
        )
        
        # Create another conversation with different user
        user3 = User.objects.create_user('user3', 'user3@test.com')
        conv2 = Conversation.objects.create(
            participant1=authenticated_users['user1'],
            participant2=user3
        )
        Message.objects.create(
            conversation=conv2,
            sender=user3,
            content='Hi there'
        )
        
        # User1 should see both conversations
        response = authenticated_users['client1'].get('/api/messaging/conversations/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
        
        # User2 should see only conv1
        response = authenticated_users['client2'].get('/api/messaging/conversations/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
    
    def test_retrieve_conversation(self, authenticated_users):
        """Test retrieving a specific conversation"""
        conv = Conversation.objects.create(
            participant1=authenticated_users['user1'],
            participant2=authenticated_users['user2']
        )
        
        # Add messages
        for i in range(3):
            Message.objects.create(
                conversation=conv,
                sender=authenticated_users['user1'] if i % 2 == 0 else authenticated_users['user2'],
                content=f'Message {i}'
            )
        
        response = authenticated_users['client1'].get(f'/api/messaging/conversations/{conv.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'messages' in response.data
        assert len(response.data['messages']) == 3
    
    def test_start_conversation(self, authenticated_users, property):
        """Test starting a new conversation"""
        data = {
            'participant2': authenticated_users['user2'].id,
            'property': property.id,
            'initial_message': 'Hello, I am interested in your property'
        }
        
        response = authenticated_users['client1'].post(
            '/api/messaging/conversations/start/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'id' in response.data
        
        # Verify conversation was created
        conv = Conversation.objects.get(id=response.data['id'])
        assert conv.participant1 in [authenticated_users['user1'], authenticated_users['user2']]
        assert conv.participant2 in [authenticated_users['user1'], authenticated_users['user2']]
        assert conv.property == property
        
        # Verify initial message was created
        messages = conv.messages.all()
        assert len(messages) == 1
        assert messages[0].content == 'Hello, I am interested in your property'
    
    def test_cannot_start_duplicate_conversation(self, authenticated_users, property):
        """Test that duplicate conversations are not created"""
        # Create existing conversation
        conv = Conversation.objects.create(
            participant1=authenticated_users['user1'],
            participant2=authenticated_users['user2'],
            property=property
        )
        
        # Try to start another
        data = {
            'participant2': authenticated_users['user2'].id,
            'property': property.id,
            'initial_message': 'Another message'
        }
        
        response = authenticated_users['client1'].post(
            '/api/messaging/conversations/start/',
            data,
            format='json'
        )
        
        # Should return existing conversation
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(conv.id)
    
    def test_mark_conversation_as_read(self, authenticated_users):
        """Test marking a conversation as read"""
        conv = Conversation.objects.create(
            participant1=authenticated_users['user1'],
            participant2=authenticated_users['user2']
        )
        
        # Add unread messages
        Message.objects.create(
            conversation=conv,
            sender=authenticated_users['user2'],
            content='Unread message'
        )
        
        response = authenticated_users['client1'].post(
            f'/api/messaging/conversations/{conv.id}/mark_read/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        conv.refresh_from_db()
        assert conv.participant1_last_read is not None
    
    def test_archive_conversation(self, authenticated_users):
        """Test archiving a conversation"""
        conv = Conversation.objects.create(
            participant1=authenticated_users['user1'],
            participant2=authenticated_users['user2']
        )
        
        response = authenticated_users['client1'].post(
            f'/api/messaging/conversations/{conv.id}/archive/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        conv.refresh_from_db()
        assert conv.participant1_archived is True
        assert conv.participant2_archived is False
    
    def test_unarchive_conversation(self, authenticated_users):
        """Test unarchiving a conversation"""
        conv = Conversation.objects.create(
            participant1=authenticated_users['user1'],
            participant2=authenticated_users['user2'],
            participant1_archived=True
        )
        
        response = authenticated_users['client1'].post(
            f'/api/messaging/conversations/{conv.id}/unarchive/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        conv.refresh_from_db()
        assert conv.participant1_archived is False
    
    def test_block_conversation(self, authenticated_users):
        """Test blocking a conversation"""
        conv = Conversation.objects.create(
            participant1=authenticated_users['user1'],
            participant2=authenticated_users['user2']
        )
        
        response = authenticated_users['client1'].post(
            f'/api/messaging/conversations/{conv.id}/block/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        conv.refresh_from_db()
        assert conv.participant1_blocked is True
        assert conv.participant2_blocked is False
    
    def test_conversation_requires_authentication(self):
        """Test that conversations require authentication"""
        client = APIClient()
        response = client.get('/api/messaging/conversations/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_cannot_access_other_users_conversation(self, authenticated_users):
        """Test that users cannot access conversations they're not part of"""
        user3 = User.objects.create_user('user3', 'user3@test.com')
        user4 = User.objects.create_user('user4', 'user4@test.com')
        
        conv = Conversation.objects.create(
            participant1=user3,
            participant2=user4
        )
        
        response = authenticated_users['client1'].get(f'/api/messaging/conversations/{conv.id}/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestMessageViewSet:
    """Test suite for MessageViewSet"""
    
    @pytest.fixture
    def message_setup(self):
        """Setup for message tests"""
        user1 = User.objects.create_user('user1', 'user1@test.com')
        user2 = User.objects.create_user('user2', 'user2@test.com')
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        client1 = APIClient()
        refresh1 = RefreshToken.for_user(user1)
        client1.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh1.access_token}')
        
        client2 = APIClient()
        refresh2 = RefreshToken.for_user(user2)
        client2.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh2.access_token}')
        
        return {
            'user1': user1,
            'user2': user2,
            'conversation': conversation,
            'client1': client1,
            'client2': client2
        }
    
    def test_send_message(self, message_setup):
        """Test sending a message"""
        data = {
            'conversation': message_setup['conversation'].id,
            'content': 'Test message content'
        }
        
        response = message_setup['client1'].post(
            '/api/messaging/messages/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['content'] == 'Test message content'
        assert response.data['sender']['email'] == 'user1@test.com'
        
        # Verify message was created
        message = Message.objects.get(id=response.data['id'])
        assert message.content == 'Test message content'
        assert message.sender == message_setup['user1']
    
    def test_list_messages_in_conversation(self, message_setup):
        """Test listing messages in a conversation"""
        # Create multiple messages
        for i in range(5):
            Message.objects.create(
                conversation=message_setup['conversation'],
                sender=message_setup['user1'] if i % 2 == 0 else message_setup['user2'],
                content=f'Message {i}'
            )
        
        response = message_setup['client1'].get(
            f'/api/messaging/messages/?conversation={message_setup["conversation"].id}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 5
    
    def test_edit_message(self, message_setup):
        """Test editing a message"""
        message = Message.objects.create(
            conversation=message_setup['conversation'],
            sender=message_setup['user1'],
            content='Original content'
        )
        
        data = {'content': 'Edited content'}
        
        response = message_setup['client1'].patch(
            f'/api/messaging/messages/{message.id}/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['content'] == 'Edited content'
        assert response.data['is_edited'] is True
        
        message.refresh_from_db()
        assert message.content == 'Edited content'
        assert message.original_content == 'Original content'
    
    def test_cannot_edit_others_message(self, message_setup):
        """Test that users cannot edit others' messages"""
        message = Message.objects.create(
            conversation=message_setup['conversation'],
            sender=message_setup['user1'],
            content='User1 message'
        )
        
        data = {'content': 'Hacked content'}
        
        response = message_setup['client2'].patch(
            f'/api/messaging/messages/{message.id}/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        message.refresh_from_db()
        assert message.content == 'User1 message'
    
    def test_cannot_edit_after_time_limit(self, message_setup):
        """Test that messages cannot be edited after 15 minutes"""
        message = Message.objects.create(
            conversation=message_setup['conversation'],
            sender=message_setup['user1'],
            content='Old message'
        )
        
        # Manually set created_at to 20 minutes ago
        message.created_at = timezone.now() - timedelta(minutes=20)
        message.save()
        
        data = {'content': 'Too late to edit'}
        
        response = message_setup['client1'].patch(
            f'/api/messaging/messages/{message.id}/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_delete_message(self, message_setup):
        """Test soft deleting a message"""
        message = Message.objects.create(
            conversation=message_setup['conversation'],
            sender=message_setup['user1'],
            content='To be deleted'
        )
        
        response = message_setup['client1'].delete(
            f'/api/messaging/messages/{message.id}/'
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        message.refresh_from_db()
        assert message.is_deleted is True
        assert message.deleted_by == message_setup['user1']
    
    def test_cannot_delete_others_message(self, message_setup):
        """Test that users cannot delete others' messages"""
        message = Message.objects.create(
            conversation=message_setup['conversation'],
            sender=message_setup['user1'],
            content='Protected message'
        )
        
        response = message_setup['client2'].delete(
            f'/api/messaging/messages/{message.id}/'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        message.refresh_from_db()
        assert message.is_deleted is False
    
    def test_mark_message_as_read(self, message_setup):
        """Test marking a message as read"""
        message = Message.objects.create(
            conversation=message_setup['conversation'],
            sender=message_setup['user1'],
            content='Unread message'
        )
        
        response = message_setup['client2'].post(
            f'/api/messaging/messages/{message.id}/mark_read/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        message.refresh_from_db()
        assert message.is_read is True
        assert message.read_at is not None
    
    def test_add_reaction(self, message_setup):
        """Test adding a reaction to a message"""
        message = Message.objects.create(
            conversation=message_setup['conversation'],
            sender=message_setup['user1'],
            content='React to this!'
        )
        
        data = {'emoji': '👍'}
        
        response = message_setup['client2'].post(
            f'/api/messaging/messages/{message.id}/react/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify reaction was created
        assert message.reactions.filter(user=message_setup['user2'], emoji='👍').exists()
    
    def test_remove_reaction(self, message_setup):
        """Test removing a reaction from a message"""
        message = Message.objects.create(
            conversation=message_setup['conversation'],
            sender=message_setup['user1'],
            content='Remove reaction'
        )
        
        # Add reaction
        MessageReaction.objects.create(
            message=message,
            user=message_setup['user2'],
            emoji='❤️'
        )
        
        data = {'emoji': '❤️'}
        
        response = message_setup['client2'].delete(
            f'/api/messaging/messages/{message.id}/unreact/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify reaction was removed
        assert not message.reactions.filter(user=message_setup['user2'], emoji='❤️').exists()
    
    def test_message_pagination(self, message_setup):
        """Test message pagination"""
        # Create many messages
        for i in range(60):
            Message.objects.create(
                conversation=message_setup['conversation'],
                sender=message_setup['user1'] if i % 2 == 0 else message_setup['user2'],
                content=f'Message {i}'
            )
        
        # First page
        response = message_setup['client1'].get(
            f'/api/messaging/messages/?conversation={message_setup["conversation"].id}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 50  # Default page size
        assert 'next' in response.data
        assert response.data['count'] == 60
        
        # Second page
        response = message_setup['client1'].get(response.data['next'])
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 10  # Remaining messages


@pytest.mark.django_db
class TestMessageSearch:
    """Test suite for message search functionality"""
    
    @pytest.fixture
    def search_setup(self):
        """Setup for search tests"""
        user1 = User.objects.create_user('user1', 'user1@test.com')
        user2 = User.objects.create_user('user2', 'user2@test.com')
        
        conv1 = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        # Create messages with different content
        Message.objects.create(
            conversation=conv1,
            sender=user1,
            content='Python programming is fun'
        )
        Message.objects.create(
            conversation=conv1,
            sender=user2,
            content='I prefer JavaScript'
        )
        Message.objects.create(
            conversation=conv1,
            sender=user1,
            content='Python has great libraries'
        )
        
        # Create another conversation
        user3 = User.objects.create_user('user3', 'user3@test.com')
        conv2 = Conversation.objects.create(
            participant1=user1,
            participant2=user3
        )
        
        Message.objects.create(
            conversation=conv2,
            sender=user3,
            content='Let us discuss Django'
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user1)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        return {
            'user1': user1,
            'conv1': conv1,
            'conv2': conv2,
            'client': client
        }
    
    def test_search_messages(self, search_setup):
        """Test searching messages"""
        response = search_setup['client'].get(
            '/api/messaging/messages/search/?q=Python'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
        
        # All results should contain 'Python'
        for message in response.data['results']:
            assert 'Python' in message['content']
    
    def test_search_within_conversation(self, search_setup):
        """Test searching within a specific conversation"""
        response = search_setup['client'].get(
            f'/api/messaging/messages/search/?q=JavaScript&conversation={search_setup["conv1"].id}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'JavaScript' in response.data['results'][0]['content']
    
    def test_search_no_results(self, search_setup):
        """Test search with no results"""
        response = search_setup['client'].get(
            '/api/messaging/messages/search/?q=Rust'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 0
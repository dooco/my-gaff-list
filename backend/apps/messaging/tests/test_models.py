import pytest
import uuid
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from apps.core.models import Property, Landlord, County, Town
from apps.messaging.models import Conversation, Message, MessageReaction, MessageAttachment

User = get_user_model()


@pytest.mark.django_db
class TestConversation:
    """Test suite for Conversation model"""
    
    @pytest.fixture
    def users(self):
        """Create test users"""
        user1 = User.objects.create_user(
            username='user1',
            email='user1@test.com',
            password='testpass123'
        )
        user2 = User.objects.create_user(
            username='user2',
            email='user2@test.com',
            password='testpass123'
        )
        return user1, user2
    
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
    
    @pytest.fixture
    def conversation(self, users, property):
        """Create a test conversation"""
        user1, user2 = users
        return Conversation.objects.create(
            participant1=user1,
            participant2=user2,
            property=property
        )
    
    def test_create_conversation(self, users, property):
        """Test creating a conversation"""
        user1, user2 = users
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2,
            property=property
        )
        
        assert conversation.participant1 == user1
        assert conversation.participant2 == user2
        assert conversation.property == property
        assert conversation.last_message == ''
        assert conversation.last_message_at is None
        assert conversation.participant1_archived is False
        assert conversation.participant2_archived is False
        assert conversation.participant1_blocked is False
        assert conversation.participant2_blocked is False
    
    def test_conversation_without_property(self, users):
        """Test creating a conversation without a property"""
        user1, user2 = users
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        assert conversation.property is None
        assert conversation.participant1 == user1
        assert conversation.participant2 == user2
    
    def test_conversation_str_with_property(self, conversation):
        """Test string representation with property"""
        expected = f"Conversation about {conversation.property.title}"
        assert str(conversation) == expected
    
    def test_conversation_str_without_property(self, users):
        """Test string representation without property"""
        user1, user2 = users
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        expected = f"Conversation between {user1.email} and {user2.email}"
        assert str(conversation) == expected
    
    def test_unique_together_constraint(self, users, property):
        """Test unique together constraint for participants and property"""
        user1, user2 = users
        
        # Create first conversation
        Conversation.objects.create(
            participant1=user1,
            participant2=user2,
            property=property
        )
        
        # Attempt to create duplicate should fail
        with pytest.raises(IntegrityError):
            Conversation.objects.create(
                participant1=user1,
                participant2=user2,
                property=property
            )
    
    def test_get_other_participant(self, conversation, users):
        """Test getting the other participant"""
        user1, user2 = users
        
        assert conversation.get_other_participant(user1) == user2
        assert conversation.get_other_participant(user2) == user1
        
        # Test with non-participant
        user3 = User.objects.create_user(
            username='user3',
            email='user3@test.com'
        )
        assert conversation.get_other_participant(user3) is None
    
    def test_mark_as_read(self, conversation, users):
        """Test marking conversation as read"""
        user1, user2 = users
        
        # Initially no read timestamps
        assert conversation.participant1_last_read is None
        assert conversation.participant2_last_read is None
        
        # Mark as read for user1
        conversation.mark_as_read(user1)
        conversation.refresh_from_db()
        
        assert conversation.participant1_last_read is not None
        assert conversation.participant2_last_read is None
        
        # Mark as read for user2
        conversation.mark_as_read(user2)
        conversation.refresh_from_db()
        
        assert conversation.participant1_last_read is not None
        assert conversation.participant2_last_read is not None
    
    def test_get_unread_count(self, conversation, users):
        """Test getting unread message count"""
        user1, user2 = users
        
        # Initially no messages
        assert conversation.get_unread_count(user1) == 0
        assert conversation.get_unread_count(user2) == 0
        
        # Add messages from user1
        for i in range(3):
            Message.objects.create(
                conversation=conversation,
                sender=user1,
                content=f'Message {i}'
            )
        
        # User2 should have 3 unread
        assert conversation.get_unread_count(user2) == 3
        # User1 should have 0 (can't have unread own messages)
        assert conversation.get_unread_count(user1) == 0
        
        # Mark as read for user2
        conversation.mark_as_read(user2)
        assert conversation.get_unread_count(user2) == 0
        
        # Add more messages from user1
        Message.objects.create(
            conversation=conversation,
            sender=user1,
            content='New message'
        )
        
        # User2 should have 1 unread
        assert conversation.get_unread_count(user2) == 1
    
    def test_archive_unarchive(self, conversation, users):
        """Test archiving and unarchiving conversation"""
        user1, user2 = users
        
        # Initially not archived
        assert conversation.is_archived_for(user1) is False
        assert conversation.is_archived_for(user2) is False
        
        # Archive for user1
        conversation.archive_for(user1)
        conversation.refresh_from_db()
        
        assert conversation.is_archived_for(user1) is True
        assert conversation.is_archived_for(user2) is False
        assert conversation.participant1_archived is True
        assert conversation.participant2_archived is False
        
        # Unarchive for user1
        conversation.unarchive_for(user1)
        conversation.refresh_from_db()
        
        assert conversation.is_archived_for(user1) is False
        assert conversation.participant1_archived is False
    
    def test_block_status(self, conversation, users):
        """Test block status checking"""
        user1, user2 = users
        
        # Initially not blocked
        assert conversation.is_blocked_by(user1) is False
        assert conversation.is_blocked_by(user2) is False
        
        # Block by user1
        conversation.participant1_blocked = True
        conversation.save()
        
        assert conversation.is_blocked_by(user1) is True
        assert conversation.is_blocked_by(user2) is False
    
    def test_last_message_update(self, conversation, users):
        """Test that last message info is updated when messages are added"""
        user1, user2 = users
        
        # Create a message
        message = Message.objects.create(
            conversation=conversation,
            sender=user1,
            content='Hello, this is a test message!'
        )
        
        conversation.refresh_from_db()
        assert conversation.last_message == 'Hello, this is a test message!'
        assert conversation.last_message_at == message.created_at
        assert conversation.last_message_by == user1
    
    def test_ordering(self, users):
        """Test default ordering by last message date"""
        user1, user2 = users
        
        # Create conversations with different last message times
        conv1 = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        conv2 = Conversation.objects.create(
            participant1=user1,
            participant2=User.objects.create_user('user3', 'user3@test.com')
        )
        
        conv3 = Conversation.objects.create(
            participant1=user1,
            participant2=User.objects.create_user('user4', 'user4@test.com')
        )
        
        # Add messages with different timestamps
        Message.objects.create(
            conversation=conv1,
            sender=user1,
            content='Old message'
        )
        
        # Wait a moment
        import time
        time.sleep(0.01)
        
        Message.objects.create(
            conversation=conv2,
            sender=user1,
            content='Recent message'
        )
        
        time.sleep(0.01)
        
        Message.objects.create(
            conversation=conv3,
            sender=user1,
            content='Latest message'
        )
        
        # Check ordering (most recent first)
        conversations = list(Conversation.objects.all())
        assert conversations[0] == conv3
        assert conversations[1] == conv2
        assert conversations[2] == conv1


@pytest.mark.django_db
class TestMessage:
    """Test suite for Message model"""
    
    @pytest.fixture
    def conversation_setup(self):
        """Setup conversation and users"""
        user1 = User.objects.create_user(
            username='sender',
            email='sender@test.com'
        )
        user2 = User.objects.create_user(
            username='receiver',
            email='receiver@test.com'
        )
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        return {
            'user1': user1,
            'user2': user2,
            'conversation': conversation
        }
    
    def test_create_message(self, conversation_setup):
        """Test creating a message"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='Hello, this is a test message!'
        )
        
        assert message.conversation == conversation_setup['conversation']
        assert message.sender == conversation_setup['user1']
        assert message.content == 'Hello, this is a test message!'
        assert message.is_read is False
        assert message.read_at is None
        assert message.is_system_message is False
        assert message.is_edited is False
        assert message.deleted_at is None
        assert message.original_content == ''
        assert message.edit_history == []
    
    def test_message_str(self, conversation_setup):
        """Test string representation of message"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='Test'
        )
        
        expected = f"Message from {conversation_setup['user1'].email} at {message.created_at}"
        assert str(message) == expected
    
    def test_mark_as_read(self, conversation_setup):
        """Test marking message as read"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='Test message'
        )
        
        assert message.is_read is False
        assert message.read_at is None
        
        message.mark_as_read()
        
        assert message.is_read is True
        assert message.read_at is not None
        
        # Marking again shouldn't change read_at
        original_read_at = message.read_at
        message.mark_as_read()
        assert message.read_at == original_read_at
    
    def test_edit_message_success(self, conversation_setup):
        """Test editing a message successfully"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='Original content'
        )
        
        # Edit immediately
        message.edit_message('Edited content', conversation_setup['user1'])
        
        assert message.content == 'Edited content'
        assert message.original_content == 'Original content'
        assert message.is_edited is True
        assert message.edited_at is not None
        assert len(message.edit_history) == 1
        assert message.edit_history[0]['content'] == 'Original content'
    
    def test_edit_message_only_sender_can_edit(self, conversation_setup):
        """Test that only sender can edit their message"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='Original content'
        )
        
        # Try to edit as different user
        with pytest.raises(ValueError) as exc_info:
            message.edit_message('Hacked content', conversation_setup['user2'])
        
        assert "Only the sender can edit their message" in str(exc_info.value)
    
    def test_edit_message_time_limit(self, conversation_setup):
        """Test that messages can only be edited within 15 minutes"""
        # Create message with old timestamp
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='Old message'
        )
        
        # Manually set created_at to 20 minutes ago
        message.created_at = timezone.now() - timedelta(minutes=20)
        message.save()
        
        # Try to edit
        with pytest.raises(ValueError) as exc_info:
            message.edit_message('Too late', conversation_setup['user1'])
        
        assert "Messages can only be edited within 15 minutes" in str(exc_info.value)
    
    def test_multiple_edits(self, conversation_setup):
        """Test multiple edits to a message"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='Version 1'
        )
        
        # First edit
        message.edit_message('Version 2', conversation_setup['user1'])
        assert len(message.edit_history) == 1
        
        # Second edit
        message.edit_message('Version 3', conversation_setup['user1'])
        assert len(message.edit_history) == 2
        assert message.edit_history[1]['content'] == 'Version 2'
        assert message.content == 'Version 3'
        assert message.original_content == 'Version 1'
    
    def test_soft_delete_by_sender(self, conversation_setup):
        """Test soft deletion by sender"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='To be deleted'
        )
        
        assert message.is_deleted is False
        
        message.soft_delete(conversation_setup['user1'])
        
        assert message.is_deleted is True
        assert message.deleted_at is not None
        assert message.deleted_by == conversation_setup['user1']
        assert message.deletion_type == 'soft'
    
    def test_soft_delete_by_non_sender(self, conversation_setup):
        """Test that non-sender cannot delete message"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='Protected message'
        )
        
        with pytest.raises(ValueError) as exc_info:
            message.soft_delete(conversation_setup['user2'])
        
        assert "Only the sender or staff can delete this message" in str(exc_info.value)
    
    def test_soft_delete_by_staff(self, conversation_setup):
        """Test that staff can delete any message"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='Staff can delete'
        )
        
        # Create staff user
        staff_user = User.objects.create_user(
            username='staff',
            email='staff@test.com',
            is_staff=True
        )
        
        message.soft_delete(staff_user)
        
        assert message.is_deleted is True
        assert message.deleted_by == staff_user
    
    def test_system_message(self, conversation_setup):
        """Test system message"""
        message = Message.objects.create(
            conversation=conversation_setup['conversation'],
            sender=conversation_setup['user1'],
            content='User joined the conversation',
            is_system_message=True
        )
        
        assert message.is_system_message is True
        
        # System messages shouldn't update conversation's last message
        conversation_setup['conversation'].refresh_from_db()
        assert conversation_setup['conversation'].last_message == ''
    
    def test_message_ordering(self, conversation_setup):
        """Test messages are ordered by creation time"""
        messages = []
        for i in range(3):
            msg = Message.objects.create(
                conversation=conversation_setup['conversation'],
                sender=conversation_setup['user1'],
                content=f'Message {i}'
            )
            messages.append(msg)
            import time
            time.sleep(0.01)  # Ensure different timestamps
        
        # Check ordering
        db_messages = list(Message.objects.all())
        for i, msg in enumerate(db_messages):
            assert msg.content == f'Message {i}'


@pytest.mark.django_db
class TestMessageReaction:
    """Test suite for MessageReaction model"""
    
    @pytest.fixture
    def message_setup(self):
        """Setup message and users"""
        user1 = User.objects.create_user(username='user1', email='user1@test.com')
        user2 = User.objects.create_user(username='user2', email='user2@test.com')
        
        conversation = Conversation.objects.create(
            participant1=user1,
            participant2=user2
        )
        
        message = Message.objects.create(
            conversation=conversation,
            sender=user1,
            content='React to this!'
        )
        
        return {
            'user1': user1,
            'user2': user2,
            'message': message
        }
    
    def test_create_reaction(self, message_setup):
        """Test creating a reaction"""
        reaction = MessageReaction.objects.create(
            message=message_setup['message'],
            user=message_setup['user2'],
            emoji='👍'
        )
        
        assert reaction.message == message_setup['message']
        assert reaction.user == message_setup['user2']
        assert reaction.emoji == '👍'
    
    def test_unique_together_constraint(self, message_setup):
        """Test unique constraint for message, user, and emoji"""
        # Create first reaction
        MessageReaction.objects.create(
            message=message_setup['message'],
            user=message_setup['user1'],
            emoji='❤️'
        )
        
        # Same user, same emoji should fail
        with pytest.raises(IntegrityError):
            MessageReaction.objects.create(
                message=message_setup['message'],
                user=message_setup['user1'],
                emoji='❤️'
            )
        
        # Same user, different emoji should succeed
        reaction2 = MessageReaction.objects.create(
            message=message_setup['message'],
            user=message_setup['user1'],
            emoji='😄'
        )
        assert reaction2.emoji == '😄'
    
    def test_reaction_str(self, message_setup):
        """Test string representation of reaction"""
        reaction = MessageReaction.objects.create(
            message=message_setup['message'],
            user=message_setup['user2'],
            emoji='🎉'
        )
        
        expected = f"{message_setup['user2'].email} reacted 🎉 to message {message_setup['message'].id}"
        assert str(reaction) == expected
    
    def test_get_reaction_summary(self, message_setup):
        """Test getting reaction summary for a message"""
        # Add multiple reactions
        MessageReaction.objects.create(
            message=message_setup['message'],
            user=message_setup['user1'],
            emoji='👍'
        )
        MessageReaction.objects.create(
            message=message_setup['message'],
            user=message_setup['user2'],
            emoji='👍'
        )
        MessageReaction.objects.create(
            message=message_setup['message'],
            user=User.objects.create_user('user3', 'user3@test.com'),
            emoji='❤️'
        )
        
        summary = message_setup['message'].get_reaction_summary()
        
        # Convert to list for easier testing
        summary_list = list(summary)
        
        # Should have 2 different emojis
        assert len(summary_list) == 2
        
        # Check counts
        thumbs_up = next(item for item in summary_list if item['emoji'] == '👍')
        heart = next(item for item in summary_list if item['emoji'] == '❤️')
        
        assert thumbs_up['count'] == 2
        assert heart['count'] == 1


@pytest.mark.django_db
class TestMessageAttachment:
    """Test suite for MessageAttachment model"""
    
    @pytest.fixture
    def message(self):
        """Create a test message"""
        user = User.objects.create_user(username='user', email='user@test.com')
        conversation = Conversation.objects.create(
            participant1=user,
            participant2=User.objects.create_user('user2', 'user2@test.com')
        )
        
        return Message.objects.create(
            conversation=conversation,
            sender=user,
            content='Message with attachment'
        )
    
    def test_create_attachment(self, message):
        """Test creating an attachment"""
        attachment = MessageAttachment.objects.create(
            message=message,
            filename='document.pdf',
            file_size=1024000,  # 1MB
            mime_type='application/pdf'
        )
        
        assert attachment.message == message
        assert attachment.filename == 'document.pdf'
        assert attachment.file_size == 1024000
        assert attachment.mime_type == 'application/pdf'
    
    def test_attachment_str(self, message):
        """Test string representation of attachment"""
        attachment = MessageAttachment.objects.create(
            message=message,
            filename='image.png',
            file_size=500000,
            mime_type='image/png'
        )
        
        assert str(attachment) == 'Attachment: image.png'
    
    def test_multiple_attachments(self, message):
        """Test multiple attachments on a message"""
        attachments = []
        for i in range(3):
            att = MessageAttachment.objects.create(
                message=message,
                filename=f'file{i}.txt',
                file_size=1000 * (i + 1),
                mime_type='text/plain'
            )
            attachments.append(att)
        
        # Check message has all attachments
        message_attachments = list(message.attachments.all())
        assert len(message_attachments) == 3
        
        # Check ordering by upload time
        for i, att in enumerate(message_attachments):
            assert att.filename == f'file{i}.txt'
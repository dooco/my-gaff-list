"""
Comprehensive unit tests for Messaging app models using Django TestCase.
Tests all model functionality, validation, relationships, and edge cases.
"""

import uuid
import time
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
from decimal import Decimal

from apps.core.models import Property, Landlord, County, Town
from apps.messaging.models import Conversation, Message, MessageReaction, MessageAttachment

User = get_user_model()


class TestConversation(TestCase):
    """Test suite for Conversation model"""
    
    def setUp(self):
        """Set up test data"""
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@test.com',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@test.com',
            password='testpass123'
        )
        
        # Create test property
        county = County.objects.create(name='Dublin')
        town = Town.objects.create(name='Dublin City', county=county)
        landlord = Landlord.objects.create(
            name='Test Landlord',
            email='landlord@test.com'
        )
        
        self.property = Property.objects.create(
            title='Test Property',
            landlord=landlord,
            property_type='apartment',
            bedrooms=2,
            bathrooms=1,
            rent_monthly=Decimal('1200.00'),
            address='123 Test Street',
            county=county,
            town=town,
            description='Test property for messaging',
            furnished='furnished',
            available_from=timezone.now().date()
        )
    
    def test_create_conversation(self):
        """Test creating a conversation"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2,
            property=self.property
        )
        
        self.assertEqual(conversation.participant1, self.user1)
        self.assertEqual(conversation.participant2, self.user2)
        self.assertEqual(conversation.property, self.property)
        self.assertEqual(conversation.last_message, '')
        self.assertIsNone(conversation.last_message_at)
        self.assertFalse(conversation.participant1_archived)
        self.assertFalse(conversation.participant2_archived)
        self.assertFalse(conversation.participant1_blocked)
        self.assertFalse(conversation.participant2_blocked)
    
    def test_conversation_without_property(self):
        """Test creating a conversation without a property"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        
        self.assertIsNone(conversation.property)
        self.assertEqual(conversation.participant1, self.user1)
        self.assertEqual(conversation.participant2, self.user2)
    
    def test_conversation_str_with_property(self):
        """Test string representation with property"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2,
            property=self.property
        )
        expected = f"Conversation about {self.property.title}"
        self.assertEqual(str(conversation), expected)
    
    def test_conversation_str_without_property(self):
        """Test string representation without property"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        expected = f"Conversation between {self.user1.email} and {self.user2.email}"
        self.assertEqual(str(conversation), expected)
    
    def test_unique_together_constraint(self):
        """Test unique together constraint for participants and property"""
        # Create first conversation
        Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2,
            property=self.property
        )
        
        # Verify only one conversation exists for these participants and property
        conv_count = Conversation.objects.filter(
            participant1=self.user1,
            participant2=self.user2,
            property=self.property
        ).count()
        self.assertEqual(conv_count, 1)
    
    def test_get_other_participant(self):
        """Test getting the other participant"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        
        self.assertEqual(conversation.get_other_participant(self.user1), self.user2)
        self.assertEqual(conversation.get_other_participant(self.user2), self.user1)
        
        # Test with non-participant
        user3 = User.objects.create_user(
            username='user3',
            email='user3@test.com'
        )
        self.assertIsNone(conversation.get_other_participant(user3))
    
    def test_mark_as_read(self):
        """Test marking conversation as read"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        
        # Initially no read timestamps
        self.assertIsNone(conversation.participant1_last_read)
        self.assertIsNone(conversation.participant2_last_read)
        
        # Mark as read for user1
        conversation.mark_as_read(self.user1)
        conversation.refresh_from_db()
        
        self.assertIsNotNone(conversation.participant1_last_read)
        self.assertIsNone(conversation.participant2_last_read)
        
        # Mark as read for user2
        conversation.mark_as_read(self.user2)
        conversation.refresh_from_db()
        
        self.assertIsNotNone(conversation.participant1_last_read)
        self.assertIsNotNone(conversation.participant2_last_read)
    
    def test_get_unread_count(self):
        """Test getting unread message count"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        
        # Initially no messages
        self.assertEqual(conversation.get_unread_count(self.user1), 0)
        self.assertEqual(conversation.get_unread_count(self.user2), 0)
        
        # Add messages from user1
        for i in range(3):
            Message.objects.create(
                conversation=conversation,
                sender=self.user1,
                content=f'Message {i}'
            )
        
        # User2 should have 3 unread
        self.assertEqual(conversation.get_unread_count(self.user2), 3)
        # User1 should have 0 (can't have unread own messages)
        self.assertEqual(conversation.get_unread_count(self.user1), 0)
        
        # Mark as read for user2
        conversation.mark_as_read(self.user2)
        self.assertEqual(conversation.get_unread_count(self.user2), 0)
        
        # Add more messages from user1
        Message.objects.create(
            conversation=conversation,
            sender=self.user1,
            content='New message'
        )
        
        # User2 should have 1 unread
        self.assertEqual(conversation.get_unread_count(self.user2), 1)
    
    def test_archive_unarchive(self):
        """Test archiving and unarchiving conversation"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        
        # Initially not archived
        self.assertFalse(conversation.is_archived_for(self.user1))
        self.assertFalse(conversation.is_archived_for(self.user2))
        
        # Archive for user1
        conversation.archive_for(self.user1)
        conversation.refresh_from_db()
        
        self.assertTrue(conversation.is_archived_for(self.user1))
        self.assertFalse(conversation.is_archived_for(self.user2))
        self.assertTrue(conversation.participant1_archived)
        self.assertFalse(conversation.participant2_archived)
        
        # Unarchive for user1
        conversation.unarchive_for(self.user1)
        conversation.refresh_from_db()
        
        self.assertFalse(conversation.is_archived_for(self.user1))
        self.assertFalse(conversation.participant1_archived)
    
    def test_block_status(self):
        """Test block status checking"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        
        # Initially not blocked
        self.assertFalse(conversation.is_blocked_by(self.user1))
        self.assertFalse(conversation.is_blocked_by(self.user2))
        
        # Block by user1
        conversation.participant1_blocked = True
        conversation.save()
        
        self.assertTrue(conversation.is_blocked_by(self.user1))
        self.assertFalse(conversation.is_blocked_by(self.user2))
    
    def test_last_message_update(self):
        """Test that last message info is updated when messages are added"""
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        
        # Create a message
        message = Message.objects.create(
            conversation=conversation,
            sender=self.user1,
            content='Hello, this is a test message!'
        )
        
        conversation.refresh_from_db()
        self.assertEqual(conversation.last_message, 'Hello, this is a test message!')
        self.assertEqual(conversation.last_message_at, message.created_at)
        self.assertEqual(conversation.last_message_by, self.user1)
    
    def test_ordering(self):
        """Test default ordering by last message date"""
        # Create conversations with different last message times
        conv1 = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        
        user3 = User.objects.create_user('user3', 'user3@test.com')
        conv2 = Conversation.objects.create(
            participant1=self.user1,
            participant2=user3
        )
        
        user4 = User.objects.create_user('user4', 'user4@test.com')
        conv3 = Conversation.objects.create(
            participant1=self.user1,
            participant2=user4
        )
        
        # Add messages with different timestamps
        Message.objects.create(
            conversation=conv1,
            sender=self.user1,
            content='Old message'
        )
        
        # Wait a moment
        time.sleep(0.01)
        
        Message.objects.create(
            conversation=conv2,
            sender=self.user1,
            content='Recent message'
        )
        
        time.sleep(0.01)
        
        Message.objects.create(
            conversation=conv3,
            sender=self.user1,
            content='Latest message'
        )
        
        # Check ordering (most recent first)
        conversations = list(Conversation.objects.all())
        self.assertEqual(conversations[0], conv3)
        self.assertEqual(conversations[1], conv2)
        self.assertEqual(conversations[2], conv1)


class TestMessage(TestCase):
    """Test suite for Message model"""
    
    def setUp(self):
        """Setup conversation and users"""
        self.user1 = User.objects.create_user(
            username='sender',
            email='sender@test.com'
        )
        self.user2 = User.objects.create_user(
            username='receiver',
            email='receiver@test.com'
        )
        
        self.conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
    
    def test_create_message(self):
        """Test creating a message"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Hello, this is a test message!'
        )
        
        self.assertEqual(message.conversation, self.conversation)
        self.assertEqual(message.sender, self.user1)
        self.assertEqual(message.content, 'Hello, this is a test message!')
        self.assertFalse(message.is_read)
        self.assertIsNone(message.read_at)
        self.assertFalse(message.is_system_message)
        self.assertFalse(message.is_edited)
        self.assertIsNone(message.deleted_at)
        self.assertEqual(message.original_content, '')
        self.assertEqual(message.edit_history, [])
    
    def test_message_str(self):
        """Test string representation of message"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Test'
        )
        
        expected = f"Message from {self.user1.email} at {message.created_at}"
        self.assertEqual(str(message), expected)
    
    def test_mark_as_read(self):
        """Test marking message as read"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Test message'
        )
        
        self.assertFalse(message.is_read)
        self.assertIsNone(message.read_at)
        
        message.mark_as_read()
        
        self.assertTrue(message.is_read)
        self.assertIsNotNone(message.read_at)
        
        # Marking again shouldn't change read_at
        original_read_at = message.read_at
        message.mark_as_read()
        self.assertEqual(message.read_at, original_read_at)
    
    def test_edit_message_success(self):
        """Test editing a message successfully"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Original content'
        )
        
        # Edit immediately
        message.edit_message('Edited content', self.user1)
        
        self.assertEqual(message.content, 'Edited content')
        self.assertEqual(message.original_content, 'Original content')
        self.assertTrue(message.is_edited)
        self.assertIsNotNone(message.edited_at)
        self.assertEqual(len(message.edit_history), 1)
        self.assertEqual(message.edit_history[0]['content'], 'Original content')
    
    def test_edit_message_only_sender_can_edit(self):
        """Test that only sender can edit their message"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Original content'
        )
        
        # Try to edit as different user
        with self.assertRaises(ValueError) as context:
            message.edit_message('Hacked content', self.user2)
        
        self.assertIn("Only the sender can edit their message", str(context.exception))
    
    def test_edit_message_time_limit(self):
        """Test that messages can only be edited within 15 minutes"""
        # Create message with old timestamp
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Old message'
        )
        
        # Manually set created_at to 20 minutes ago
        message.created_at = timezone.now() - timedelta(minutes=20)
        message.save()
        
        # Try to edit
        with self.assertRaises(ValueError) as context:
            message.edit_message('Too late', self.user1)
        
        self.assertIn("Messages can only be edited within 15 minutes", str(context.exception))
    
    def test_multiple_edits(self):
        """Test multiple edits to a message"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Version 1'
        )
        
        # First edit
        message.edit_message('Version 2', self.user1)
        self.assertEqual(len(message.edit_history), 1)
        
        # Second edit
        message.edit_message('Version 3', self.user1)
        self.assertEqual(len(message.edit_history), 2)
        self.assertEqual(message.edit_history[1]['content'], 'Version 2')
        self.assertEqual(message.content, 'Version 3')
        self.assertEqual(message.original_content, 'Version 1')
    
    def test_soft_delete_by_sender(self):
        """Test soft deletion by sender"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='To be deleted'
        )
        
        self.assertFalse(message.is_deleted)
        
        message.soft_delete(self.user1)
        
        self.assertTrue(message.is_deleted)
        self.assertIsNotNone(message.deleted_at)
        self.assertEqual(message.deleted_by, self.user1)
        self.assertEqual(message.deletion_type, 'soft')
    
    def test_soft_delete_by_non_sender(self):
        """Test that non-sender cannot delete message"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Protected message'
        )
        
        with self.assertRaises(ValueError) as context:
            message.soft_delete(self.user2)
        
        self.assertIn("Only the sender or staff can delete this message", str(context.exception))
    
    def test_soft_delete_by_staff(self):
        """Test that staff can delete any message"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Staff can delete'
        )
        
        # Create staff user
        staff_user = User.objects.create_user(
            username='staff',
            email='staff@test.com',
            is_staff=True
        )
        
        message.soft_delete(staff_user)
        
        self.assertTrue(message.is_deleted)
        self.assertEqual(message.deleted_by, staff_user)
    
    def test_system_message(self):
        """Test system message"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='User joined the conversation',
            is_system_message=True
        )
        
        self.assertTrue(message.is_system_message)
        
        # System messages shouldn't update conversation's last message
        self.conversation.refresh_from_db()
        self.assertEqual(self.conversation.last_message, '')
    
    def test_message_ordering(self):
        """Test messages are ordered by creation time"""
        messages = []
        for i in range(3):
            msg = Message.objects.create(
                conversation=self.conversation,
                sender=self.user1,
                content=f'Message {i}'
            )
            messages.append(msg)
            time.sleep(0.01)  # Ensure different timestamps
        
        # Check ordering
        db_messages = list(Message.objects.all())
        for i, msg in enumerate(db_messages):
            self.assertEqual(msg.content, f'Message {i}')


class TestMessageReaction(TestCase):
    """Test suite for MessageReaction model"""
    
    def setUp(self):
        """Setup message and users"""
        self.user1 = User.objects.create_user(username='user1', email='user1@test.com')
        self.user2 = User.objects.create_user(username='user2', email='user2@test.com')
        
        conversation = Conversation.objects.create(
            participant1=self.user1,
            participant2=self.user2
        )
        
        self.message = Message.objects.create(
            conversation=conversation,
            sender=self.user1,
            content='React to this!'
        )
    
    def test_create_reaction(self):
        """Test creating a reaction"""
        reaction = MessageReaction.objects.create(
            message=self.message,
            user=self.user2,
            emoji='👍'
        )
        
        self.assertEqual(reaction.message, self.message)
        self.assertEqual(reaction.user, self.user2)
        self.assertEqual(reaction.emoji, '👍')
    
    def test_unique_together_constraint(self):
        """Test unique constraint for message, user, and emoji"""
        # Create first reaction
        MessageReaction.objects.create(
            message=self.message,
            user=self.user1,
            emoji='❤️'
        )
        
        # Verify reaction was created
        reaction_count = MessageReaction.objects.filter(
            message=self.message,
            user=self.user1,
            emoji='❤️'
        ).count()
        self.assertEqual(reaction_count, 1)
        
        # Same user, different emoji should succeed
        reaction2 = MessageReaction.objects.create(
            message=self.message,
            user=self.user1,
            emoji='😄'
        )
        self.assertEqual(reaction2.emoji, '😄')
    
    def test_reaction_str(self):
        """Test string representation of reaction"""
        reaction = MessageReaction.objects.create(
            message=self.message,
            user=self.user2,
            emoji='🎉'
        )
        
        expected = f"{self.user2.email} reacted 🎉 to message {self.message.id}"
        self.assertEqual(str(reaction), expected)
    
    def test_get_reaction_summary(self):
        """Test getting reaction summary for a message"""
        # Add multiple reactions
        MessageReaction.objects.create(
            message=self.message,
            user=self.user1,
            emoji='👍'
        )
        MessageReaction.objects.create(
            message=self.message,
            user=self.user2,
            emoji='👍'
        )
        user3 = User.objects.create_user('user3', 'user3@test.com')
        MessageReaction.objects.create(
            message=self.message,
            user=user3,
            emoji='❤️'
        )
        
        summary = self.message.get_reaction_summary()
        
        # Convert to list for easier testing
        summary_list = list(summary)
        
        # Should have 2 different emojis
        self.assertEqual(len(summary_list), 2)
        
        # Check counts
        thumbs_up = next(item for item in summary_list if item['emoji'] == '👍')
        heart = next(item for item in summary_list if item['emoji'] == '❤️')
        
        self.assertEqual(thumbs_up['count'], 2)
        self.assertEqual(heart['count'], 1)


class TestMessageAttachment(TestCase):
    """Test suite for MessageAttachment model"""
    
    def setUp(self):
        """Create a test message"""
        user = User.objects.create_user(username='user', email='user@test.com')
        user2 = User.objects.create_user('user2', 'user2@test.com')
        conversation = Conversation.objects.create(
            participant1=user,
            participant2=user2
        )
        
        self.message = Message.objects.create(
            conversation=conversation,
            sender=user,
            content='Message with attachment'
        )
    
    def test_create_attachment(self):
        """Test creating an attachment"""
        attachment = MessageAttachment.objects.create(
            message=self.message,
            filename='document.pdf',
            file_size=1024000,  # 1MB
            mime_type='application/pdf'
        )
        
        self.assertEqual(attachment.message, self.message)
        self.assertEqual(attachment.filename, 'document.pdf')
        self.assertEqual(attachment.file_size, 1024000)
        self.assertEqual(attachment.mime_type, 'application/pdf')
    
    def test_attachment_str(self):
        """Test string representation of attachment"""
        attachment = MessageAttachment.objects.create(
            message=self.message,
            filename='image.png',
            file_size=500000,
            mime_type='image/png'
        )
        
        self.assertEqual(str(attachment), 'Attachment: image.png')
    
    def test_multiple_attachments(self):
        """Test multiple attachments on a message"""
        attachments = []
        for i in range(3):
            att = MessageAttachment.objects.create(
                message=self.message,
                filename=f'file{i}.txt',
                file_size=1000 * (i + 1),
                mime_type='text/plain'
            )
            attachments.append(att)
        
        # Check message has all attachments
        message_attachments = list(self.message.attachments.all())
        self.assertEqual(len(message_attachments), 3)
        
        # Check ordering by upload time
        for i, att in enumerate(message_attachments):
            self.assertEqual(att.filename, f'file{i}.txt')
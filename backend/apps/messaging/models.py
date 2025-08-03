import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.core.models import Property

User = get_user_model()


class Conversation(models.Model):
    """
    Represents a conversation between two users.
    Can be linked to a property if the conversation started from a property enquiry.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='conversations',
        help_text="Property this conversation is about (if applicable)"
    )
    
    # Participants
    participant1 = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='conversations_as_participant1'
    )
    participant2 = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='conversations_as_participant2'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Last message preview (denormalized for performance)
    last_message = models.TextField(blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_message_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='+'
    )
    
    # Read status for each participant
    participant1_last_read = models.DateTimeField(null=True, blank=True)
    participant2_last_read = models.DateTimeField(null=True, blank=True)
    
    # Archive status for each participant
    participant1_archived = models.BooleanField(default=False)
    participant2_archived = models.BooleanField(default=False)
    
    # Block status
    participant1_blocked = models.BooleanField(default=False)
    participant2_blocked = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-last_message_at', '-created_at']
        unique_together = ['participant1', 'participant2', 'property']
        indexes = [
            models.Index(fields=['-last_message_at']),
            models.Index(fields=['participant1', '-last_message_at']),
            models.Index(fields=['participant2', '-last_message_at']),
        ]
    
    def __str__(self):
        if self.property:
            return f"Conversation about {self.property.title}"
        return f"Conversation between {self.participant1.email} and {self.participant2.email}"
    
    def get_other_participant(self, user):
        """Get the other participant in the conversation."""
        if user == self.participant1:
            return self.participant2
        elif user == self.participant2:
            return self.participant1
        return None
    
    def mark_as_read(self, user):
        """Mark conversation as read for a specific user."""
        now = timezone.now()
        if user == self.participant1:
            self.participant1_last_read = now
        elif user == self.participant2:
            self.participant2_last_read = now
        self.save(update_fields=['participant1_last_read', 'participant2_last_read'])
    
    def get_unread_count(self, user):
        """Get number of unread messages for a specific user."""
        if user == self.participant1:
            last_read = self.participant1_last_read
        elif user == self.participant2:
            last_read = self.participant2_last_read
        else:
            return 0
        
        if not last_read:
            return self.messages.count()
        
        return self.messages.filter(created_at__gt=last_read).exclude(sender=user).count()
    
    def is_archived_for(self, user):
        """Check if conversation is archived for a specific user."""
        if user == self.participant1:
            return self.participant1_archived
        elif user == self.participant2:
            return self.participant2_archived
        return False
    
    def is_blocked_by(self, user):
        """Check if conversation is blocked by a specific user."""
        if user == self.participant1:
            return self.participant1_blocked
        elif user == self.participant2:
            return self.participant2_blocked
        return False
    
    def archive_for(self, user):
        """Archive conversation for a specific user."""
        if user == self.participant1:
            self.participant1_archived = True
        elif user == self.participant2:
            self.participant2_archived = True
        self.save()
    
    def unarchive_for(self, user):
        """Unarchive conversation for a specific user."""
        if user == self.participant1:
            self.participant1_archived = False
        elif user == self.participant2:
            self.participant2_archived = False
        self.save()


class Message(models.Model):
    """
    Individual message within a conversation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    
    # Content
    content = models.TextField()
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    
    # Read status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # System message flag (for notifications like "user joined", etc.)
    is_system_message = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender.email} at {self.created_at}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Update conversation's last message info
        if is_new and not self.is_system_message:
            self.conversation.last_message = self.content[:100]  # First 100 chars
            self.conversation.last_message_at = self.created_at
            self.conversation.last_message_by = self.sender
            self.conversation.save(update_fields=[
                'last_message', 'last_message_at', 'last_message_by', 'updated_at'
            ])
    
    def mark_as_read(self):
        """Mark message as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class MessageAttachment(models.Model):
    """
    File attachments for messages (future enhancement).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        Message, 
        on_delete=models.CASCADE, 
        related_name='attachments'
    )
    file = models.FileField(upload_to='message_attachments/%Y/%m/')
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField()  # in bytes
    mime_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['uploaded_at']
    
    def __str__(self):
        return f"Attachment: {self.filename}"
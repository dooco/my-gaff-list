from django.contrib import admin
from .models import Conversation, Message, MessageAttachment


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'participant1', 'participant2', 'property', 'last_message_at', 'created_at']
    list_filter = ['created_at', 'last_message_at', 'participant1_archived', 'participant2_archived']
    search_fields = ['participant1__email', 'participant2__email', 'property__title', 'last_message']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'property', 'created_at', 'updated_at')
        }),
        ('Participants', {
            'fields': ('participant1', 'participant2')
        }),
        ('Last Message', {
            'fields': ('last_message', 'last_message_at', 'last_message_by')
        }),
        ('Read Status', {
            'fields': ('participant1_last_read', 'participant2_last_read')
        }),
        ('Archive Status', {
            'fields': ('participant1_archived', 'participant2_archived')
        }),
        ('Block Status', {
            'fields': ('participant1_blocked', 'participant2_blocked')
        }),
    )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'content_preview', 'is_read', 'created_at']
    list_filter = ['is_read', 'is_system_message', 'created_at']
    search_fields = ['sender__email', 'content']
    readonly_fields = ['id', 'created_at', 'read_at']
    date_hierarchy = 'created_at'
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content Preview'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'conversation', 'sender', 'created_at')
        }),
        ('Content', {
            'fields': ('content', 'is_system_message')
        }),
        ('Read Status', {
            'fields': ('is_read', 'read_at')
        }),
        ('Edit History', {
            'fields': ('is_edited', 'edited_at')
        }),
    )


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'message', 'filename', 'file_size', 'mime_type', 'uploaded_at']
    list_filter = ['mime_type', 'uploaded_at']
    search_fields = ['filename']
    readonly_fields = ['id', 'uploaded_at']
    date_hierarchy = 'uploaded_at'
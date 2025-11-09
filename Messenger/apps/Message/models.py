from django.db import models
from apps.CustomerUser.models import CustomerUser
from apps.Conversation.models import Conversation



# Create your models here.
class Message(models.Model):
    class Type(models.TextChoices):
        TEXT = 'text', 'text'
        IMAGE = 'image', 'image'
        SYSTEM = 'system', 'system'

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='conversation_messages')
    sender = models.ForeignKey(CustomerUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_messages')
    content = models.TextField(blank=True, default='')
    type = models.CharField(max_length=30, choices=Type.choices, default=Type.TEXT)
    created_at = models.DateTimeField(auto_now_add=True)
    edit_at = models.DateTimeField(blank=True, null=True)
    reply_message_id = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True, related_name='replies')
    metadata = models.JSONField(default=dict, blank=True)


 
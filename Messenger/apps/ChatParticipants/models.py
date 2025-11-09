from django.db import models
from apps.Conversation.models import Conversation
from apps.CustomerUser.models import CustomerUser
from apps.Message.models import Message


# Create your models here.
class ConversationParticipants(models.Model):
    ROLE_ROOM = [
        ('owner', 'owner'),
        ('member', 'member')
    ]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, null=False, related_name='conversation_participants')
    user = models.ForeignKey(CustomerUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='user_participant')
    role = models.CharField(max_length=30, choices=ROLE_ROOM, null=True, default=None)
    last_read_message = models.ForeignKey(Message, on_delete=models.SET_NULL, blank=True, null=True, related_name='read_by_participant')
    last_read_at = models.DateTimeField(blank=True, null=True)
    delete_for_user_at = models.DateTimeField(null=True, blank=True, help_text='timestamp when user delete messages')

    class Meta:
        db_table = 'conversation_participants'
        unique_together = ('conversation', 'user')
        indexes = [
            models.Index(fields=['conversation_id', 'user_id']),
        ]
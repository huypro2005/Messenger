from rest_framework.serializers import ModelSerializer, SerializerMethodField
from .models import Message

class MessageSerializer(ModelSerializer):
    sender_username = SerializerMethodField()
    class Meta:
        model = Message
        fields = ["id",
                "content",
                "type",
                "created_at",
                "edit_at",
                "metadata",
                "conversation",
                "sender",
                "reply_message_id",
                "sender_username"]

        
    def get_sender_username(self, obj):
        return obj.sender.username
    
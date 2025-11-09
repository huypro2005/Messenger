from rest_framework.serializers import ModelSerializer
from .models import ConversationParticipants


class ConversationParticipantsSerializer(ModelSerializer):
    class Meta:
        model = ConversationParticipants
        fields = '__all__'
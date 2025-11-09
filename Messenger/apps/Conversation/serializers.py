from rest_framework.serializers import ModelSerializer, SerializerMethodField
from .models import Conversation
from apps.CustomerUser.models import CustomerUser
from apps.Message.models import Message


class ConversationSerializer(ModelSerializer):
    to_user = SerializerMethodField()
    last_message = SerializerMethodField()
    class Meta:
        model = Conversation
        fields = ['id', 'type', 'to_user', 'last_message']

    def get_to_user(self, obj):
        """
        Với conversation private: trả về username của người còn lại
        (khác request.user), bỏ qua participant có user=NULL.
        """
        if getattr(obj, "type", None) != "private":
            return None

        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return None

        # Từ conversation -> conversation_participants -> user
        other_cp = (
            obj.conversation_participants
              .select_related("user")
              .exclude(user__isnull=True)
              .exclude(user_id=request.user.id)
              .first()
        )
        return other_cp.user.username if other_cp and other_cp.user else None

    def get_last_message(self, obj):
        """
        Lấy nội dung tin nhắn mới nhất. Giả định Message có FK:
        Message.conversation (related_name='messages').
        """
        last = obj.conversation_messages.order_by("-id").only("content").first()
        return last.content if last else None
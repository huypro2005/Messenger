import json
from django.contrib.auth.models import AnonymousUser
from django.utils.timezone import now
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from apps.Message.models import Message
from apps.Conversation.models import Conversation
from apps.ChatParticipants.models import ConversationParticipants
from .models import CustomerUser
from django.core.exceptions import PermissionDenied
from apps.Message.serializers import MessageSerializer

def user_group_name(user_id: int) -> str:
    return f"user_{user_id}"


class ChatConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser):
            await self.close(code=4401)
            return
        self.user = user
        self.user_group = user_group_name(user.id)

        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()

        await self.channel_layer.group_send(
            self.user_group,
            {'type': 'presence.event', 'event': 'online', 'at': now().isoformat()}
        )


    async def disconnect(self, code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(
                self.user_group,
                self.channel_name
            )


    async def receive_json(self, content, **kwargs):
        '''
            Format minimin
            {
                "action": "send_message",
                "conversation_id": 123,
                "content": "Hello",
                "reply": null
            }
            Directly send to user
            {
                'action': 'dm',
                'to_user_id': 12,
                'content': 'Hi',
                'reply': null
            }
            Mark readed
            {
                'action': 'read_up_to',
                'conversation_id': 1,
                'message_id': 12
            }
        '''
        action = content.get('action')
        if action == 'send_message':
            conv_id = content.get('conversation_id')
            conv_id = int(conv_id)
            msg_content = content.get('content', '')
            reply = content.get('reply', None)
            msg = await self._create_and_dispatch_message(conv_id, msg_content, reply)
            data = await self.serialize_message(msg)
            await self.send_json({'ok': True, 'message': data})
            return
        if action == 'dm':
            to_user_id = int(content.get('to_user_id'))
            msg_content = content.get('content', '')
            reply = content.get('reply', None)
            conv_id = await self._get_or_create_direct_conversation(self.user.id, to_user_id)
            conv_id = int(conv_id)
            msg = await self._create_and_dispatch_message(conv_id, msg_content, reply)
            data = await self.serialize_message(msg)
            await self.send_json({'ok': True, 'message': data})
            return
        if action == 'read_up_to':
            conv_id = content.get('conversation_id')
            message_id = content.get('message_id')
        


    # ----------------- Handle when receiving from group send ----------------
    
    async def presence_event(self, event):
        # ví dụ: chỉ echo về cho chính user (ở đây group là user group)
        await self.send_json({"type": "presence", **{k: v for k, v in event.items() if k != "type"}})

    async def chat_message(self, event):
        await self.send_json({'type': 'message', 'data': event['data']})

    async def chat_read(self, event):
        await self.send_json({'type': 'read', 'data': event['data']})
    
    # ----------------- helpers (DB) -----------------
    @database_sync_to_async
    def _user_in_conversation(self, conv_id, user_id):
        return ConversationParticipants.objects.filter(
            conversation_id=conv_id, user_id=user_id
        ).exists()


    @database_sync_to_async
    def _create_message(self, conv_id, user_id, content, reply):
        message = Message.objects.create(
            conversation_id=conv_id, 
            sender_id=user_id,
            content=content,
            type=Message.Type.TEXT
        )
        if reply:
            message.reply_message_id=reply
            message.save()
        ConversationParticipants.objects.filter(conversation_id=conv_id, user_id=user_id).update(
            last_read_message_id=message.id,
            last_read_at=now()
        )
        return message


    @database_sync_to_async
    def _get_users_in_conversation(self, conv_id, user_id):
        return 
    

    @database_sync_to_async
    def _get_other_participants(self, conv_id, user_id):
        return list(
            ConversationParticipants.objects
            .filter(conversation_id=conv_id)
            .exclude(user_id=user_id)
            .values_list('user_id', flat=True)
        )


    @database_sync_to_async
    def _get_or_create_direct_conversation(self, user_id, to_user_id):
        u1, u2 = sorted([user_id, to_user_id])
        direct_key = f'{u1}:{u2}'
        conv, _ = Conversation.objects.get_or_create(
            unique_1_to_1_index=direct_key,
            type=Conversation.TYPE.PRIVATE
        )

        ConversationParticipants.objects.get_or_create(
            conversation_id=conv.id,
            user_id=u1
        )
        ConversationParticipants.objects.get_or_create(
            conversation_id=conv.id,
            user_id=u2
        )
        return conv.id


    @database_sync_to_async
    def _set_last_read(self, conv_id, user_id, message_id):
        participant = ConversationParticipants.objects.filter(
            conversation_id=conv_id,
            user_id=user_id
        ).update(
            last_read_message_id = message_id,
            last_read_at=now()
        )
  

    @database_sync_to_async
    def _set_update_conversaton(self, conv_id):
        Conversation.objects.filter(
            id=conv_id
        ).update(
            updated_at=now()
        )

    @database_sync_to_async
    def serialize_message(self, msg):
        return MessageSerializer(msg).data

    #---------------------------------------------------------------------

    async def _create_and_dispatch_message(self, conversation_id, content, reply=None):    
        if not await self._user_in_conversation(conversation_id, self.user.id):
            raise PermissionDenied('Not a participant of this conversation')
        
        msg = await self._create_message(conversation_id, self.user.id, content, reply)
        await self._set_update_conversaton(conversation_id)
        payload = await self.serialize_message(msg)

        await self.channel_layer.group_send(
            user_group_name(self.user.id),
            {'type':'chat.message', 'data':payload}
        )

        other_user_ids = await self._get_other_participants(conversation_id, self.user.id)

        for id in other_user_ids:
            await self.channel_layer.group_send(
                user_group_name(id),
                {'type':'chat.message', 'data':payload}
            )
        return msg


    async def _mark_read(self, conv_id, message_id):
        if not await self._user_in_conversation(conv_id, self.user.id):
            return PermissionDenied('Not a participant of this conversation')
        
        await self._set_last_read(conv_id, self.user.id, message_id)

        # Notify for other participant know where user read
        data = {"conversation_id": conv_id, "user_id": self.user.id, "last_read_message_id": int(message_id), "at": now().isoformat()}
        other_user_ids = await self._get_other_participants(conv_id, self.user.id)
        for id in other_user_ids:
            await self.channel_layer.group_send(
                user_group_name(id),
                {'type':'chat.read', 'data':data}
            )


from rest_framework.views import APIView
from .models import Message
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .serializers import MessageSerializer
from apps.ChatParticipants.models import ConversationParticipants
from django.db.models import Q

class MessagesListView(APIView):
    permission_classes=[IsAuthenticated]

    def get_params(self, request):
        params = {}
        params['last_message_id'] = request.query_params.get('last_message_id', None)
        return params

    def get(self, request, conv_id):
        if not ConversationParticipants.objects.filter(user_id=request.user.id, conversation_id=conv_id).exists():
            PermissionError("you are not in this conversation")
        
        params = self.get_params(request)
        if params['last_message_id']:
            last_message_id = int(params['last_message_id'])
            messages = Message.objects.filter(conversation_id=conv_id, id__lt=last_message_id).order_by('-id')[:20]
            datas = MessageSerializer(messages, many=True).data
            try:
                last_message_id = messages[len(messages)-1].id
            except:
                last_message_id = None

        else:
            messages = Message.objects.filter(conversation_id=conv_id).order_by('-id')[:20]
            messages = list(reversed(messages))
            datas = MessageSerializer(messages, many=True).data
            last_message_id = messages[0].id
   
        return Response({
            'message':'retrieve success',
            'data':{
                'last_message_id': last_message_id,
                'data': datas
            }
        })
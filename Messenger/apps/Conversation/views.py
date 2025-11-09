from rest_framework.views import APIView
from .models import Conversation
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from apps.ChatParticipants.models import ConversationParticipants
from .serializers import ConversationSerializer

class ConversationsListView(APIView):
    permission_classes=[IsAuthenticated]
    
    def get(self, request):
        conversations = Conversation.objects.filter(conversation_participants__user=request.user).order_by('updated_at')
        datas = ConversationSerializer(conversations, many=True, context={'request': request}).data
        return Response({
            'message': 'retrieve success',
            'data': datas
        })
    

class ConversationDetailView(APIView):
    permission_classes=[IsAuthenticated]
    
    def get_params(self, request):
        params = {}
        params['to_user_id'] = request.query_params.get('to_user_id', None)
        return params
    
    def get(self, request):
        params = self.get_params(request)
        if params['to_user_id']:
            u1, u2 = sorted([request.user.id, int(params['to_user_id'])])
            direct_key = f'{u1}:{u2}'
            if Conversation.objects.filter(unique_1_to_1_index=direct_key, type=Conversation.TYPE.PRIVATE).exists():
                conv = Conversation.objects.filter(
                    unique_1_to_1_index=direct_key,
                    type=Conversation.TYPE.PRIVATE  
                ).first()
                return Response({
                    'message': 'retrieve success',
                    'data': {
                        'conversation_id': conv.id
                    }
                }, status=status.HTTP_200_OK)
        return Response({
            'message': 'retrieve success',
            'data': {
                'conversation_id': None
            }
        }, status=status.HTTP_400_BAD_REQUEST)
from rest_framework.views import APIView
from .models import CustomerUser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .serializers import CustomerUserSerializer


class UserRegistrationView(APIView):
    permission_classes=[AllowAny]
    def post(self, request):
        serializer = CustomerUserSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    serializer.save()                 
                return Response({'message': 'User created successfully', 'data': serializer.data}, status=status.HTTP_200_OK)  
            except Exception as e:
                # Bắt các lỗi chung khác
                return Response({
                    'message': 'An unexpected error occurred.',
                    'errors': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'message': 'User creation failed', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    

class CustomerUserView(APIView):
    permission_classes =[IsAuthenticated]
    def get(self, request):
        user = request.user
        serializer = CustomerUserSerializer(user).data
        return Response({'message': 'Retrieve success', 'data': serializer})
    

class CustomerListUsersView(APIView):
    permission_classes=[IsAuthenticated]
    def get(self, request):
        try:
            users = CustomerUser.objects.filter(is_active=True).exclude(id=request.user.id)
            datas = CustomerUserSerializer(users, many=True).data
            return Response({'message':'retrieve success', 'data':datas}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'message': 'retrieve fail', 'error': e}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
from rest_framework import serializers
from .models import CustomerUser

class CustomerUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerUser
        fields = ['id', 'username', 'password', 'email']
        read_only_fields = ['id']
        extra_kwargs = {'password': {'write_only': True, 'required': False},
                        'email': {'required': False},
                        'username': {'required': False}
                       }
        
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = self.Meta.model(**validated_data)
        if password:
            user.set_password(password)
        else:
            print("No password")
        user.save()
        return user
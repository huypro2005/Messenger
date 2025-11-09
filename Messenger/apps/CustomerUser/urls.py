from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)
from .views import (
        UserRegistrationView, 
        CustomerUserView,
        CustomerListUsersView
    )


urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/register/', UserRegistrationView.as_view(), name='user_registration'),
    path('me/', CustomerUserView.as_view(), name='me'),
    path('users/', CustomerListUsersView.as_view(), name='users'),
]
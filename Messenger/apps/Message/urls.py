from django.urls import path
from .views import MessagesListView


urlpatterns = [
    path('conversations/<int:conv_id>/messages/', MessagesListView.as_view(), name='messages'),
]
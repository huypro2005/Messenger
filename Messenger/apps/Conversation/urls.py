from django.urls import path
from .views import ConversationsListView, ConversationDetailView


urlpatterns = [
    path('conversations/', ConversationsListView.as_view(), name='conversations'),
    path('conversations/user/', ConversationDetailView.as_view(), name='conversation_user')
]
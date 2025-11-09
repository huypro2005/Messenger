"""
ASGI config for Messenger project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Messenger.settings')

django_asgi_app = get_asgi_application()

from apps.CustomerUser.jwt_middleware import JWTAuthMiddlewareStack
from apps.CustomerUser.routings import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        'http': django_asgi_app,
        'websocket': JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    }
)

from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from .models import CustomerUser
from asgiref.sync import sync_to_async
from rest_framework_simplejwt.tokens import AccessToken

@sync_to_async
def get_user(user_id):
    try:
        return CustomerUser.objects.get(id=user_id)
    except CustomerUser.DoesNotExist:
        return AnonymousUser()
    
class JWTAuthMiddleware:

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Get headers
        headers = dict(scope.get('headers', []))
        user = AnonymousUser()
        token = None

        # 1) Authorization: Bearer <token>
        auth = headers.get(b"authorization")
        if auth:
            try:
                scheme, token_bytes = auth.split()
                if scheme.lower() == b"bearer":
                    token = token_bytes.decode()
            except Exception:
                token = None
        
        # 2) Sec-WebSocket-Protocol: "jwt,<token>"
        if not token:
            swp = headers.get(b"sec-websocket-protocol")
            if swp:
                try:
                    parts = [p.strip() for p in swp.decode().split(",")]
                    if parts and parts[0].lower() == "jwt" and len(parts) > 1:
                        token = parts[1]
                except Exception:
                    pass

        # 3) (dev optional) ?token=<...>
        if not token:
            qs = parse_qs(scope.get("query_string", b"").decode())
            token = (qs.get("token", [None])[0])

        if token:
            try:
                payload = AccessToken(token)
                uid = payload.get("user_id")
                user = await get_user(uid)
            except Exception:
                user = AnonymousUser()
        
        scope['user'] = user
        return await self.inner(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    from channels.auth import AuthMiddlewareStack
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
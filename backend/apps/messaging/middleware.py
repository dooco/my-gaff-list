from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs, unquote
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT authentication in WebSocket connections.
    """
    
    async def __call__(self, scope, receive, send):
        # Try to authenticate from query string first (for WebSocket connections)
        try:
            query_string = scope.get('query_string', b'').decode()
            logger.debug(f"WebSocket middleware - query string length: {len(query_string)}")
            
            query_params = parse_qs(query_string)
            token = None
            
            # Check for token in query parameters
            if 'token' in query_params:
                # Unquote the token to handle URL encoding
                token = unquote(query_params['token'][0])
                logger.debug(f"WebSocket middleware - token from query: {token[:20] if token else 'None'}...")
            
            # If no token in query params, check headers
            if not token:
                headers = dict(scope.get('headers', []))
                auth_header = headers.get(b'authorization', b'').decode()
                
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
                    logger.debug(f"WebSocket middleware - token from header: {token[:20] if token else 'None'}...")
            
            # Authenticate user
            if token:
                user = await self.authenticate_token(token)
                logger.info(f"WebSocket middleware - authenticated user: {user}")
                scope['user'] = user
            else:
                logger.warning("WebSocket middleware - no token found")
                scope['user'] = AnonymousUser()
                
        except Exception as e:
            logger.error(f"WebSocket middleware error: {e}", exc_info=True)
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def authenticate_token(self, token):
        """Authenticate JWT token and return user."""
        try:
            # Clean the token - remove any extra whitespace or quotes
            token = token.strip().strip('"').strip("'")
            
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token)
            user = jwt_auth.get_user(validated_token)
            logger.info(f"WebSocket auth success: {user.email if hasattr(user, 'email') else user}")
            return user
        except (InvalidToken, TokenError) as e:
            logger.warning(f"WebSocket auth failed: {e}")
            return AnonymousUser()
        except Exception as e:
            logger.error(f"Unexpected auth error: {e}", exc_info=True)
            return AnonymousUser()


def JWTAuthMiddlewareStack(inner):
    """Convenience wrapper for JWT authentication middleware."""
    return JWTAuthMiddleware(inner)
from django.urls import path
from channels.routing import URLRouter
from apps.messaging import consumers

websocket_urlpatterns = [
    path('ws/messages/', consumers.MessageConsumer.as_asgi()),
]

application = URLRouter(websocket_urlpatterns)
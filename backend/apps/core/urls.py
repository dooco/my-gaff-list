from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CountyViewSet, TownViewSet, PropertyViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'counties', CountyViewSet)
router.register(r'towns', TownViewSet)
router.register(r'properties', PropertyViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
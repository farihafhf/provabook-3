"""
Orders URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet

app_name = 'orders'

# Configure router to work with or without trailing slashes
router = DefaultRouter(trailing_slash=False)
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]

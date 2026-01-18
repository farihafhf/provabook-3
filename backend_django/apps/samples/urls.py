"""
Samples URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SampleViewSet

app_name = 'samples'

# Configure router with trailing slashes for consistency
router = DefaultRouter(trailing_slash=True)
router.register(r'', SampleViewSet, basename='sample')

urlpatterns = [
    path('', include(router.urls)),
]

"""
Samples URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SampleViewSet

app_name = 'samples'

# Configure router to work without trailing slashes (consistent with orders app)
router = DefaultRouter(trailing_slash=False)
router.register(r'', SampleViewSet, basename='sample')

urlpatterns = [
    path('', include(router.urls)),
]

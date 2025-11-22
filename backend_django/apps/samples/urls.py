"""
Samples URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SampleViewSet

app_name = 'samples'

router = DefaultRouter()
router.register(r'', SampleViewSet, basename='sample')

urlpatterns = [
    path('', include(router.urls)),
]

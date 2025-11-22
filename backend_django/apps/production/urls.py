"""Production URL configuration"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ProductionMetricViewSet


app_name = 'production'

router = DefaultRouter(trailing_slash=True)
router.register(r'', ProductionMetricViewSet, basename='production-metric')

urlpatterns = [
    path('', include(router.urls)),
]

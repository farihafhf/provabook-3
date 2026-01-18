"""
Shipments URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShipmentViewSet

app_name = 'shipments'

router = DefaultRouter(trailing_slash=True)
router.register(r'', ShipmentViewSet, basename='shipment')

urlpatterns = [
    path('', include(router.urls)),
]

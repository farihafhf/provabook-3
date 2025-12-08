"""
Orders URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet
from .views_task import TaskViewSet
from .views_supplier_delivery import SupplierDeliveryViewSet
from .views_production_entry import ProductionEntryViewSet
from .views_mill_offer import MillOfferViewSet
from .views_deletion_request import DeletionRequestViewSet

app_name = 'orders'

# Configure router with trailing slashes (DRF default) to match frontend API client behavior
router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'supplier-deliveries', SupplierDeliveryViewSet, basename='supplier-delivery')
router.register(r'production-entries', ProductionEntryViewSet, basename='production-entry')
router.register(r'mill-offers', MillOfferViewSet, basename='mill-offer')
router.register(r'deletion-requests', DeletionRequestViewSet, basename='deletion-request')
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]

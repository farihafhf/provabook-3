"""
ViewSet for SupplierDelivery CRUD operations
"""
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models_supplier_delivery import SupplierDelivery
from .serializers_supplier_delivery import (
    SupplierDeliverySerializer,
    SupplierDeliveryCreateSerializer,
    SupplierDeliveryUpdateSerializer,
    SupplierDeliveryListSerializer
)
from apps.core.permissions import IsMerchandiser


class SupplierDeliveryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for SupplierDelivery CRUD operations
    
    Endpoints:
    - GET /supplier-deliveries/ - List all deliveries (filtered by order if provided)
    - POST /supplier-deliveries/ - Create new delivery
    - GET /supplier-deliveries/{id}/ - Get delivery details
    - PATCH /supplier-deliveries/{id}/ - Update delivery
    - DELETE /supplier-deliveries/{id}/ - Delete delivery
    """
    queryset = SupplierDelivery.objects.select_related('order', 'created_by').all()
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['order', 'delivery_date']
    search_fields = ['notes', 'order__order_number']
    ordering_fields = ['delivery_date', 'created_at', 'delivered_quantity']
    ordering = ['-delivery_date', '-created_at']
    pagination_class = None  # Disable pagination - frontend expects array directly
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return SupplierDeliveryListSerializer
        elif self.action == 'create':
            return SupplierDeliveryCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return SupplierDeliveryUpdateSerializer
        return SupplierDeliverySerializer
    
    def get_queryset(self):
        """
        Filter deliveries based on query parameters
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Merchandisers only see deliveries for their orders
        if user.role == 'merchandiser':
            queryset = queryset.filter(order__merchandiser=user)
        
        # Apply order filter if provided
        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by to current user when creating delivery"""
        serializer.save(created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create delivery with custom response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        delivery = serializer.save(created_by=request.user)
        
        # Return full delivery data
        response_serializer = SupplierDeliverySerializer(delivery)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update delivery with custom response"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full delivery data
        response_serializer = SupplierDeliverySerializer(instance)
        return Response(response_serializer.data)

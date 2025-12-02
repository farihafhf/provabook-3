"""
Views for ProductionEntry model
Handles CRUD operations for knitting, dyeing, finishing entries
"""
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count, Q

from .models_production_entry import ProductionEntry, ProductionEntryType
from .serializers_production_entry import (
    ProductionEntrySerializer,
    ProductionEntryCreateSerializer,
    ProductionEntryUpdateSerializer,
    ProductionEntryListSerializer,
    ProductionEntrySummarySerializer,
)
from apps.core.permissions import IsMerchandiser
from apps.core.models import Notification


class ProductionEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ProductionEntry CRUD operations
    
    Endpoints:
    - GET /production-entries/ - List all entries (filtered by order if provided)
    - POST /production-entries/ - Create new entry
    - GET /production-entries/{id}/ - Get entry details
    - PATCH /production-entries/{id}/ - Update entry
    - DELETE /production-entries/{id}/ - Delete entry
    - GET /production-entries/summary/?order={id} - Get aggregated summary for an order
    """
    queryset = ProductionEntry.objects.select_related(
        'order', 'order_line', 'order_line__style', 'created_by'
    ).all()
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['order', 'entry_type', 'entry_date']
    search_fields = ['notes', 'order__order_number']
    ordering_fields = ['entry_date', 'created_at', 'quantity', 'entry_type']
    ordering = ['-entry_date', '-created_at']
    pagination_class = None  # Disable pagination - frontend expects array directly
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ProductionEntryListSerializer
        elif self.action == 'create':
            return ProductionEntryCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProductionEntryUpdateSerializer
        elif self.action == 'summary':
            return ProductionEntrySummarySerializer
        return ProductionEntrySerializer
    
    def get_queryset(self):
        """
        Filter entries based on query parameters
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Merchandisers only see entries for their orders
        if user.role == 'merchandiser':
            queryset = queryset.filter(order__merchandiser=user)
        
        # Apply order filter if provided
        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        
        # Apply entry_type filter if provided
        entry_type = self.request.query_params.get('entry_type')
        if entry_type:
            queryset = queryset.filter(entry_type=entry_type)
        
        # Apply order_line filter if provided
        order_line_id = self.request.query_params.get('order_line')
        if order_line_id:
            queryset = queryset.filter(order_line_id=order_line_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by to current user when creating entry"""
        serializer.save(created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create entry with custom response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save(created_by=request.user)
        
        # Create notification for the order's merchandiser
        order = entry.order
        if order.merchandiser and order.merchandiser != request.user:
            # Build notification message
            line_info = f" for {entry.order_line.line_label}" if entry.order_line else ""
            
            Notification.objects.create(
                user=order.merchandiser,
                title=f'{entry.get_entry_type_display()} Entry Recorded',
                message=f'A {entry.get_entry_type_display().lower()} entry of {entry.quantity} {entry.unit} was recorded for order {order.order_number}{line_info}',
                notification_type='production_entry_recorded',
                related_id=str(order.id),
                related_type='order'
            )
        
        # Return full entry data
        response_serializer = ProductionEntrySerializer(entry)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update entry with custom response"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full entry data
        response_serializer = ProductionEntrySerializer(instance)
        return Response(response_serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get aggregated production entry summary for an order
        Returns total quantities for each entry type
        
        Query params:
        - order: Order ID (required)
        - order_line: Order Line ID (optional, for line-specific summary)
        """
        order_id = request.query_params.get('order')
        if not order_id:
            return Response(
                {'error': 'order parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(order_id=order_id)
        
        # Optionally filter by order line
        order_line_id = request.query_params.get('order_line')
        if order_line_id:
            queryset = queryset.filter(order_line_id=order_line_id)
        
        # Aggregate by entry type
        summary = queryset.aggregate(
            total_knitting=Sum('quantity', filter=Q(entry_type=ProductionEntryType.KNITTING)),
            total_dyeing=Sum('quantity', filter=Q(entry_type=ProductionEntryType.DYEING)),
            total_finishing=Sum('quantity', filter=Q(entry_type=ProductionEntryType.FINISHING)),
            knitting_entries_count=Count('id', filter=Q(entry_type=ProductionEntryType.KNITTING)),
            dyeing_entries_count=Count('id', filter=Q(entry_type=ProductionEntryType.DYEING)),
            finishing_entries_count=Count('id', filter=Q(entry_type=ProductionEntryType.FINISHING)),
        )
        
        serializer = ProductionEntrySummarySerializer(summary)
        return Response(serializer.data)

"""
Views for ProductionEntry model
Handles CRUD operations for knitting, dyeing, finishing entries
"""
from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count, Q

from .models_production_entry import ProductionEntry, ProductionEntryType
from .models_order_line import OrderLine
from .serializers_production_entry import (
    ProductionEntrySerializer,
    ProductionEntryCreateSerializer,
    ProductionEntryUpdateSerializer,
    ProductionEntryListSerializer,
    ProductionEntrySummarySerializer,
)
from apps.core.permissions import IsMerchandiser
from apps.core.models import Notification


def update_order_line_production_dates(entry: ProductionEntry):
    """
    Update OrderLine start/complete dates based on production entries.
    
    Logic:
    - When a knitting/dyeing entry is first recorded for an order line, set the start date
    - When knitting/dyeing reaches 100% complete (quantity >= target), set the complete date
    
    The entry_date from the production entry becomes the start/complete date.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    order_line = entry.order_line
    if not order_line:
        logger.debug(f"Production entry {entry.id} has no order_line, skipping date update")
        return  # No order line associated, nothing to update
    
    entry_type = entry.entry_type
    
    # Only handle knitting and dyeing for now
    if entry_type not in [ProductionEntryType.KNITTING, ProductionEntryType.DYEING]:
        return
    
    # Get all entries for this order line and entry type
    entries_queryset = ProductionEntry.objects.filter(
        order_line=order_line,
        entry_type=entry_type
    )
    
    # Calculate total quantity for this entry type
    total_qty = entries_queryset.aggregate(
        total=Sum('quantity')
    )['total'] or Decimal('0')
    
    # Get target quantity - prefer greige_quantity if set and > 0, otherwise use quantity
    greige_qty = Decimal(str(order_line.greige_quantity)) if order_line.greige_quantity else Decimal('0')
    line_qty = Decimal(str(order_line.quantity)) if order_line.quantity else Decimal('0')
    target_qty = greige_qty if greige_qty > 0 else line_qty
    
    logger.info(f"Production date update: entry_type={entry_type}, order_line={order_line.id}, "
                f"total_qty={total_qty}, target_qty={target_qty}, greige={greige_qty}, line_qty={line_qty}")
    
    # Get the earliest entry date for start date
    earliest_entry = entries_queryset.order_by('entry_date').first()
    earliest_date = earliest_entry.entry_date if earliest_entry else None
    
    # Get the latest entry date for complete date (when 100% is reached)
    latest_entry = entries_queryset.order_by('-entry_date').first()
    latest_date = latest_entry.entry_date if latest_entry else None
    
    updated = False
    
    is_complete = target_qty > 0 and total_qty >= target_qty
    logger.info(f"  → is_complete={is_complete} (total_qty={total_qty} >= target_qty={target_qty})")
    
    if entry_type == ProductionEntryType.KNITTING:
        # Set knitting_start_date to the earliest entry date
        if earliest_date and order_line.knitting_start_date != earliest_date:
            logger.info(f"  → Setting knitting_start_date to {earliest_date}")
            order_line.knitting_start_date = earliest_date
            updated = True
        
        # Set knitting_complete_date when 100% complete
        if is_complete:
            if order_line.knitting_complete_date != latest_date:
                logger.info(f"  → Setting knitting_complete_date to {latest_date} (100% complete)")
                order_line.knitting_complete_date = latest_date
                updated = True
        else:
            # Clear complete date if no longer at 100% (e.g., entry deleted/updated)
            if order_line.knitting_complete_date is not None:
                logger.info(f"  → Clearing knitting_complete_date (no longer 100%)")
                order_line.knitting_complete_date = None
                updated = True
    
    elif entry_type == ProductionEntryType.DYEING:
        # Set dyeing_start_date to the earliest entry date
        if earliest_date and order_line.dyeing_start_date != earliest_date:
            logger.info(f"  → Setting dyeing_start_date to {earliest_date}")
            order_line.dyeing_start_date = earliest_date
            updated = True
        
        # Set dyeing_complete_date when 100% complete
        if is_complete:
            if order_line.dyeing_complete_date != latest_date:
                logger.info(f"  → Setting dyeing_complete_date to {latest_date} (100% complete)")
                order_line.dyeing_complete_date = latest_date
                updated = True
        else:
            # Clear complete date if no longer at 100%
            if order_line.dyeing_complete_date is not None:
                logger.info(f"  → Clearing dyeing_complete_date (no longer 100%)")
                order_line.dyeing_complete_date = None
                updated = True
    
    if updated:
        logger.info(f"  → Saving order_line {order_line.id} with updated dates")
        # Save without triggering auto-calculation of dates in model.save()
        # We specifically want to set these dates from production entries
        order_line.save(update_fields=[
            'knitting_start_date', 'knitting_complete_date',
            'dyeing_start_date', 'dyeing_complete_date',
            'updated_at'
        ])
    else:
        logger.info(f"  → No changes to save for order_line {order_line.id}")


def clear_order_line_production_dates_if_empty(order_line: OrderLine, entry_type: str):
    """
    Clear start/complete dates if all entries of a type are deleted.
    """
    if not order_line:
        return
    
    # Check if any entries of this type remain
    remaining_entries = ProductionEntry.objects.filter(
        order_line=order_line,
        entry_type=entry_type
    ).exists()
    
    if remaining_entries:
        return  # Still have entries, dates will be updated by update_order_line_production_dates
    
    updated = False
    
    if entry_type == ProductionEntryType.KNITTING:
        if order_line.knitting_start_date is not None:
            order_line.knitting_start_date = None
            updated = True
        if order_line.knitting_complete_date is not None:
            order_line.knitting_complete_date = None
            updated = True
    
    elif entry_type == ProductionEntryType.DYEING:
        if order_line.dyeing_start_date is not None:
            order_line.dyeing_start_date = None
            updated = True
        if order_line.dyeing_complete_date is not None:
            order_line.dyeing_complete_date = None
            updated = True
    
    if updated:
        order_line.save(update_fields=[
            'knitting_start_date', 'knitting_complete_date',
            'dyeing_start_date', 'dyeing_complete_date',
            'updated_at'
        ])


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
        
        # Update order line production dates (start/complete) based on this entry
        update_order_line_production_dates(entry)
        
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
        
        # Re-fetch instance to get updated data
        instance.refresh_from_db()
        
        # Update order line production dates (start/complete) based on this entry
        update_order_line_production_dates(instance)
        
        # Return full entry data
        response_serializer = ProductionEntrySerializer(instance)
        return Response(response_serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete entry and update order line dates"""
        instance = self.get_object()
        
        # Store references before deletion
        order_line = instance.order_line
        entry_type = instance.entry_type
        
        # Delete the entry
        instance.delete()
        
        # Clear or recalculate order line dates after deletion
        if order_line and entry_type in [ProductionEntryType.KNITTING, ProductionEntryType.DYEING]:
            # Check if any entries remain for this type
            remaining_entries = ProductionEntry.objects.filter(
                order_line=order_line,
                entry_type=entry_type
            )
            
            if remaining_entries.exists():
                # Recalculate dates using the first remaining entry
                first_remaining = remaining_entries.first()
                update_order_line_production_dates(first_remaining)
            else:
                # No entries left, clear the dates
                clear_order_line_production_dates_if_empty(order_line, entry_type)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
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

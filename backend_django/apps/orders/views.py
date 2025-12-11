"""
Orders views
"""
from datetime import datetime, date, timedelta
from io import BytesIO
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count, Q, Prefetch
from django.utils import timezone
from django.http import HttpResponse, FileResponse
from .models import Order, OrderStatus, OrderCategory, Document, ApprovalHistory
from .serializers import (
    OrderSerializer, OrderCreateSerializer, OrderUpdateSerializer,
    OrderListSerializer, OrderAlertSerializer, OrderStatsSerializer, ApprovalUpdateSerializer,
    StageChangeSerializer, DocumentSerializer, ApprovalHistorySerializer, ApprovalHistoryUpdateSerializer
)
from .filters import OrderFilter
from .utils.export import generate_orders_excel, generate_purchase_order_pdf, generate_tna_excel
from apps.core.permissions import IsMerchandiser, IsAdminOrManager


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Order CRUD operations
    
    Endpoints:
    - GET /orders/ - List all orders (filtered by role)
    - POST /orders/ - Create new order
    - GET /orders/{id}/ - Get order details
    - PATCH /orders/{id}/ - Update order
    - DELETE /orders/{id}/ - Delete order
    - GET /orders/stats/ - Get order statistics
    - PATCH /orders/{id}/approvals/ - Update approval status
    - POST /orders/{id}/change_stage/ - Change order stage
    """
    queryset = Order.objects.select_related('merchandiser', 'created_by').prefetch_related(
        # Prefetch approval history with explicit ascending order by created_at
        # This ensures the serializer can correctly get first record (oldest) and last record (newest)
        Prefetch(
            'styles__lines__approval_history',
            queryset=ApprovalHistory.objects.order_by('created_at')
        ),
        'styles__colors',
        'styles__lines__mill_offers',  # Prefetch mill offers per line for development stage
        'styles__lines__documents',
        'styles__lines__deliveries',  # Prefetch line-level deliveries for production progress
        'styles__lines__production_entries',  # Prefetch line-level production entries
        'documents',  # Prefetch documents for LC/PI dates
        'production_entries',  # Prefetch production entries for local orders (order-level)
        'supplier_deliveries',  # Prefetch supplier deliveries for production summary
    ).all()
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = OrderFilter
    search_fields = [
        'order_number',
        'customer_name',
        'buyer_name',
        'fabric_type',
        'style_number',
        'styles__style_number',  # Search through related OrderStyle model
        'merchandiser__full_name',
        'merchandiser__email',
    ]
    ordering_fields = ['created_at', 'order_date', 'expected_delivery_date', 'order_number']
    ordering = ['-created_at']
    pagination_class = None  # Disable pagination - frontend expects array directly
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return OrderListSerializer
        elif self.action == 'create':
            return OrderCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return OrderUpdateSerializer
        elif self.action == 'stats':
            return OrderStatsSerializer
        return OrderSerializer
    
    def _validate_date_params(self):
        date_params = ['order_date_from', 'order_date_to', 'etd_from', 'etd_to']
        request = getattr(self, 'request', None)
        if request is None:
            return
        params_source = getattr(request, 'query_params', getattr(request, 'GET', {}))
        for param in date_params:
            value = params_source.get(param)
            if value:
                try:
                    datetime.strptime(value, '%Y-%m-%d').date()
                except ValueError:
                    raise ValidationError('Invalid date format. Use YYYY-MM-DD')

    def get_queryset(self):
        """
        Filter orders based on user role:
        - Merchandisers see only their orders
        - Managers and Admins see all orders
        
        Note: Status filtering is handled by OrderFilter.filter_by_line_status()
        which filters based on LINE statuses, not the parent order status.
        """
        if self.action in ['list', 'stats', 'export_excel']:
            self._validate_date_params()
        queryset = super().get_queryset()
        user = self.request.user
        
        # Merchandisers only see their own orders
        if user.role == 'merchandiser':
            queryset = queryset.filter(merchandiser=user)
        
        # Note: status filtering is now handled by django-filter (OrderFilter)
        # which filters by line status, not parent order status
        
        category_param = self.request.query_params.get('category')
        if category_param:
            queryset = queryset.filter(category=category_param)
        
        merchandiser_param = self.request.query_params.get('merchandiserId')
        if merchandiser_param and user.role in ['admin', 'manager']:
            queryset = queryset.filter(merchandiser_id=merchandiser_param)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set merchandiser and created_by to current user when creating order"""
        serializer.save(merchandiser=self.request.user, created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create order with custom response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save(merchandiser=request.user, created_by=request.user)
        
        # Return full order data
        response_serializer = OrderSerializer(order)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update order with custom response"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full order data
        response_serializer = OrderSerializer(instance)
        return Response(response_serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete order - only allowed if user is the creator.
        Non-creators must use request_deletion endpoint.
        """
        instance = self.get_object()
        user = request.user
        
        # Check if user is the creator or if created_by is not set (legacy orders)
        if instance.created_by and instance.created_by != user:
            # Admin can still delete any order
            if user.role != 'admin':
                return Response(
                    {
                        'error': 'Only the order creator can delete this order.',
                        'creatorId': str(instance.created_by.id) if instance.created_by else None,
                        'creatorName': instance.created_by.full_name if instance.created_by else None,
                        'requiresApproval': True
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Proceed with deletion
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'], url_path='request-deletion')
    def request_deletion(self, request, pk=None):
        """
        POST /orders/{id}/request-deletion/
        Request deletion approval from the order creator.
        Creates a DeletionRequest and notifies the creator.
        """
        from .models_deletion_request import DeletionRequest, DeletionRequestStatus
        from .serializers_deletion_request import DeletionRequestSerializer, DeletionRequestCreateSerializer
        from apps.core.models import Notification
        
        order = self.get_object()
        user = request.user
        
        # Check if order has a creator
        if not order.created_by:
            return Response(
                {'error': 'This order has no creator assigned. You can delete it directly.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is the creator (shouldn't request from themselves)
        if order.created_by == user:
            return Response(
                {'error': 'You are the creator of this order. You can delete it directly.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for existing pending request
        existing = DeletionRequest.objects.filter(
            order=order,
            status=DeletionRequestStatus.PENDING
        ).first()
        
        if existing:
            return Response(
                {'error': 'A deletion request is already pending for this order.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the deletion request
        serializer = DeletionRequestCreateSerializer(
            data=request.data,
            context={'order': order, 'requester': user}
        )
        serializer.is_valid(raise_exception=True)
        deletion_request = serializer.save()
        
        # Create notification for the order creator
        style_display = order.style_number or order.base_style_number or 'N/A'
        Notification.objects.create(
            user=order.created_by,
            title='Deletion Request',
            message=f'{user.full_name} wants to delete Order #{order.order_number} - {style_display}. Click to review.',
            notification_type='deletion_request',
            related_id=str(deletion_request.id),
            related_type='deletion_request',
            severity='warning'
        )
        
        response_serializer = DeletionRequestSerializer(deletion_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        GET /orders/stats/
        Get order statistics
        """
        queryset = self.get_queryset()
        
        # Calculate statistics
        stats = {
            'total_orders': queryset.count(),
            'upcoming_orders': queryset.filter(category=OrderCategory.UPCOMING).count(),
            'running_orders': queryset.filter(category=OrderCategory.RUNNING).count(),
            'completed_orders': queryset.filter(status=OrderStatus.COMPLETED).count(),
            'archived_orders': queryset.filter(category=OrderCategory.ARCHIVED).count(),
            'total_value': queryset.aggregate(
                total=Sum('prova_price')
            )['total'] or 0,
            'recent_orders': queryset.order_by('-created_at')[:5]
        }
        
        serializer = OrderStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='alerts/upcoming-etd')
    def alerts_upcoming_etd(self, request):
        """Return orders with ETD between today and today + days (default 7).
        Excludes completed and archived statuses.
        """
        days_param = request.query_params.get('days')
        try:
            days = int(days_param) if days_param is not None else 7
            if days < 0:
                raise ValueError
        except ValueError:
            raise ValidationError('Invalid days parameter. Must be a non-negative integer')

        today = date.today()
        upper_date = today + timedelta(days=days)

        queryset = (
            self.get_queryset()
            .filter(etd__isnull=False, etd__gte=today, etd__lte=upper_date)
            .exclude(status__in=[OrderStatus.COMPLETED, OrderStatus.ARCHIVED])
            .order_by('etd')
        )

        serializer = OrderAlertSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='alerts/stuck-approvals')
    def alerts_stuck_approvals(self, request):
        """Return orders with pending approvals, ideally stuck for more than 3 days.
        Uses updated_at <= now - 3 days as the heuristic.
        """
        base_queryset = self.get_queryset()

        pending_filter = (
            Q(approval_status__contains={'labDip': 'pending'}) |
            Q(approval_status__contains={'strikeOff': 'pending'}) |
            Q(approval_status__contains={'qualityTest': 'pending'}) |
            Q(approval_status__contains={'bulkSwatch': 'pending'}) |
            Q(approval_status__contains={'ppSample': 'pending'})
        )

        three_days_ago = timezone.now() - timedelta(days=3)

        queryset = (
            base_queryset
            .filter(pending_filter)
            .filter(updated_at__lte=three_days_ago)
            .exclude(status__in=[OrderStatus.COMPLETED, OrderStatus.ARCHIVED])
            .order_by('etd')
        )

        serializer = OrderAlertSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='approvals')
    def update_approval(self, request, pk=None):
        """
        PATCH /orders/{id}/approvals/
        Update order or line-level approval status
        
        Request body:
        {
            "approvalType": "labDip",
            "status": "approved",
            "orderLineId": "uuid" (optional - for line-level approvals),
            "customTimestamp": "2024-01-15T10:30:00Z" (optional - for backdating approval)
        }
        """
        from .models_order_line import OrderLine
        
        order = self.get_object()
        serializer = ApprovalUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        approval_type = serializer.validated_data['approval_type']
        approval_status = serializer.validated_data['status']
        order_line_id = serializer.validated_data.get('order_line_id')
        custom_timestamp = serializer.validated_data.get('custom_timestamp')
        
        order_line = None
        
        if order_line_id:
            # Line-level approval
            try:
                order_line = OrderLine.objects.get(id=order_line_id, style__order=order)
            except OrderLine.DoesNotExist:
                return Response(
                    {'error': 'Order line not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Store previous status for history tracking
            if not order_line.approval_status:
                order_line.approval_status = {}
            previous_status = order_line.approval_status.get(approval_type, '')
            
            # Update line approval status
            if approval_status:  # Only set if not empty (not "Default")
                order_line.approval_status[approval_type] = approval_status
            elif approval_type in order_line.approval_status:
                # If setting to empty/default, remove the key
                del order_line.approval_status[approval_type]
            
            order_line.save(update_fields=['approval_status', 'updated_at'])
            
            # Update approval_date if status is approved
            if approval_status == 'approved' and not order_line.approval_date:
                # Use custom timestamp date if provided, otherwise use current date
                if custom_timestamp:
                    order_line.approval_date = custom_timestamp.date()
                else:
                    order_line.approval_date = timezone.now().date()
                order_line.save(update_fields=['approval_date', 'updated_at'])
            
            # Aggregate line approvals to order level
            self._aggregate_line_approvals_to_order(order, approval_type)
        else:
            # Order-level approval (backwards compatible)
            previous_status = (order.approval_status or {}).get(approval_type, '') if order.approval_status else ''
            order.update_approval_status(approval_type, approval_status)
        
        # Create approval history record only if status actually changed AND it's not empty/default
        # This ensures "Default" doesn't create timeline events, but changing from "Default" to "Submission" does
        should_create_history = approval_status and (not previous_status or previous_status != approval_status)
        
        if should_create_history:
            history_entry = ApprovalHistory.objects.create(
                order=order,
                order_line=order_line,
                approval_type=approval_type,
                status=approval_status,
                changed_by=request.user if request.user.is_authenticated else None
            )
            
            # If custom timestamp provided, update the created_at field
            # Using QuerySet.update() bypasses auto_now_add behavior
            if custom_timestamp:
                ApprovalHistory.objects.filter(pk=history_entry.pk).update(created_at=custom_timestamp)

        # Stage changes are now manual - no auto-progress based on approval status
        # Users must use the "Go to Next Stage" button or status dropdown to change stages
        
        # Return updated order
        response_serializer = OrderSerializer(order)
        return Response(response_serializer.data)
    
    def _aggregate_line_approvals_to_order(self, order, approval_type):
        """
        Aggregate line-level approvals to order-level approval_status
        """
        from .models_order_line import OrderLine
        
        # Get all lines for this order
        all_lines = OrderLine.objects.filter(style__order=order)
        
        if not all_lines.exists():
            return
        
        # Count approval statuses for this approval type across all lines
        approved_count = 0
        rejected_count = 0
        resubmission_count = 0
        submission_count = 0
        total_count = all_lines.count()
        
        for line in all_lines:
            line_status = (line.approval_status or {}).get(approval_type)
            if line_status == 'approved':
                approved_count += 1
            elif line_status == 'rejected':
                rejected_count += 1
            elif line_status == 'resubmission':
                resubmission_count += 1
            elif line_status == 'submission':
                submission_count += 1
        
        # Aggregate logic: if all approved → approved, else if any rejected → rejected, else highest priority status
        if not order.approval_status:
            order.approval_status = {}
        
        if approved_count == total_count:
            order.approval_status[approval_type] = 'approved'
        elif rejected_count > 0:
            order.approval_status[approval_type] = 'rejected'
        elif resubmission_count > 0:
            order.approval_status[approval_type] = 'resubmission'
        elif submission_count > 0:
            order.approval_status[approval_type] = 'submission'
        
        order.save(update_fields=['approval_status', 'updated_at'])
    
    @action(detail=True, methods=['post'], url_path='change-stage')
    def change_stage(self, request, pk=None):
        """
        POST /orders/{id}/change-stage/
        Change order stage
        
        Request body:
        {
            "stage": "Production"
        }
        """
        order = self.get_object()
        serializer = StageChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        new_stage = serializer.validated_data['stage']
        
        # Change stage
        order.change_stage(new_stage)
        
        # Return updated order
        response_serializer = OrderSerializer(order)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='lines/(?P<line_id>[^/.]+)/status')
    def update_line_status(self, request, pk=None, line_id=None):
        """
        PATCH /orders/{id}/lines/{line_id}/status/
        Update order line status
        
        Request body:
        {
            "status": "running"
        }
        """
        from .models_order_line import OrderLine
        
        order = self.get_object()
        
        # Get the line
        try:
            line = OrderLine.objects.get(id=line_id, style__order=order)
        except OrderLine.DoesNotExist:
            return Response(
                {'error': 'Order line not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate status
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_statuses = [choice[0] for choice in OrderStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update line status
        line.status = new_status
        line.save(update_fields=['status', 'updated_at'])
        
        # Return updated order
        response_serializer = OrderSerializer(order)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='lines/bulk-status')
    def bulk_update_line_status(self, request, pk=None):
        """
        PATCH /orders/{id}/lines/bulk-status/
        Update status for all lines in an order at once
        
        Request body:
        {
            "status": "running"
        }
        """
        from .models_order_line import OrderLine
        
        order = self.get_object()
        
        # Validate status
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_statuses = [choice[0] for choice in OrderStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all lines for this order
        lines = OrderLine.objects.filter(style__order=order)
        updated_count = lines.update(status=new_status)
        
        # Return updated order
        response_serializer = OrderSerializer(order)
        return Response({
            'order': response_serializer.data,
            'updatedCount': updated_count
        })
    
    @action(detail=True, methods=['patch'], url_path='lines/(?P<line_id>[^/.]+)/swatch-dates')
    def update_swatch_dates(self, request, pk=None, line_id=None):
        """
        PATCH /orders/{id}/lines/{line_id}/swatch-dates/
        Update order line swatch dates (for In Development status)
        
        Request body:
        {
            "swatchReceivedDate": "2024-01-15",  // optional
            "swatchSentDate": "2024-01-20"  // optional
        }
        """
        from .models_order_line import OrderLine
        from datetime import datetime
        
        order = self.get_object()
        
        # Get the line
        try:
            line = OrderLine.objects.get(id=line_id, style__order=order)
        except OrderLine.DoesNotExist:
            return Response(
                {'error': 'Order line not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse and update dates
        update_fields = ['updated_at']
        
        swatch_received = request.data.get('swatchReceivedDate')
        swatch_sent = request.data.get('swatchSentDate')
        
        if swatch_received is not None:
            if swatch_received == '' or swatch_received == 'null':
                line.swatch_received_date = None
            else:
                try:
                    line.swatch_received_date = datetime.strptime(swatch_received, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Invalid swatchReceivedDate format. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            update_fields.append('swatch_received_date')
        
        if swatch_sent is not None:
            if swatch_sent == '' or swatch_sent == 'null':
                line.swatch_sent_date = None
            else:
                try:
                    line.swatch_sent_date = datetime.strptime(swatch_sent, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Invalid swatchSentDate format. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            update_fields.append('swatch_sent_date')
        
        line.save(update_fields=update_fields)
        
        # Return updated order
        response_serializer = OrderSerializer(order)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['get'], url_path='documents')
    def get_documents(self, request, pk=None):
        """
        GET /orders/{id}/documents/
        Get all documents for this order
        """
        order = self.get_object()
        documents = Document.objects.filter(order=order)
        serializer = DocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='documents/upload', 
            permission_classes=[permissions.IsAuthenticated, IsMerchandiser])
    def upload_document(self, request, pk=None):
        """
        POST /orders/{id}/documents/upload/
        Upload document for order - saves to local disk
        
        Category-specific logic:
        - PI: Only rename to "revised PI" if there are existing PI documents (subsequent uploads)
        - LC: Rename new file to "Amended LC"
        - Other: Keep all previous documents
        """
        order = self.get_object()
        
        # Get file and metadata from request
        uploaded_file = request.FILES.get('file')
        category = request.data.get('category')
        subcategory = request.data.get('subcategory', None)
        description = request.data.get('description', None)
        order_line_id = request.data.get('orderLine', None)
        document_date_str = request.data.get('documentDate', None)
        
        if not uploaded_file:
            return Response({
                'error': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate category
        if category not in dict(Document.Category.choices).keys():
            return Response({
                'error': f'Invalid category. Must be one of: {", ".join(dict(Document.Category.choices).keys())}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate order_line if provided
        order_line = None
        if order_line_id and order_line_id != 'none':
            try:
                from apps.orders.models_order_line import OrderLine
                order_line = OrderLine.objects.get(id=order_line_id, style__order=order)
            except OrderLine.DoesNotExist:
                return Response({
                    'error': 'Invalid order line'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle category-specific logic
        original_filename = uploaded_file.name
        file_name = original_filename
        
        if category == Document.Category.PI:
            # Check if there are existing PI documents for this order
            previous_pi_documents = Document.objects.filter(
                order=order,
                category=Document.Category.PI
            )
            
            # Only rename to "revised PI" if there are existing PIs
            if previous_pi_documents.exists():
                # Delete all previous PI documents
                for doc in previous_pi_documents:
                    doc.delete()  # This will also delete the physical file
                
                # Rename file to "revised PI"
                file_extension = original_filename.split('.')[-1] if '.' in original_filename else ''
                if file_extension:
                    file_name = f"revised_PI.{file_extension}"
                else:
                    file_name = "revised_PI"
            # If no existing PIs, keep the original filename (first upload)
        
        elif category == Document.Category.LC:
            # Rename file to "Amended LC"
            file_extension = original_filename.split('.')[-1] if '.' in original_filename else ''
            if file_extension:
                file_name = f"Amended_LC.{file_extension}"
            else:
                file_name = "Amended_LC"
        
        # Parse document date if provided
        document_date = None
        if document_date_str:
            try:
                document_date = datetime.strptime(document_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass  # If invalid format, use None (will fall back to created_at)
        
        # Create document record and save file
        document = Document.objects.create(
            order=order,
            order_line=order_line,
            file=uploaded_file,
            file_name=file_name,
            file_type=uploaded_file.content_type,
            file_size=uploaded_file.size,
            category=category,
            subcategory=subcategory if subcategory else None,
            description=description if description else None,
            document_date=document_date,
            uploaded_by=request.user
        )
        
        # Return serialized document
        serializer = DocumentSerializer(document, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], url_path='documents/(?P<doc_id>[^/.]+)/download')
    def download_document(self, request, pk=None, doc_id=None):
        """
        GET /orders/{id}/documents/{doc_id}/download/
        Download a document with Content-Disposition: attachment header
        This forces the browser to download instead of displaying the file
        """
        import requests
        from django.conf import settings
        from apps.core.utils import get_file_presigned_url, is_r2_storage_enabled
        
        order = self.get_object()
        
        try:
            document = Document.objects.get(id=doc_id, order=order)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the file
        if document.file:
            try:
                # For R2 storage, fetch file from URL and serve with download headers
                if is_r2_storage_enabled():
                    file_url = get_file_presigned_url(document.file)
                    if file_url:
                        # Fetch the file from R2
                        file_response = requests.get(file_url, timeout=30)
                        if file_response.status_code == 200:
                            response = HttpResponse(
                                file_response.content,
                                content_type=document.file_type or 'application/octet-stream'
                            )
                            response['Content-Disposition'] = f'attachment; filename="{document.file_name}"'
                            response['Content-Length'] = len(file_response.content)
                            return response
                        else:
                            return Response(
                                {'error': 'Failed to fetch file from storage'},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR
                            )
                else:
                    # For local storage, serve file directly
                    response = FileResponse(
                        document.file.open('rb'),
                        content_type=document.file_type or 'application/octet-stream'
                    )
                    response['Content-Disposition'] = f'attachment; filename="{document.file_name}"'
                    return response
            except Exception as e:
                return Response(
                    {'error': f'Failed to download file: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            {'error': 'File not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['get'], url_path='lines/(?P<line_id>[^/.]+)/approval-history')
    def get_line_approval_history(self, request, pk=None, line_id=None):
        """
        GET /orders/{id}/lines/{line_id}/approval-history/
        Get approval history for a specific order line
        """
        from .models_order_line import OrderLine
        from .serializers import ApprovalHistorySerializer
        
        order = self.get_object()
        
        # Get the line
        try:
            line = OrderLine.objects.get(id=line_id, style__order=order)
        except OrderLine.DoesNotExist:
            return Response(
                {'error': 'Order line not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get approval history for this logical line
        # We match by:
        # 1. Specific OrderLine row (if FK still points to valid line)
        # 2. Same (style, color_code) - more lenient matching that ignores cad_code changes
        # 3. Orphaned records (order_line=NULL) - these were SET_NULL when lines were
        #    deleted during previous buggy edits
        # This ensures earlier phases remain visible even if the line row was
        # recreated during edits or if cad_code changed.
        from django.db.models import Q

        style = getattr(line, 'style', None)

        line_match = Q(order_line=line)
        if style is not None:
            # Match by style + color_code only (more lenient)
            # This handles cases where cad_code changes or is missing
            if line.color_code:
                line_match |= Q(
                    order_line__style=style,
                    order_line__color_code=line.color_code,
                )
            else:
                # For lines without color_code, match by style only
                line_match |= Q(order_line__style=style)
        
        # Also include orphaned records (where order_line was SET_NULL)
        # These are approval history records that lost their line FK when lines
        # were deleted during previous buggy edit operations.
        # Since we filter by order, this only includes orphaned records for this order.
        line_match |= Q(order_line__isnull=True)

        history = (
            ApprovalHistory.objects
            .filter(order=order)
            .filter(line_match)
            .order_by('created_at')
        )
        
        serializer = ApprovalHistorySerializer(history, many=True)

        # Prefer line-level ETD/ETA, but fall back to style-level or order-level
        etd_source = line.etd or (style.etd if style is not None else None) or order.etd
        eta_source = line.eta or (style.eta if style is not None else None) or order.eta
        
        response_data = {
            'history': serializer.data,
            'etd': etd_source.isoformat() if etd_source else None,
            'eta': eta_source.isoformat() if eta_source else None,
        }
        
        return Response(response_data)

    @action(detail=True, methods=['patch'], url_path='approval-history/(?P<history_id>[^/.]+)')
    def update_approval_history(self, request, pk=None, history_id=None):
        """
        PATCH /orders/{id}/approval-history/{history_id}/
        Update an approval history entry (date/time, status, notes)
        
        Request body:
        {
            "status": "approved" (optional),
            "notes": "some notes" (optional),
            "customTimestamp": "2024-01-15T10:30:00Z" (optional)
        }
        """
        order = self.get_object()
        
        try:
            history_entry = ApprovalHistory.objects.get(id=history_id, order=order)
        except ApprovalHistory.DoesNotExist:
            return Response(
                {'error': 'Approval history entry not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ApprovalHistoryUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update fields if provided
        if 'status' in serializer.validated_data:
            history_entry.status = serializer.validated_data['status']
            
            # Also update the line's approval_status if this is a line-level approval
            if history_entry.order_line:
                order_line = history_entry.order_line
                if not order_line.approval_status:
                    order_line.approval_status = {}
                order_line.approval_status[history_entry.approval_type] = serializer.validated_data['status']
                order_line.save(update_fields=['approval_status', 'updated_at'])
        
        if 'notes' in serializer.validated_data:
            history_entry.notes = serializer.validated_data['notes']
        
        history_entry.save()
        
        # Update created_at if custom timestamp provided
        if 'customTimestamp' in serializer.validated_data and serializer.validated_data['customTimestamp']:
            ApprovalHistory.objects.filter(pk=history_entry.pk).update(
                created_at=serializer.validated_data['customTimestamp']
            )
            history_entry.refresh_from_db()
        
        response_serializer = ApprovalHistorySerializer(history_entry)
        return Response(response_serializer.data)

    @action(detail=True, methods=['delete'], url_path='approval-history/(?P<history_id>[^/.]+)/delete')
    def delete_approval_history(self, request, pk=None, history_id=None):
        """
        DELETE /orders/{id}/approval-history/{history_id}/delete/
        Delete an approval history entry
        
        This also updates the line's current approval_status to the previous
        status in the history, or removes it if no previous entries exist.
        """
        order = self.get_object()
        
        try:
            history_entry = ApprovalHistory.objects.get(id=history_id, order=order)
        except ApprovalHistory.DoesNotExist:
            return Response(
                {'error': 'Approval history entry not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        order_line = history_entry.order_line
        approval_type = history_entry.approval_type
        
        # Delete the entry
        history_entry.delete()
        
        # Update the line's approval_status to reflect the previous state
        if order_line:
            # Find the most recent remaining history entry for this approval type
            previous_entry = ApprovalHistory.objects.filter(
                order=order,
                order_line=order_line,
                approval_type=approval_type
            ).order_by('-created_at').first()
            
            if not order_line.approval_status:
                order_line.approval_status = {}
            
            if previous_entry:
                # Set to previous status
                order_line.approval_status[approval_type] = previous_entry.status
            else:
                # No history left, remove the approval status
                if approval_type in order_line.approval_status:
                    del order_line.approval_status[approval_type]
            
            order_line.save(update_fields=['approval_status', 'updated_at'])
            
            # Aggregate line approvals to order level
            self._aggregate_line_approvals_to_order(order, approval_type)
        
        return Response({'message': 'Approval history entry deleted successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='download-po')
    def download_po(self, request, pk=None):
        order = self.get_object()

        buffer = BytesIO()
        generate_purchase_order_pdf(order, buffer)
        buffer.seek(0)

        order_identifier = getattr(order, "order_number", None) or str(getattr(order, "id", ""))
        filename = f"PO_{order_identifier}.pdf"

        response = FileResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Extract filters for filename generation
        filters = {
            'status': request.query_params.get('status'),
            'category': request.query_params.get('category'),
            'merchandiser': request.query_params.get('merchandiserId'),
            'search': request.query_params.get('search'),
        }
        
        workbook, filename = generate_orders_excel(queryset, filters)

        output = BytesIO()
        workbook.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='export-tna')
    def export_tna(self, request):
        """
        GET /orders/export-tna/
        Export TnA (Time and Action) Excel for local orders.
        Format matches the TNA-Tubulor.xls template.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filter for local orders only
        queryset = queryset.filter(order_type='local')
        
        # Extract filters for filename generation
        filters = {
            'status': request.query_params.get('status'),
            'search': request.query_params.get('search'),
        }
        
        workbook, filename = generate_tna_excel(queryset, filters)

        output = BytesIO()
        workbook.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

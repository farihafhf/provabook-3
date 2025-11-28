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
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.http import HttpResponse, FileResponse
from .models import Order, OrderStatus, OrderCategory, Document, ApprovalHistory
from .serializers import (
    OrderSerializer, OrderCreateSerializer, OrderUpdateSerializer,
    OrderListSerializer, OrderAlertSerializer, OrderStatsSerializer, ApprovalUpdateSerializer,
    StageChangeSerializer, DocumentSerializer
)
from .filters import OrderFilter
from .utils.export import generate_orders_excel, generate_purchase_order_pdf
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
    queryset = Order.objects.select_related('merchandiser').prefetch_related(
        'styles__lines',
        'styles__colors'
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
        """
        if self.action in ['list', 'stats', 'export_excel']:
            self._validate_date_params()
        queryset = super().get_queryset()
        user = self.request.user
        
        # Merchandisers only see their own orders
        if user.role == 'merchandiser':
            queryset = queryset.filter(merchandiser=user)
        
        # Apply query parameters
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        category_param = self.request.query_params.get('category')
        if category_param:
            queryset = queryset.filter(category=category_param)
        
        merchandiser_param = self.request.query_params.get('merchandiserId')
        if merchandiser_param and user.role in ['admin', 'manager']:
            queryset = queryset.filter(merchandiser_id=merchandiser_param)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set merchandiser to current user when creating order"""
        serializer.save(merchandiser=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create order with custom response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save(merchandiser=request.user)
        
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
            "orderLineId": "uuid" (optional - for line-level approvals)
        }
        """
        from .models_order_line import OrderLine
        
        order = self.get_object()
        serializer = ApprovalUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        approval_type = serializer.validated_data['approval_type']
        approval_status = serializer.validated_data['status']
        order_line_id = serializer.validated_data.get('order_line_id')
        
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
            ApprovalHistory.objects.create(
                order=order,
                order_line=order_line,
                approval_type=approval_type,
                status=approval_status,
                changed_by=request.user if request.user.is_authenticated else None
            )

        # Auto-progress logic based on order status
        approvals = order.approval_status or {}
        
        # If Running Order: check if all running approvals are approved → auto-advance to Bulk
        if order.status == OrderStatus.RUNNING:
            running_approvals = ['labDip', 'ppSample', 'handloom']
            strike_off_approved = approvals.get('strikeOff') == 'approved'
            
            if strike_off_approved and all(approvals.get(g) == 'approved' for g in running_approvals):
                order.status = OrderStatus.BULK
                order.save(update_fields=['status', 'updated_at'])
        
        # If Upcoming/In Development: check if Quality and Price are approved → auto-advance to Running Order
        elif order.status in [OrderStatus.UPCOMING, OrderStatus.IN_DEVELOPMENT]:
            quality_approved = approvals.get('quality') == 'approved' or approvals.get('qualityTest') == 'approved'
            price_approved = approvals.get('price') == 'approved' or approvals.get('bulkSwatch') == 'approved'
            
            if quality_approved and price_approved:
                order.status = OrderStatus.RUNNING
                order.category = OrderCategory.RUNNING
                order.save(update_fields=['status', 'category', 'updated_at'])
        
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
            uploaded_by=request.user
        )
        
        # Return serialized document
        serializer = DocumentSerializer(document, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
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

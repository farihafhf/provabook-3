"""
Core views - Dashboard and other shared endpoints
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth
from apps.orders.models import Order, OrderStatus, OrderCategory
from datetime import date, timedelta
from .models import Notification
from .serializers import NotificationSerializer
from rest_framework.decorators import action


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def samples_list_view(request):
    """
    GET /api/v1/samples
    Return empty list for now - to be implemented
    """
    return Response([])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financials_list_view(request):
    """
    GET /api/v1/financials
    Return empty list for now - to be implemented
    """
    return Response([])


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def document_delete_view(request, document_id):
    """
    DELETE /api/v1/orders/documents/{document_id}
    Delete a document from disk and database
    """
    from apps.orders.models import Document
    from django.shortcuts import get_object_or_404
    
    # Get the document
    document = get_object_or_404(Document, id=document_id)
    
    # Check permissions - user must be the uploader or admin
    is_admin_or_manager = request.user.role in ['admin', 'manager']
    is_uploader = document.uploaded_by_id == request.user.id
    is_order_merchandiser = getattr(document.order, 'merchandiser_id', None) == request.user.id

    if not (is_admin_or_manager or is_uploader or is_order_merchandiser):
        return Response({
            'error': 'You do not have permission to delete this document'
        }, status=403)
    
    # Delete the document (will also delete file from disk)
    document.delete()
    
    return Response({
        'message': 'Document deleted successfully'
    }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """
    GET /api/v1/dashboard
    Return dashboard statistics matching frontend expectations
    """
    user = request.user
    
    # Get orders queryset based on role
    if user.role == 'merchandiser':
        # Only show orders where this user is the assigned merchandiser
        orders = Order.objects.filter(merchandiser=user)
    else:
        # Managers see all orders
        orders = Order.objects.all()
    
    # Get recent orders and format them as activities
    recent_orders = orders.order_by('-created_at')[:5]
    recent_activities = []
    for order in recent_orders:
        # Create activity from order
        activity = {
            'id': str(order.id),
            'action': f'created order',
            'userName': order.merchandiser.full_name if order.merchandiser else 'Unknown',
            'orderNumber': order.order_number,
            'customerName': order.customer_name,
            'buyerName': order.buyer_name,
            'timestamp': order.created_at.isoformat() if order.created_at else None,
            'details': {
                'fabricType': order.fabric_type,
                'quantity': float(order.quantity),
                'unit': order.unit,
                'status': order.status,
            }
        }
        recent_activities.append(activity)
    
    # Calculate statistics based on role
    if user.role == 'merchandiser':
        # Merchandiser Dashboard
        stats = {
            'myTotalCount': orders.count(),
            'myUpcomingCount': orders.filter(category=OrderCategory.UPCOMING).count(),
            'myRunningCount': orders.filter(category=OrderCategory.RUNNING).count(),
            'myArchivedCount': orders.filter(category=OrderCategory.ARCHIVED).count(),
            'recentActivities': recent_activities
        }
    else:
        # Manager/Admin Dashboard
        stats = {
            'totalCount': orders.count(),
            'upcomingCount': orders.filter(category=OrderCategory.UPCOMING).count(),
            'runningCount': orders.filter(category=OrderCategory.RUNNING).count(),
            'archivedCount': orders.filter(category=OrderCategory.ARCHIVED).count(),
            'recentActivities': recent_activities
        }
    
    # Build effective ETD/ETA per order using order-level, style-level and color-level dates
    order_rows = list(orders.values_list('id', 'etd', 'eta', 'status', 'category'))
    order_ids = [row[0] for row in order_rows]

    etd_sources = {}
    eta_sources = {}
    status_map = {}
    category_map = {}

    for order_id, order_etd, order_eta, status, category in order_rows:
        status_map[order_id] = status
        category_map[order_id] = category
        if order_etd:
            etd_sources.setdefault(order_id, []).append(order_etd)
        if order_eta:
            eta_sources.setdefault(order_id, []).append(order_eta)

    if order_ids:
        # Import here to avoid circular imports at module load time
        from apps.orders.models_style_color import OrderStyle, OrderColor

        # Style-level dates
        style_rows = OrderStyle.objects.filter(order_id__in=order_ids).values_list('order_id', 'etd', 'eta')
        for order_id, style_etd, style_eta in style_rows:
            if style_etd:
                etd_sources.setdefault(order_id, []).append(style_etd)
            if style_eta:
                eta_sources.setdefault(order_id, []).append(style_eta)

        # Color-level dates
        color_rows = OrderColor.objects.filter(style__order_id__in=order_ids).values_list('style__order_id', 'etd', 'eta')
        for order_id, color_etd, color_eta in color_rows:
            if color_etd:
                etd_sources.setdefault(order_id, []).append(color_etd)
            if color_eta:
                eta_sources.setdefault(order_id, []).append(color_eta)

    effective_etd = {}
    effective_eta = {}

    for order_id in order_ids:
        etd_dates = etd_sources.get(order_id)
        if etd_dates:
            effective_etd[order_id] = min(etd_dates)
        eta_dates = eta_sources.get(order_id)
        if eta_dates:
            effective_eta[order_id] = min(eta_dates)

    # Common additions: Orders by current stage and upcoming ETD/ETA windows
    stage_counts = orders.values('current_stage').annotate(count=Count('id')).order_by()
    by_stage = {item['current_stage'] or 'Unknown': item['count'] for item in stage_counts}

    today = date.today()

    def build_window_counts(effective_dates):
        """Build upcoming buckets based on earliest date per order.

        Buckets are interpreted on the frontend as:
          - next7  -> within 5 days (high risk)
          - next14 -> within 10 days (medium risk)
          - next30 -> within 30 days
        Completed and archived orders are excluded from upcoming buckets.
        """
        in_5 = today + timedelta(days=5)
        in_10 = today + timedelta(days=10)
        in_30 = today + timedelta(days=30)

        counts = {
            'next7': 0,
            'next14': 0,
            'next30': 0,
            'overdue': 0,
        }

        for order_id, event_date in effective_dates.items():
            # Skip archived/completed orders from upcoming risk buckets
            if category_map.get(order_id) == OrderCategory.ARCHIVED:
                continue
            if status_map.get(order_id) == OrderStatus.COMPLETED:
                continue

            diff_days = (event_date - today).days

            if diff_days < 0:
                counts['overdue'] += 1
            elif diff_days <= 5:
                counts['next7'] += 1
            elif diff_days <= 10:
                counts['next14'] += 1
            elif diff_days <= 30:
                counts['next30'] += 1

        return counts

    stats['byStage'] = by_stage
    stats['upcoming'] = {
        'etd': build_window_counts(effective_etd),
        'eta': build_window_counts(effective_eta),
    }

    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats_view(request):
    """
    GET /api/v1/dashboard/stats/
    Return aggregated statistics for dashboard charts
    """
    user = request.user
    
    # Get orders queryset based on role
    if user.role == 'merchandiser':
        # Only show orders where this user is the assigned merchandiser
        orders = Order.objects.filter(merchandiser=user)
    else:
        # Managers see all orders
        orders = Order.objects.all()
    
    # 1. Orders by Stage (aggregated from LINE statuses, not parent order status)
    # This counts orders that have at least one line with each status
    orders_by_stage = []
    
    from apps.orders.models_order_line import OrderLine
    from django.db.models import Exists, OuterRef
    
    # Status map for display names
    status_map = {
        'upcoming': 'Upcoming',
        'in_development': 'In Development',
        'running': 'Running',
        'bulk': 'Bulk',
        'completed': 'Completed',
        'archived': 'Archived',
    }
    
    # Count orders by the status of their lines (aggregated approach)
    # An order is counted for a status if it has at least one line with that status
    for status_key, status_name in status_map.items():
        order_count = orders.filter(
            Exists(
                OrderLine.objects.filter(
                    style__order=OuterRef('pk'),
                    status=status_key
                )
            )
        ).distinct().count()
        
        if order_count > 0:
            orders_by_stage.append({
                'name': status_name,
                'value': order_count,
            })
    
    # 2. Orders by Merchandiser (only for admin/manager)
    orders_by_merchandiser = []
    if user.role in ['admin', 'manager']:
        merchandiser_counts = Order.objects.filter(
            merchandiser__isnull=False
        ).values(
            'merchandiser__full_name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:10]  # Top 10 merchandisers
        
        for item in merchandiser_counts:
            orders_by_merchandiser.append({
                'name': item['merchandiser__full_name'] or 'Unknown',
                'value': item['count']
            })
    
    # 3. Orders Trend (last 6 months)
    orders_trend = []
    today = date.today()
    
    # Calculate 6 months ago using timedelta (approximately)
    # Go back roughly 180 days to cover 6 months
    six_months_ago = today - timedelta(days=180)
    
    # Get orders from last 6 months, grouped by month
    monthly_counts = orders.filter(
        created_at__gte=six_months_ago
    ).annotate(
        month=TruncMonth('created_at')
    ).values('month').annotate(
        count=Count('id')
    ).order_by('month')
    
    # Create a complete list of last 6 months with counts
    month_map = {}
    for item in monthly_counts:
        if item['month']:
            month_map[item['month'].strftime('%b')] = item['count']
    
    # Fill in all 6 months (including zeros) using simple month calculation
    for i in range(6):
        # Calculate month offset from current month
        target_year = today.year
        target_month = today.month - (5 - i)
        
        # Adjust year if month goes negative
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        
        # Create date for that month
        month_date = date(target_year, target_month, 1)
        month_name = month_date.strftime('%b')
        
        orders_trend.append({
            'name': month_name,
            'value': month_map.get(month_name, 0)
        })
    
    return Response({
        'orders_by_stage': orders_by_stage,
        'orders_by_merchandiser': orders_by_merchandiser,
        'orders_trend': orders_trend,
        'total_orders': orders.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def orders_by_merchandiser_view(request):
    """
    GET /api/v1/dashboard/orders-by-merchandiser/
    Return orders for a specific merchandiser with their styles and buyer names
    Query params:
      - merchandiser_name: Full name of the merchandiser
    """
    merchandiser_name = request.query_params.get('merchandiser_name')
    
    if not merchandiser_name:
        return Response({
            'error': 'merchandiser_name parameter is required'
        }, status=400)
    
    # Get orders for this merchandiser
    # Filter by merchandiser full_name and only get Running orders
    orders = Order.objects.filter(
        merchandiser__full_name=merchandiser_name,
        status='running'
    ).select_related('merchandiser').order_by('-created_at')
    
    # Format the orders data
    orders_data = []
    for order in orders:
        orders_data.append({
            'id': str(order.id),
            'order_number': order.order_number,
            'style': order.style_number or 'N/A',
            'buyer': order.buyer_name or 'N/A',
            'customer': order.customer_name or 'N/A',
            'quantity': float(order.quantity) if order.quantity else 0,
            'unit': order.unit,
            'status': order.status,
            'current_stage': order.current_stage or 'N/A',
        })
    
    return Response({
        'merchandiser_name': merchandiser_name,
        'total_orders': len(orders_data),
        'orders': orders_data
    })


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Return simple list (no pagination)
    
    def get_queryset(self):
        """Return notifications for current user only"""
        return Notification.objects.filter(
            user=self.request.user
        ).order_by('-created_at')
    
    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """GET /notifications/unread-count/ - count of unread notifications"""
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({'unreadCount': count})
    
    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """POST /notifications/{id}/mark-read/ - mark a specific notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """POST /notifications/mark-all-read/ - mark all notifications as read"""
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})
    
    @action(detail=True, methods=['delete'], url_path='clear')
    def clear(self, request, pk=None):
        """DELETE /notifications/{id}/clear/ - delete a specific notification"""
        notification = self.get_object()
        notification.delete()
        return Response({'message': 'Notification cleared'})
    
    @action(detail=False, methods=['delete'], url_path='clear-all')
    def clear_all(self, request):
        """DELETE /notifications/clear-all/ - delete all notifications for the user"""
        deleted_count, _ = Notification.objects.filter(user=request.user).delete()
        return Response({'message': f'{deleted_count} notifications cleared'})

"""
Core views - Dashboard and other shared endpoints
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from apps.orders.models import Order, OrderStatus, OrderCategory
from datetime import date, timedelta


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
    if request.user.role not in ['admin', 'manager'] and document.uploaded_by != request.user:
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
        orders = Order.objects.filter(merchandiser=user)
    else:
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
    
    # Common additions: Orders by current stage and upcoming ETD/ETA windows
    stage_counts = orders.values('current_stage').annotate(count=Count('id')).order_by()
    by_stage = {item['current_stage'] or 'Unknown': item['count'] for item in stage_counts}

    today = date.today()
    in_7 = today + timedelta(days=7)
    in_14 = today + timedelta(days=14)
    in_30 = today + timedelta(days=30)

    def date_window_counts(field_name):
        # Exclusive windows: 0-7, 8-14, 15-30 days
        return {
            'next7': orders.filter(**{f"{field_name}__gte": today, f"{field_name}__lte": in_7}).count(),
            'next14': orders.filter(**{f"{field_name}__gt": in_7, f"{field_name}__lte": in_14}).count(),
            'next30': orders.filter(**{f"{field_name}__gt": in_14, f"{field_name}__lte": in_30}).count(),
            'overdue': orders.filter(**{f"{field_name}__lt": today}).count(),
        }

    stats['byStage'] = by_stage
    stats['upcoming'] = {
        'etd': date_window_counts('etd'),
        'eta': date_window_counts('eta'),
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
        orders = Order.objects.filter(merchandiser=user)
    else:
        orders = Order.objects.all()
    
    # 1. Orders by Stage (status field)
    orders_by_stage = []
    stage_counts = orders.values('status').annotate(count=Count('id')).order_by('status')
    
    # Map status to friendly names and ensure consistent ordering
    status_map = {
        'upcoming': 'Upcoming',
        'running': 'Running',
        'completed': 'Completed',
        'archived': 'Archived'
    }
    
    for item in stage_counts:
        if item['status']:
            orders_by_stage.append({
                'name': status_map.get(item['status'], item['status'].capitalize()),
                'value': item['count']
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
        'orders_trend': orders_trend
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

"""
Core views - Dashboard and other shared endpoints
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum
from apps.orders.models import Order, OrderStatus, OrderCategory


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
    
    return Response(stats)

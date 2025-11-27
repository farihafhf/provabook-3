"""
Financials views
"""
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, F, DecimalField, Q
from django.db.models.functions import Coalesce
from .models import ProformaInvoice, LetterOfCredit
from .serializers import ProformaInvoiceSerializer, LetterOfCreditSerializer
from apps.core.permissions import IsMerchandiser
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer


class ProformaInvoiceViewSet(viewsets.ModelViewSet):
    """CRUD for Proforma Invoices"""
    queryset = ProformaInvoice.objects.select_related('order', 'created_by').all()
    serializer_class = ProformaInvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    pagination_class = None
    
    def get_queryset(self):
        """Filter by user role, search, and optionally by order"""
        user = self.request.user
        queryset = self.queryset
        
        # Filter by user role
        if user.role == 'merchandiser':
            queryset = queryset.filter(order__merchandiser=user)
        
        # Filter by search parameter (search order number, customer name, PI number)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(order__order_number__icontains=search) |
                Q(order__customer_name__icontains=search) |
                Q(pi_number__icontains=search)
            )
        
        # Filter by order if provided
        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        
        return queryset
    
    def get_serializer_context(self):
        """Add request to context for URL building"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Auto-generate PI number, increment version, and set created_by"""
        order_id = serializer.validated_data.get('order').id
        
        # Get the latest version for this order
        latest_pi = ProformaInvoice.objects.filter(order_id=order_id).order_by('-version').first()
        next_version = (latest_pi.version + 1) if latest_pi else 1
        
        # Auto-generate PI number
        pi_count = ProformaInvoice.objects.count() + 1
        pi_number = f"PI-{pi_count:05d}"
        
        serializer.save(
            pi_number=pi_number,
            version=next_version,
            created_by=self.request.user
        )
    
    def perform_update(self, serializer):
        """Ensure update is saved properly"""
        instance = serializer.save()
        print(f"PI {instance.id} updated. Status: {instance.status}")
        return instance


class LetterOfCreditViewSet(viewsets.ModelViewSet):
    """CRUD for Letters of Credit"""
    queryset = LetterOfCredit.objects.select_related('order', 'created_by').all()
    serializer_class = LetterOfCreditSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    pagination_class = None
    
    def get_queryset(self):
        """Filter by user role and search"""
        user = self.request.user
        queryset = self.queryset
        
        # Filter by user role
        if user.role == 'merchandiser':
            queryset = queryset.filter(order__merchandiser=user)
        
        # Filter by search parameter (search order number, customer name, LC number)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(order__order_number__icontains=search) |
                Q(order__customer_name__icontains=search) |
                Q(lc_number__icontains=search)
            )
        
        # Filter by order if provided
        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Auto-generate LC number and set created_by"""
        lc_count = LetterOfCredit.objects.count() + 1
        lc_number = f"LC-{lc_count:05d}"
        serializer.save(lc_number=lc_number, created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Ensure update is saved properly"""
        instance = serializer.save()
        print(f"LC {instance.id} updated. Status: {instance.status}")
        return instance


class FinancialAnalyticsView(APIView):
    """
    Financial Analytics endpoint for dashboard
    Calculates potential value, secured value, and pending LCs
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Calculate financial metrics:
        - Potential Profit: Sum of potential_profit for all orders
        - Realized Profit: Sum of realized_profit for all orders
        - Pending LCs: List of pending letters of credit
        """
        user = request.user
        
        # Base querysets filtered by user role
        if user.role == 'merchandiser':
            orders_qs = Order.objects.filter(merchandiser=user)
            lcs_qs = LetterOfCredit.objects.filter(order__merchandiser=user)
        else:
            orders_qs = Order.objects.all()
            lcs_qs = LetterOfCredit.objects.all()
        
        # Calculate Potential Profit (aggregated from all orders)
        # Sum of (prova_price - mill_price) * quantity for all orders
        all_orders = orders_qs.all()
        potential_profit = sum(order.potential_profit for order in all_orders)
        
        # Calculate Realized Profit (aggregated from all orders)
        # Sum of realized_profit (adjusted for delivered quantity) for all orders
        realized_profit = sum(order.realized_profit for order in all_orders)
        
        # Get confirmed LCs value for reference
        confirmed_lcs_value = lcs_qs.filter(
            status='confirmed'
        ).aggregate(
            total=Coalesce(Sum('amount'), 0, output_field=DecimalField())
        )['total']
        
        # Get Pending LCs
        pending_lcs = lcs_qs.filter(status='pending').select_related('order')
        pending_lcs_data = [
            {
                'id': lc.id,
                'lc_number': lc.lc_number,
                'customer': lc.order.customer_name,
                'amount': float(lc.amount),
                'currency': lc.currency,
                'issue_date': lc.issue_date.isoformat() if lc.issue_date else None,
                'expiry_date': lc.expiry_date.isoformat() if lc.expiry_date else None,
                'order_number': lc.order.order_number,
            }
            for lc in pending_lcs
        ]
        
        return Response({
            'potential': float(potential_profit),
            'secured': float(realized_profit),
            'pending_lcs': pending_lcs_data,
            'metrics': {
                'potential_orders_value': float(potential_profit),
                'secured_orders_value': float(realized_profit),
                'confirmed_lcs_value': float(confirmed_lcs_value),
            }
        })


class OrderProfitsView(APIView):
    """
    Order Profits endpoint for financials page
    Returns all orders with profit/commission data
    Supports filtering by merchandiser, buyer, PO number, style number
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Get all orders with profit information
        Query params:
        - search: Search by PO number, customer name, buyer name, style number
        - merchandiser: Filter by merchandiser ID
        - buyer: Filter by buyer name
        - po_number: Filter by PO number
        - style_number: Filter by style number
        """
        user = request.user
        
        # Base queryset filtered by user role
        if user.role == 'merchandiser':
            queryset = Order.objects.filter(merchandiser=user)
        else:
            queryset = Order.objects.all()
        
        # Apply filters
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(order_number__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(buyer_name__icontains=search) |
                Q(style_number__icontains=search)
            )
        
        merchandiser_id = request.query_params.get('merchandiser')
        if merchandiser_id:
            queryset = queryset.filter(merchandiser_id=merchandiser_id)
        
        buyer = request.query_params.get('buyer')
        if buyer:
            queryset = queryset.filter(buyer_name__icontains=buyer)
        
        po_number = request.query_params.get('po_number')
        if po_number:
            queryset = queryset.filter(order_number__icontains=po_number)
        
        style_number = request.query_params.get('style_number')
        if style_number:
            queryset = queryset.filter(style_number__icontains=style_number)
        
        # Select related to optimize queries
        queryset = queryset.select_related('merchandiser').prefetch_related('supplier_deliveries')
        
        # Order by creation date (newest first)
        queryset = queryset.order_by('-created_at')
        
        # Serialize the orders
        serializer = OrderSerializer(queryset, many=True)
        
        return Response(serializer.data)

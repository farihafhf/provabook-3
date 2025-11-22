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


class ProformaInvoiceViewSet(viewsets.ModelViewSet):
    """CRUD for Proforma Invoices"""
    queryset = ProformaInvoice.objects.select_related('order', 'created_by').all()
    serializer_class = ProformaInvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    pagination_class = None
    
    def get_queryset(self):
        """Filter by user role"""
        user = self.request.user
        if user.role == 'merchandiser':
            return self.queryset.filter(order__merchandiser=user)
        return self.queryset
    
    def perform_create(self, serializer):
        """Auto-generate PI number and set created_by"""
        pi_count = ProformaInvoice.objects.count() + 1
        pi_number = f"PI-{pi_count:05d}"
        serializer.save(pi_number=pi_number, created_by=self.request.user)
    
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
        """Filter by user role"""
        user = self.request.user
        if user.role == 'merchandiser':
            return self.queryset.filter(order__merchandiser=user)
        return self.queryset
    
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
        - Potential Value: Sum of (prova_price * quantity) for Upcoming orders
        - Secured Value: Sum of (prova_price * quantity) for Running/Completed orders + confirmed LCs
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
        
        # Calculate Potential Value (Upcoming orders)
        potential_value = orders_qs.filter(
            status='upcoming'
        ).aggregate(
            total=Coalesce(
                Sum(F('prova_price') * F('quantity'), output_field=DecimalField()),
                0,
                output_field=DecimalField()
            )
        )['total']
        
        # Calculate Secured Value (Running, Completed orders)
        secured_orders_value = orders_qs.filter(
            Q(status='running') | Q(status='completed')
        ).aggregate(
            total=Coalesce(
                Sum(F('prova_price') * F('quantity'), output_field=DecimalField()),
                0,
                output_field=DecimalField()
            )
        )['total']
        
        # Add confirmed LCs to secured value
        confirmed_lcs_value = lcs_qs.filter(
            status='confirmed'
        ).aggregate(
            total=Coalesce(Sum('amount'), 0, output_field=DecimalField())
        )['total']
        
        secured_value = float(secured_orders_value) + float(confirmed_lcs_value)
        
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
            'potential': float(potential_value),
            'secured': float(secured_value),
            'pending_lcs': pending_lcs_data,
            'metrics': {
                'potential_orders_value': float(potential_value),
                'secured_orders_value': float(secured_orders_value),
                'confirmed_lcs_value': float(confirmed_lcs_value),
            }
        })

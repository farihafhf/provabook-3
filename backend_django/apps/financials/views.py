"""
Financials views
"""
from rest_framework import viewsets, permissions
from .models import ProformaInvoice, LetterOfCredit
from .serializers import ProformaInvoiceSerializer, LetterOfCreditSerializer
from apps.core.permissions import IsMerchandiser


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

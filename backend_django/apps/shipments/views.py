"""
Shipments views
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Shipment
from .serializers import ShipmentSerializer
from apps.core.permissions import IsMerchandiser


class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related('order').all()
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'order']
    search_fields = ['awb_number', 'carrier_name', 'order__order_number']
    ordering_fields = ['shipping_date', 'created_at']
    ordering = ['-shipping_date', '-created_at']

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'merchandiser':
            return self.queryset.filter(order__merchandiser=user)
        return self.queryset

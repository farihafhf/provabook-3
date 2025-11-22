"""Production app views"""
from rest_framework import viewsets, permissions

from .models import ProductionMetric
from .serializers import ProductionMetricSerializer
from apps.core.permissions import IsMerchandiser


class ProductionMetricViewSet(viewsets.ModelViewSet):
    """CRUD viewset for ProductionMetric"""

    queryset = ProductionMetric.objects.select_related('order').all()
    serializer_class = ProductionMetricSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    pagination_class = None

    def get_queryset(self):
        """Limit data to the logged-in merchandiser where applicable"""
        user = self.request.user
        if user.role == 'merchandiser':
            return self.queryset.filter(order__merchandiser=user)
        return self.queryset

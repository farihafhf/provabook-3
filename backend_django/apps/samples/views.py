"""
Samples views
"""
from rest_framework import viewsets, permissions
from .models import Sample
from .serializers import SampleSerializer
from apps.core.permissions import IsMerchandiser


class SampleViewSet(viewsets.ModelViewSet):
    """CRUD for samples"""
    queryset = Sample.objects.select_related('order').all()
    serializer_class = SampleSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    pagination_class = None
    
    def get_queryset(self):
        """Filter by user role"""
        user = self.request.user
        if user.role == 'merchandiser':
            return self.queryset.filter(order__merchandiser=user)
        return self.queryset

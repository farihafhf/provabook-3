"""
ViewSet for MillOffer CRUD operations
"""
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models_order_line import MillOffer, OrderLine
from .serializers_order_line import MillOfferSerializer
from apps.core.permissions import IsMerchandiser


class MillOfferViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MillOffer CRUD operations
    
    Used during the 'In Development' stage to record price quotes from different mills.
    
    Endpoints:
    - GET /mill-offers/ - List all mill offers (filtered by order_line if provided)
    - POST /mill-offers/ - Create new mill offer
    - GET /mill-offers/{id}/ - Get mill offer details
    - PATCH /mill-offers/{id}/ - Update mill offer
    - DELETE /mill-offers/{id}/ - Delete mill offer
    """
    queryset = MillOffer.objects.select_related('order_line', 'order_line__style', 'order_line__style__order').all()
    serializer_class = MillOfferSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['order_line']
    search_fields = ['mill_name', 'notes']
    ordering_fields = ['mill_name', 'price', 'created_at']
    ordering = ['mill_name']
    pagination_class = None  # Disable pagination - frontend expects array directly
    
    def get_queryset(self):
        """
        Filter mill offers based on query parameters
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Merchandisers only see mill offers for their orders
        if user.role == 'merchandiser':
            queryset = queryset.filter(order_line__style__order__merchandiser=user)
        
        # Apply order_line filter if provided
        order_line_id = self.request.query_params.get('order_line')
        if order_line_id:
            queryset = queryset.filter(order_line_id=order_line_id)
        
        # Apply order filter if provided (to get all mill offers for an order)
        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_line__style__order_id=order_id)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create mill offer with validation"""
        # Convert camelCase to snake_case for order_line
        data = request.data.copy()
        if 'orderLineId' in data:
            data['order_line'] = data.pop('orderLineId')
        if 'millName' in data:
            data['mill_name'] = data.pop('millName')
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        mill_offer = serializer.save()
        
        # Return full mill offer data
        response_serializer = MillOfferSerializer(mill_offer)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update mill offer with custom response"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Convert camelCase to snake_case
        data = request.data.copy()
        if 'millName' in data:
            data['mill_name'] = data.pop('millName')
        
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full mill offer data
        response_serializer = MillOfferSerializer(instance)
        return Response(response_serializer.data)

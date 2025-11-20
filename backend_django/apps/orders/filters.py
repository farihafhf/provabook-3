"""
Orders filters
"""
from django_filters import rest_framework as filters
from .models import Order, OrderStatus, OrderCategory


class OrderFilter(filters.FilterSet):
    """
    Filter class for Order model
    """
    # Status and Category filters
    status = filters.ChoiceFilter(choices=OrderStatus.choices)
    category = filters.ChoiceFilter(choices=OrderCategory.choices)
    
    # Date range filters
    order_date_after = filters.DateFilter(field_name='order_date', lookup_expr='gte')
    order_date_before = filters.DateFilter(field_name='order_date', lookup_expr='lte')
    order_date_from = filters.DateFilter(field_name='order_date', lookup_expr='gte')
    order_date_to = filters.DateFilter(field_name='order_date', lookup_expr='lte')
    created_after = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    expected_delivery_after = filters.DateFilter(field_name='expected_delivery_date', lookup_expr='gte')
    expected_delivery_before = filters.DateFilter(field_name='expected_delivery_date', lookup_expr='lte')
    etd_from = filters.DateFilter(field_name='etd', lookup_expr='gte')
    etd_to = filters.DateFilter(field_name='etd', lookup_expr='lte')
    
    # Text filters
    customer_name = filters.CharFilter(lookup_expr='icontains')
    buyer_name = filters.CharFilter(lookup_expr='icontains')
    fabric_type = filters.CharFilter(lookup_expr='icontains')
    order_number = filters.CharFilter(lookup_expr='icontains')
    
    # Merchandiser filter
    merchandiser_id = filters.UUIDFilter(field_name='merchandiser__id')
    
    # Stage filter
    current_stage = filters.CharFilter(lookup_expr='iexact')
    
    # Price range filters
    min_price = filters.NumberFilter(field_name='prova_price', lookup_expr='gte')
    max_price = filters.NumberFilter(field_name='prova_price', lookup_expr='lte')
    
    # Quantity range filters
    min_quantity = filters.NumberFilter(field_name='quantity', lookup_expr='gte')
    max_quantity = filters.NumberFilter(field_name='quantity', lookup_expr='lte')
    
    class Meta:
        model = Order
        fields = [
            'status', 'category', 'merchandiser_id', 'current_stage',
            'customer_name', 'buyer_name', 'fabric_type', 'order_number'
        ]

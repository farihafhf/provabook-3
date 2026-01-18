"""
Shipments filters
"""
from django_filters import rest_framework as filters
# from .models import shipment


# TODO: Define custom filters if needed
# class shipmentFilter(filters.FilterSet):
#     name = filters.CharFilter(lookup_expr='icontains')
#     created_after = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
#     created_before = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
#     
#     class Meta:
#         model = shipment
#         fields = ['name', 'created_by']

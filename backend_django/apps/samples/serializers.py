"""
Samples serializers
"""
from rest_framework import serializers
from .models import Sample


class SampleSerializer(serializers.ModelSerializer):
    """Sample serializer with camelCase for frontend"""
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer_name', read_only=True)
    
    class Meta:
        model = Sample
        fields = ['id', 'order', 'order_number', 'customer_name', 'type', 'version', 
                  'status', 'submission_date', 'recipient', 'courier_name', 
                  'awb_number', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert to camelCase"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'orderId': str(data['order']),
            'orderNumber': data['order_number'],
            'customerName': data['customer_name'],
            'type': data['type'],
            'version': data['version'],
            'status': data['status'],
            'submissionDate': data.get('submission_date'),
            'recipient': data.get('recipient'),
            'courierName': data.get('courier_name'),
            'awbNumber': data.get('awb_number'),
            'notes': data.get('notes'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        mapping = {
            'orderId': 'order',
            'submissionDate': 'submission_date',
            'courierName': 'courier_name',
            'awbNumber': 'awb_number',
        }
        converted = {}
        for key, value in data.items():
            converted[mapping.get(key, key)] = value
        return super().to_internal_value(converted)

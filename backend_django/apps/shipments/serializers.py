"""
Shipments serializers
"""
from rest_framework import serializers
from .models import Shipment


class ShipmentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = Shipment
        fields = [
            'id',
            'order',
            'order_number',
            'carrier_name',
            'awb_number',
            'shipping_date',
            'status',
            'documents',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'orderId': str(data['order']),
            'orderNumber': data['order_number'],
            'carrierName': data['carrier_name'],
            'awbNumber': data['awb_number'],
            'shippingDate': data.get('shipping_date'),
            'status': data['status'],
            'documents': data.get('documents'),
            'notes': data.get('notes'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }

    def to_internal_value(self, data):
        mapping = {
            'orderId': 'order',
            'carrierName': 'carrier_name',
            'awbNumber': 'awb_number',
            'shippingDate': 'shipping_date',
        }
        converted = {}
        for key, value in data.items():
            converted[mapping.get(key, key)] = value
        return super().to_internal_value(converted)

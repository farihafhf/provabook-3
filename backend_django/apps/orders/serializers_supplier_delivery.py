"""
Serializers for SupplierDelivery model
"""
from rest_framework import serializers
from .models_supplier_delivery import SupplierDelivery
from apps.authentication.serializers import UserSerializer


class SupplierDeliverySerializer(serializers.ModelSerializer):
    """
    Complete SupplierDelivery serializer with all fields
    Returns camelCase for frontend
    """
    created_by_details = UserSerializer(source='created_by', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_line_label = serializers.CharField(source='order_line.line_label', read_only=True, allow_null=True)
    style_number = serializers.CharField(source='style.style_number', read_only=True, allow_null=True)
    color_code = serializers.CharField(source='color.color_code', read_only=True, allow_null=True)
    color_name = serializers.CharField(source='color.color_name', read_only=True, allow_null=True)
    
    class Meta:
        model = SupplierDelivery
        fields = [
            'id', 'order', 'order_number', 'order_line', 'order_line_label',
            'style', 'style_number',
            'color', 'color_code', 'color_name',
            'delivery_date', 'delivered_quantity',
            'unit', 'notes', 'created_by', 'created_by_details',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'order_number', 'style_number', 'color_code', 'color_name']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        
        # Convert created_by_details to camelCase if present
        created_by_details = data.get('created_by_details')
        if created_by_details:
            created_by_details = {
                'id': str(created_by_details['id']),
                'email': created_by_details['email'],
                'fullName': created_by_details['full_name'],
                'role': created_by_details['role'],
                'phone': created_by_details.get('phone'),
                'department': created_by_details.get('department'),
                'isActive': created_by_details['is_active'],
            }
        
        return {
            'id': str(data['id']),
            'order': str(data['order']),
            'orderNumber': data.get('order_number'),
            'orderLine': str(data['order_line']) if data.get('order_line') else None,
            'orderLineLabel': data.get('order_line_label'),
            'style': str(data['style']) if data.get('style') else None,
            'styleNumber': data.get('style_number'),
            'color': str(data['color']) if data.get('color') else None,
            'colorCode': data.get('color_code'),
            'colorName': data.get('color_name'),
            'deliveryDate': data['delivery_date'],
            'deliveredQuantity': float(data['delivered_quantity']) if data.get('delivered_quantity') else 0,
            'unit': data['unit'],
            'notes': data.get('notes'),
            'createdBy': str(data['created_by']) if data.get('created_by') else None,
            'createdByDetails': created_by_details,
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def validate_delivered_quantity(self, value):
        """Validate quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError("Delivered quantity must be greater than 0")
        return value


class SupplierDeliveryCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating supplier deliveries
    Accepts both camelCase (from frontend) and snake_case
    """
    class Meta:
        model = SupplierDelivery
        fields = [
            'order', 'order_line', 'style', 'color', 'delivery_date', 'delivered_quantity', 'unit', 'notes'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        # Map camelCase keys to snake_case
        field_mapping = {
            'orderLine': 'order_line',
            'deliveryDate': 'delivery_date',
            'deliveredQuantity': 'delivered_quantity',
        }
        
        # Convert camelCase to snake_case
        converted_data = {}
        for key, value in data.items():
            # Use mapped key if exists, otherwise use original key
            new_key = field_mapping.get(key, key)
            # Handle null/empty strings for foreign keys
            if new_key in ['order_line', 'style', 'color'] and (value == '' or value is None):
                converted_data[new_key] = None
            else:
                converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def validate_delivered_quantity(self, value):
        """Validate quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError("Delivered quantity must be greater than 0")
        return value


class SupplierDeliveryUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating supplier deliveries
    Accepts both camelCase (from frontend) and snake_case
    """
    class Meta:
        model = SupplierDelivery
        fields = [
            'order_line', 'style', 'color', 'delivery_date', 'delivered_quantity', 'unit', 'notes'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        # Map camelCase keys to snake_case
        field_mapping = {
            'orderLine': 'order_line',
            'deliveryDate': 'delivery_date',
            'deliveredQuantity': 'delivered_quantity',
        }
        
        # Convert camelCase to snake_case
        converted_data = {}
        for key, value in data.items():
            # Use mapped key if exists, otherwise use original key
            new_key = field_mapping.get(key, key)
            # Handle null/empty strings for foreign keys
            if new_key in ['order_line', 'style', 'color'] and (value == '' or value is None):
                converted_data[new_key] = None
            else:
                converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def validate_delivered_quantity(self, value):
        """Validate quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError("Delivered quantity must be greater than 0")
        return value


class SupplierDeliveryListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing deliveries
    Returns camelCase for frontend
    """
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_line_label = serializers.CharField(source='order_line.line_label', read_only=True, allow_null=True)
    style_number = serializers.CharField(source='style.style_number', read_only=True, allow_null=True)
    color_code = serializers.CharField(source='color.color_code', read_only=True, allow_null=True)
    color_name = serializers.CharField(source='color.color_name', read_only=True, allow_null=True)
    
    class Meta:
        model = SupplierDelivery
        fields = [
            'id', 'order', 'order_number', 'order_line', 'order_line_label',
            'style', 'style_number',
            'color', 'color_code', 'color_name',
            'delivery_date', 'delivered_quantity',
            'unit', 'notes', 'created_by_name', 'created_at'
        ]
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'order': str(data['order']),
            'orderNumber': data.get('order_number'),
            'orderLine': str(data['order_line']) if data.get('order_line') else None,
            'orderLineLabel': data.get('order_line_label'),
            'style': str(data['style']) if data.get('style') else None,
            'styleNumber': data.get('style_number'),
            'color': str(data['color']) if data.get('color') else None,
            'colorCode': data.get('color_code'),
            'colorName': data.get('color_name'),
            'deliveryDate': data['delivery_date'],
            'deliveredQuantity': float(data['delivered_quantity']) if data['delivered_quantity'] else 0,
            'unit': data['unit'],
            'notes': data.get('notes'),
            'createdByName': data.get('created_by_name'),
            'createdAt': data['created_at'],
        }

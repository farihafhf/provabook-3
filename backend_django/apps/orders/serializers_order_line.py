"""
Serializers for OrderLine - handles style+color+CAD combinations
"""
from rest_framework import serializers
from .models_order_line import OrderLine


class OrderLineSerializer(serializers.ModelSerializer):
    """Serializer for OrderLine with camelCase conversion"""
    total_value = serializers.ReadOnlyField()
    total_cost = serializers.ReadOnlyField()
    total_commission = serializers.ReadOnlyField()
    profit = serializers.ReadOnlyField()
    line_label = serializers.ReadOnlyField()
    style_number = serializers.CharField(source='style.style_number', read_only=True)
    order_id = serializers.CharField(source='style.order.id', read_only=True)
    
    class Meta:
        model = OrderLine
        fields = [
            'id', 'style', 'style_number', 'order_id',
            'color_code', 'color_name', 'cad_code', 'cad_name',
            'quantity', 'unit',
            'mill_name', 'mill_price', 'prova_price', 'commission', 'currency',
            'etd', 'eta', 'submission_date', 'approval_date',
            'approval_status', 'notes',
            'total_value', 'total_cost', 'total_commission', 'profit', 'line_label',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'style_number', 'order_id', 'created_at', 'updated_at',
            'total_value', 'total_cost', 'total_commission', 'profit', 'line_label'
        ]
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'styleId': str(data['style']),
            'styleNumber': data.get('style_number'),
            'orderId': str(data.get('order_id')) if data.get('order_id') else None,
            'colorCode': data.get('color_code'),
            'colorName': data.get('color_name'),
            'cadCode': data.get('cad_code'),
            'cadName': data.get('cad_name'),
            'quantity': float(data['quantity']) if data.get('quantity') else 0,
            'unit': data.get('unit'),
            'millName': data.get('mill_name'),
            'millPrice': float(data['mill_price']) if data.get('mill_price') else None,
            'provaPrice': float(data['prova_price']) if data.get('prova_price') else None,
            'commission': float(data['commission']) if data.get('commission') else None,
            'currency': data.get('currency'),
            'etd': data.get('etd'),
            'eta': data.get('eta'),
            'submissionDate': data.get('submission_date'),
            'approvalDate': data.get('approval_date'),
            'approvalStatus': data.get('approval_status'),
            'notes': data.get('notes'),
            'totalValue': data.get('total_value'),
            'totalCost': data.get('total_cost'),
            'totalCommission': data.get('total_commission'),
            'profit': data.get('profit'),
            'lineLabel': data.get('line_label'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'styleId': 'style',
            'colorCode': 'color_code',
            'colorName': 'color_name',
            'cadCode': 'cad_code',
            'cadName': 'cad_name',
            'millName': 'mill_name',
            'millPrice': 'mill_price',
            'provaPrice': 'prova_price',
            'submissionDate': 'submission_date',
            'approvalDate': 'approval_date',
            'approvalStatus': 'approval_status',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)


class OrderLineCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating OrderLine (accepts camelCase)"""
    
    class Meta:
        model = OrderLine
        fields = [
            'color_code', 'color_name', 'cad_code', 'cad_name',
            'quantity', 'unit',
            'mill_name', 'mill_price', 'prova_price', 'commission', 'currency',
            'etd', 'eta', 'submission_date', 'approval_date',
            'approval_status', 'notes'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'colorCode': 'color_code',
            'colorName': 'color_name',
            'cadCode': 'cad_code',
            'cadName': 'cad_name',
            'millName': 'mill_name',
            'millPrice': 'mill_price',
            'provaPrice': 'prova_price',
            'submissionDate': 'submission_date',
            'approvalDate': 'approval_date',
            'approvalStatus': 'approval_status',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def validate(self, data):
        """Validate line data"""
        # At least one of color_code or cad_code should be provided
        # (or neither, for style-only lines)
        # This is permissive - all combinations are valid
        
        # Ensure quantity is positive
        if data.get('quantity') and float(data['quantity']) <= 0:
            raise serializers.ValidationError({
                'quantity': 'Quantity must be greater than zero'
            })
        
        return data

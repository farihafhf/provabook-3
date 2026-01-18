"""
Serializers for ProductionEntry model
Handles knitting, dyeing, finishing entries for local orders
"""
from rest_framework import serializers
from .models_production_entry import ProductionEntry, ProductionEntryType


class ProductionEntrySerializer(serializers.ModelSerializer):
    """
    Full serializer for ProductionEntry with all details
    Returns camelCase for frontend consumption
    """
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_line_label = serializers.CharField(source='order_line.line_label', read_only=True, allow_null=True)
    style_number = serializers.SerializerMethodField()
    color_code = serializers.SerializerMethodField()
    cad_code = serializers.SerializerMethodField()
    entry_type_display = serializers.CharField(source='get_entry_type_display', read_only=True)
    
    class Meta:
        model = ProductionEntry
        fields = [
            'id', 'order', 'order_number', 'order_line', 'order_line_label',
            'style_number', 'color_code', 'cad_code',
            'entry_type', 'entry_type_display',
            'entry_date', 'quantity', 'unit', 'notes',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
    
    def get_style_number(self, obj):
        if obj.order_line and obj.order_line.style:
            return obj.order_line.style.style_number
        return None
    
    def get_color_code(self, obj):
        if obj.order_line:
            return obj.order_line.color_code
        return None
    
    def get_cad_code(self, obj):
        if obj.order_line:
            return obj.order_line.cad_code
        return None
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'order': str(data['order']),
            'orderNumber': data.get('order_number'),
            'orderLine': str(data['order_line']) if data.get('order_line') else None,
            'orderLineLabel': data.get('order_line_label'),
            'styleNumber': data.get('style_number'),
            'colorCode': data.get('color_code'),
            'cadCode': data.get('cad_code'),
            'entryType': data['entry_type'],
            'entryTypeDisplay': data.get('entry_type_display'),
            'entryDate': data['entry_date'],
            'quantity': float(data['quantity']) if data['quantity'] else 0,
            'unit': data['unit'],
            'notes': data.get('notes'),
            'createdBy': str(data['created_by']) if data.get('created_by') else None,
            'createdByName': data.get('created_by_name'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }


class ProductionEntryCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating production entries
    Accepts both camelCase (from frontend) and snake_case
    """
    class Meta:
        model = ProductionEntry
        fields = [
            'order', 'order_line', 'entry_type', 'entry_date', 'quantity', 'unit', 'notes'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'orderLine': 'order_line',
            'entryType': 'entry_type',
            'entryDate': 'entry_date',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            # Handle null/empty strings for foreign keys
            if new_key in ['order_line'] and (value == '' or value is None):
                converted_data[new_key] = None
            else:
                converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def validate_quantity(self, value):
        """Validate quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
    
    def validate_entry_type(self, value):
        """Validate entry type is valid"""
        valid_types = [choice[0] for choice in ProductionEntryType.choices]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid entry type. Must be one of: {valid_types}")
        return value


class ProductionEntryUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating production entries
    Accepts both camelCase (from frontend) and snake_case
    """
    class Meta:
        model = ProductionEntry
        fields = [
            'order_line', 'entry_type', 'entry_date', 'quantity', 'unit', 'notes'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'orderLine': 'order_line',
            'entryType': 'entry_type',
            'entryDate': 'entry_date',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            if new_key in ['order_line'] and (value == '' or value is None):
                converted_data[new_key] = None
            else:
                converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def validate_quantity(self, value):
        """Validate quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value


class ProductionEntryListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing production entries
    Returns camelCase for frontend
    """
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_line_label = serializers.CharField(source='order_line.line_label', read_only=True, allow_null=True)
    style_number = serializers.SerializerMethodField()
    color_code = serializers.SerializerMethodField()
    cad_code = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionEntry
        fields = [
            'id', 'order', 'order_number', 'order_line', 'order_line_label',
            'style_number', 'color_code', 'cad_code',
            'entry_type', 'entry_date', 'quantity',
            'unit', 'notes', 'created_by_name', 'created_at'
        ]
    
    def get_style_number(self, obj):
        if obj.order_line and obj.order_line.style:
            return obj.order_line.style.style_number
        return None
    
    def get_color_code(self, obj):
        if obj.order_line:
            return obj.order_line.color_code
        return None
    
    def get_cad_code(self, obj):
        if obj.order_line:
            return obj.order_line.cad_code
        return None
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'order': str(data['order']),
            'orderNumber': data.get('order_number'),
            'orderLine': str(data['order_line']) if data.get('order_line') else None,
            'orderLineLabel': data.get('order_line_label'),
            'styleNumber': data.get('style_number'),
            'colorCode': data.get('color_code'),
            'cadCode': data.get('cad_code'),
            'entryType': data['entry_type'],
            'entryDate': data['entry_date'],
            'quantity': float(data['quantity']) if data['quantity'] else 0,
            'unit': data['unit'],
            'notes': data.get('notes'),
            'createdByName': data.get('created_by_name'),
            'createdAt': data['created_at'],
        }


class ProductionEntrySummarySerializer(serializers.Serializer):
    """
    Serializer for aggregated production entry summaries per order
    Used to show total knitted, dyed, finished quantities
    """
    total_knitting = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_dyeing = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_finishing = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    knitting_entries_count = serializers.IntegerField(read_only=True)
    dyeing_entries_count = serializers.IntegerField(read_only=True)
    finishing_entries_count = serializers.IntegerField(read_only=True)
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        return {
            'totalKnitting': float(instance.get('total_knitting') or 0),
            'totalDyeing': float(instance.get('total_dyeing') or 0),
            'totalFinishing': float(instance.get('total_finishing') or 0),
            'knittingEntriesCount': instance.get('knitting_entries_count', 0),
            'dyeingEntriesCount': instance.get('dyeing_entries_count', 0),
            'finishingEntriesCount': instance.get('finishing_entries_count', 0),
        }

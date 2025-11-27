"""
Serializers for OrderStyle and OrderColor
"""
from rest_framework import serializers
from .models_style_color import OrderStyle, OrderColor
from .serializers_order_line import OrderLineSerializer, OrderLineCreateUpdateSerializer


class OrderColorSerializer(serializers.ModelSerializer):
    """Serializer for OrderColor with camelCase conversion"""
    total_value = serializers.ReadOnlyField()
    total_cost = serializers.ReadOnlyField()
    total_commission = serializers.ReadOnlyField()
    
    class Meta:
        model = OrderColor
        fields = [
            'id', 'color_code', 'color_name', 'quantity', 'unit',
            'etd', 'eta', 'submission_date', 'approval_date',
            'mill_name', 'mill_price', 'prova_price', 'commission', 'currency',
            'approval_status', 'notes',
            'total_value', 'total_cost', 'total_commission',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_value', 'total_cost', 'total_commission']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'colorCode': data['color_code'],
            'colorName': data['color_name'],
            'quantity': float(data['quantity']) if data.get('quantity') else 0,
            'unit': data.get('unit'),
            'etd': data.get('etd'),
            'eta': data.get('eta'),
            'submissionDate': data.get('submission_date'),
            'approvalDate': data.get('approval_date'),
            'millName': data.get('mill_name'),
            'millPrice': float(data['mill_price']) if data.get('mill_price') else None,
            'provaPrice': float(data['prova_price']) if data.get('prova_price') else None,
            'commission': float(data['commission']) if data.get('commission') else None,
            'currency': data.get('currency'),
            'approvalStatus': data.get('approval_status'),
            'notes': data.get('notes'),
            'totalValue': data.get('total_value'),
            'totalCost': data.get('total_cost'),
            'totalCommission': data.get('total_commission'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'colorCode': 'color_code',
            'colorName': 'color_name',
            'submissionDate': 'submission_date',
            'approvalDate': 'approval_date',
            'millName': 'mill_name',
            'millPrice': 'mill_price',
            'provaPrice': 'prova_price',
            'approvalStatus': 'approval_status',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)


class OrderStyleSerializer(serializers.ModelSerializer):
    """Serializer for OrderStyle with nested colors and lines"""
    colors = OrderColorSerializer(many=True, required=False)
    lines = OrderLineSerializer(many=True, required=False)
    
    class Meta:
        model = OrderStyle
        fields = [
            'id', 'style_number', 'description',
            'fabric_type', 'fabric_specifications', 'fabric_composition',
            'gsm', 'finish_type', 'construction', 'cuttable_width',
            'etd', 'eta', 'submission_date', 'notes',
            'colors', 'lines', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'style_number', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'styleNumber': data['style_number'],
            'description': data.get('description'),
            'fabricType': data.get('fabric_type'),
            'fabricSpecifications': data.get('fabric_specifications'),
            'fabricComposition': data.get('fabric_composition'),
            'gsm': float(data['gsm']) if data.get('gsm') else None,
            'finishType': data.get('finish_type'),
            'construction': data.get('construction'),
            'cuttableWidth': data.get('cuttable_width'),
            'etd': data.get('etd'),
            'eta': data.get('eta'),
            'submissionDate': data.get('submission_date'),
            'notes': data.get('notes'),
            'colors': data.get('colors', []),
            'lines': data.get('lines', []),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'styleNumber': 'style_number',
            'cuttableWidth': 'cuttable_width',
            'fabricType': 'fabric_type',
            'fabricSpecifications': 'fabric_specifications',
            'fabricComposition': 'fabric_composition',
            'finishType': 'finish_type',
            'submissionDate': 'submission_date',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def create(self, validated_data):
        """Create style with nested colors"""
        colors_data = validated_data.pop('colors', [])
        style = OrderStyle.objects.create(**validated_data)
        
        for color_data in colors_data:
            OrderColor.objects.create(style=style, **color_data)
        
        return style
    
    def update(self, instance, validated_data):
        """Update style and nested colors"""
        colors_data = validated_data.pop('colors', None)
        
        # Update style fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update colors if provided
        if colors_data is not None:
            # Delete existing colors and create new ones (simpler approach)
            instance.colors.all().delete()
            for color_data in colors_data:
                OrderColor.objects.create(style=instance, **color_data)
        
        return instance


class OrderColorCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating OrderColor (accepts camelCase)"""
    
    class Meta:
        model = OrderColor
        fields = [
            'id', 'color_code', 'color_name', 'quantity', 'unit',
            'etd', 'eta', 'submission_date', 'approval_date',
            'mill_name', 'mill_price', 'prova_price', 'commission', 'currency',
            'approval_status', 'notes'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'colorCode': 'color_code',
            'colorName': 'color_name',
            'submissionDate': 'submission_date',
            'approvalDate': 'approval_date',
            'millName': 'mill_name',
            'millPrice': 'mill_price',
            'provaPrice': 'prova_price',
            'approvalStatus': 'approval_status',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)


class OrderStyleCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating OrderStyle with nested lines (accepts camelCase)"""
    lines = OrderLineCreateUpdateSerializer(many=True, required=False)
    colors = OrderColorCreateUpdateSerializer(many=True, required=False)  # Backward compatibility
    
    class Meta:
        model = OrderStyle
        fields = [
            'id', 'description',
            'fabric_type', 'fabric_specifications', 'fabric_composition',
            'gsm', 'finish_type', 'construction', 'cuttable_width',
            'etd', 'eta', 'submission_date', 'notes',
            'lines', 'colors'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'cuttableWidth': 'cuttable_width',
            'fabricType': 'fabric_type',
            'fabricSpecifications': 'fabric_specifications',
            'fabricComposition': 'fabric_composition',
            'finishType': 'finish_type',
            'submissionDate': 'submission_date',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def validate(self, data):
        """Validate that at least one line/color is provided"""
        from .models_order_line import OrderLine
        
        lines = data.get('lines', [])
        colors = data.get('colors', [])
        
        # Accept either lines or colors (for backward compatibility)
        if not lines and not colors:
            # Only validate if this is a create operation (no id)
            if not data.get('id') and not self.instance:
                raise serializers.ValidationError({
                    'lines': 'At least one line or color must be provided for each style'
                })
        
        # Validate lines if provided
        if lines:
            combinations = [(l.get('color_code'), l.get('cad_code')) for l in lines]
            if len(combinations) != len(set(combinations)):
                raise serializers.ValidationError({
                    'lines': 'Each color+CAD combination must be unique within a style'
                })
        
        return data
    
    def create(self, validated_data):
        """Create style with nested lines/colors"""
        from .models_order_line import OrderLine
        
        lines_data = validated_data.pop('lines', [])
        colors_data = validated_data.pop('colors', [])
        
        # If colors are provided instead of lines, use them as lines
        if colors_data and not lines_data:
            lines_data = colors_data
        
        style = OrderStyle.objects.create(**validated_data)
        
        for line_data in lines_data:
            OrderLine.objects.create(style=style, **line_data)
        
        return style
    
    def update(self, instance, validated_data):
        """Update style and nested lines/colors"""
        from .models_order_line import OrderLine
        
        lines_data = validated_data.pop('lines', None)
        colors_data = validated_data.pop('colors', None)
        
        # If colors are provided instead of lines, use them as lines
        if colors_data is not None and lines_data is None:
            lines_data = colors_data
        
        # Update style fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update lines if provided
        if lines_data is not None:
            # Delete existing lines and create new ones
            instance.lines.all().delete()
            for line_data in lines_data:
                # Remove id from line_data to avoid conflicts
                line_data.pop('id', None)
                OrderLine.objects.create(style=instance, **line_data)
        
        return instance

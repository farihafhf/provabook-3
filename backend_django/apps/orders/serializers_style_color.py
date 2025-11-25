"""
Serializers for OrderStyle and OrderColor
"""
from rest_framework import serializers
from .models_style_color import OrderStyle, OrderColor


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
    """Serializer for OrderStyle with nested colors"""
    colors = OrderColorSerializer(many=True, required=False)
    
    class Meta:
        model = OrderStyle
        fields = [
            'id', 'base_style_number', 'style_number',
            'fabric_type', 'fabric_specifications', 'fabric_composition',
            'gsm', 'finish_type', 'construction',
            'etd', 'eta', 'submission_date', 'notes',
            'colors', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'style_number', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'baseStyleNumber': data['base_style_number'],
            'styleNumber': data['style_number'],
            'fabricType': data.get('fabric_type'),
            'fabricSpecifications': data.get('fabric_specifications'),
            'fabricComposition': data.get('fabric_composition'),
            'gsm': float(data['gsm']) if data.get('gsm') else None,
            'finishType': data.get('finish_type'),
            'construction': data.get('construction'),
            'etd': data.get('etd'),
            'eta': data.get('eta'),
            'submissionDate': data.get('submission_date'),
            'notes': data.get('notes'),
            'colors': data.get('colors', []),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'baseStyleNumber': 'base_style_number',
            'styleNumber': 'style_number',
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
            'color_code', 'color_name', 'quantity', 'unit',
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
    """Serializer for creating/updating OrderStyle with nested colors (accepts camelCase)"""
    colors = OrderColorCreateUpdateSerializer(many=True, required=True)
    
    class Meta:
        model = OrderStyle
        fields = [
            'base_style_number',
            'fabric_type', 'fabric_specifications', 'fabric_composition',
            'gsm', 'finish_type', 'construction',
            'etd', 'eta', 'submission_date', 'notes',
            'colors'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'baseStyleNumber': 'base_style_number',
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
        """Validate that at least one color is provided"""
        colors = data.get('colors', [])
        if not colors:
            raise serializers.ValidationError({
                'colors': 'At least one color must be provided for each style'
            })
        
        # Validate that color codes are unique within this style
        color_codes = [c['color_code'] for c in colors]
        if len(color_codes) != len(set(color_codes)):
            raise serializers.ValidationError({
                'colors': 'Color codes must be unique within a style'
            })
        
        return data
    
    def create(self, validated_data):
        """Create style with nested colors"""
        colors_data = validated_data.pop('colors')
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
            # Delete existing colors and create new ones
            instance.colors.all().delete()
            for color_data in colors_data:
                OrderColor.objects.create(style=instance, **color_data)
        
        return instance

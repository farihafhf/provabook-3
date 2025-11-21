"""
Orders serializers
"""
from rest_framework import serializers
from .models import Order, OrderStatus, OrderCategory, Document
from apps.authentication.serializers import UserSerializer


class OrderSerializer(serializers.ModelSerializer):
    """
    Complete Order serializer with all fields
    Returns camelCase for frontend
    """
    merchandiser_details = UserSerializer(source='merchandiser', read_only=True)
    total_value = serializers.ReadOnlyField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'buyer_name', 'style_number',
            'fabric_type', 'fabric_specifications', 'fabric_composition', 
            'gsm', 'finish_type', 'construction',
            'mill_name', 'mill_price', 'prova_price', 'currency',
            'quantity', 'unit', 'color_quantity_breakdown', 'colorways',
            'etd', 'eta', 'order_date', 'expected_delivery_date', 'actual_delivery_date',
            'status', 'category', 'approval_status', 'current_stage',
            'notes', 'metadata', 'merchandiser', 'merchandiser_details',
            'total_value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at', 'total_value']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        # Convert merchandiser_details to camelCase
        merchandiser_details = data.get('merchandiser_details')
        if merchandiser_details:
            merchandiser_details = {
                'id': str(merchandiser_details['id']),
                'email': merchandiser_details['email'],
                'fullName': merchandiser_details['full_name'],
                'role': merchandiser_details['role'],
                'phone': merchandiser_details.get('phone'),
                'department': merchandiser_details.get('department'),
                'isActive': merchandiser_details['is_active'],
            }
        
        return {
            'id': str(data['id']),
            'orderNumber': data['order_number'],
            'customerName': data['customer_name'],
            'buyerName': data.get('buyer_name'),
            'styleNumber': data.get('style_number'),
            'fabricType': data['fabric_type'],
            'fabricSpecifications': data.get('fabric_specifications'),
            'fabricComposition': data.get('fabric_composition'),
            'gsm': float(data['gsm']) if data.get('gsm') else None,
            'finishType': data.get('finish_type'),
            'construction': data.get('construction'),
            'millName': data.get('mill_name'),
            'millPrice': float(data['mill_price']) if data.get('mill_price') else None,
            'provaPrice': float(data['prova_price']) if data.get('prova_price') else None,
            'currency': data.get('currency'),
            'quantity': float(data['quantity']) if data.get('quantity') else 0,
            'unit': data['unit'],
            'colorQuantityBreakdown': data.get('color_quantity_breakdown'),
            'colorways': data.get('colorways'),
            'etd': data.get('etd'),
            'eta': data.get('eta'),
            'orderDate': data.get('order_date'),
            'expectedDeliveryDate': data.get('expected_delivery_date'),
            'actualDeliveryDate': data.get('actual_delivery_date'),
            'status': data['status'],
            'category': data['category'],
            'approvalStatus': data.get('approval_status'),
            'currentStage': data.get('current_stage'),
            'notes': data.get('notes'),
            'metadata': data.get('metadata'),
            'merchandiser': str(data['merchandiser']) if data.get('merchandiser') else None,
            'merchandiserDetails': merchandiser_details,
            'totalValue': data.get('total_value'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def validate_quantity(self, value):
        """Validate quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
    
    def validate_color_quantity_breakdown(self, value):
        """Validate color breakdown structure"""
        if value:
            for item in value:
                if not isinstance(item, dict):
                    raise serializers.ValidationError("Each item must be a dictionary")
                if 'color' not in item or 'quantity' not in item:
                    raise serializers.ValidationError("Each item must have 'color' and 'quantity' fields")
        return value
    
    def validate(self, data):
        """Validate ETD and ETA dates relationship"""
        from datetime import date, timedelta
        
        etd = data.get('etd')
        eta = data.get('eta')
        
        # If both ETD and ETA are provided, ETA should be after or equal to ETD
        if etd and eta:
            if eta < etd:
                raise serializers.ValidationError({
                    'eta': 'ETA (Estimated Time of Arrival) must be on or after ETD (Estimated Time of Dispatch)'
                })
        
        # Warn if dates are too far in the past (more than 1 year)
        one_year_ago = date.today() - timedelta(days=365)
        
        if etd and etd < one_year_ago:
            raise serializers.ValidationError({
                'etd': 'ETD cannot be more than 1 year in the past'
            })
        
        if eta and eta < one_year_ago:
            raise serializers.ValidationError({
                'eta': 'ETA cannot be more than 1 year in the past'
            })
        
        return data


class OrderCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating orders
    Accepts both camelCase (from frontend) and snake_case
    """
    class Meta:
        model = Order
        fields = [
            'customer_name', 'buyer_name', 'style_number',
            'fabric_type', 'fabric_specifications', 'fabric_composition',
            'gsm', 'finish_type', 'construction',
            'mill_name', 'mill_price', 'prova_price', 'currency',
            'quantity', 'unit', 'color_quantity_breakdown', 'colorways',
            'etd', 'eta', 'order_date', 'expected_delivery_date',
            'status', 'category', 'notes', 'metadata'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        # Map camelCase keys to snake_case
        field_mapping = {
            'customerName': 'customer_name',
            'buyerName': 'buyer_name',
            'styleNumber': 'style_number',
            'fabricType': 'fabric_type',
            'fabricSpecifications': 'fabric_specifications',
            'fabricComposition': 'fabric_composition',
            'finishType': 'finish_type',
            'millName': 'mill_name',
            'millPrice': 'mill_price',
            'provaPrice': 'prova_price',
            'colorQuantityBreakdown': 'color_quantity_breakdown',
            'orderDate': 'order_date',
            'expectedDeliveryDate': 'expected_delivery_date',
        }
        
        # Convert camelCase to snake_case
        converted_data = {}
        for key, value in data.items():
            # Use mapped key if exists, otherwise use original key
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def create(self, validated_data):
        """Create order with auto-assigned merchandiser"""
        # Merchandiser will be set in the view
        return super().create(validated_data)


class OrderUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating orders
    Accepts both camelCase (from frontend) and snake_case
    """
    class Meta:
        model = Order
        fields = [
            'customer_name', 'buyer_name', 'style_number',
            'fabric_type', 'fabric_specifications', 'fabric_composition',
            'gsm', 'finish_type', 'construction',
            'mill_name', 'mill_price', 'prova_price', 'currency',
            'quantity', 'unit', 'color_quantity_breakdown', 'colorways',
            'etd', 'eta', 'order_date', 'expected_delivery_date', 'actual_delivery_date',
            'status', 'category', 'current_stage', 'notes', 'metadata', 'merchandiser'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        # Map camelCase keys to snake_case
        field_mapping = {
            'customerName': 'customer_name',
            'buyerName': 'buyer_name',
            'styleNumber': 'style_number',
            'fabricType': 'fabric_type',
            'fabricSpecifications': 'fabric_specifications',
            'fabricComposition': 'fabric_composition',
            'finishType': 'finish_type',
            'millName': 'mill_name',
            'millPrice': 'mill_price',
            'provaPrice': 'prova_price',
            'colorQuantityBreakdown': 'color_quantity_breakdown',
            'currentStage': 'current_stage',
            'orderDate': 'order_date',
            'expectedDeliveryDate': 'expected_delivery_date',
            'actualDeliveryDate': 'actual_delivery_date',
        }
        
        # Convert camelCase to snake_case
        converted_data = {}
        for key, value in data.items():
            # Use mapped key if exists, otherwise use original key
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def validate(self, data):
        """Validate ETD and ETA dates relationship"""
        from datetime import date, timedelta
        
        # Get current values from instance if this is an update
        instance = self.instance
        etd = data.get('etd', instance.etd if instance else None)
        eta = data.get('eta', instance.eta if instance else None)
        
        # If both ETD and ETA are provided, ETA should be after or equal to ETD
        if etd and eta:
            if eta < etd:
                raise serializers.ValidationError({
                    'eta': 'ETA (Estimated Time of Arrival) must be on or after ETD (Estimated Time of Dispatch)'
                })
        
        # Warn if dates are too far in the past (more than 1 year)
        one_year_ago = date.today() - timedelta(days=365)
        
        if etd and etd < one_year_ago:
            raise serializers.ValidationError({
                'etd': 'ETD cannot be more than 1 year in the past'
            })
        
        if eta and eta < one_year_ago:
            raise serializers.ValidationError({
                'eta': 'ETA cannot be more than 1 year in the past'
            })
        
        return data


class OrderListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing orders
    Returns camelCase for frontend
    """
    merchandiser_name = serializers.CharField(source='merchandiser.full_name', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'fabric_type',
            'quantity', 'unit', 'status', 'category',
            'order_date', 'expected_delivery_date',
            'merchandiser', 'merchandiser_name', 'created_at'
        ]
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'orderNumber': data['order_number'],
            'customerName': data['customer_name'],
            'fabricType': data['fabric_type'],
            'quantity': float(data['quantity']) if data['quantity'] else 0,
            'unit': data['unit'],
            'status': data['status'],
            'category': data['category'],
            'orderDate': data['order_date'],
            'expectedDeliveryDate': data['expected_delivery_date'],
            'merchandiser': str(data['merchandiser']) if data['merchandiser'] else None,
            'merchandiserName': data['merchandiser_name'],
            'createdAt': data['created_at'],
        }


class OrderAlertSerializer(serializers.ModelSerializer):
    style_name = serializers.CharField(source='style_number', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'style_name',
            'customer_name',
            'etd',
            'approval_status',
            'current_stage',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'orderNumber': data['order_number'],
            'styleName': data.get('style_name'),
            'customerName': data['customer_name'],
            'etd': data.get('etd'),
            'approvalStatus': data.get('approval_status'),
            'currentStage': data.get('current_stage'),
        }


class OrderStatsSerializer(serializers.Serializer):
    """
    Serializer for order statistics
    """
    total_orders = serializers.IntegerField()
    upcoming_orders = serializers.IntegerField()
    running_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    archived_orders = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    recent_orders = OrderListSerializer(many=True)


class ApprovalUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating approval status
    Accepts camelCase from frontend
    """
    approval_type = serializers.ChoiceField(
        choices=['labDip', 'strikeOff', 'qualityTest', 'bulkSwatch', 'ppSample']
    )
    status = serializers.ChoiceField(
        choices=['pending', 'approved', 'rejected']
    )
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'approvalType': 'approval_type',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)


class StageChangeSerializer(serializers.Serializer):
    """
    Serializer for changing order stage
    """
    stage = serializers.ChoiceField(
        choices=['Design', 'Greige', 'Let Me Know', 'In Development', 'Production', 'Delivered']
    )


class DocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for Document model
    Returns camelCase for frontend
    """
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'order', 'file', 'file_name', 'file_type', 'file_size',
            'category', 'subcategory', 'description',
            'uploaded_by', 'uploaded_by_name', 'file_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'file_url', 'created_at', 'updated_at']
    
    def get_file_url(self, obj):
        """Get the file URL"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'orderId': str(data['order']),
            'fileName': data['file_name'],
            'fileType': data['file_type'],
            'fileSize': data['file_size'],
            'fileUrl': data['file_url'],
            'category': data['category'],
            'subcategory': data.get('subcategory'),
            'description': data.get('description'),
            'uploadedBy': str(data['uploaded_by']) if data.get('uploaded_by') else None,
            'uploadedByName': data.get('uploaded_by_name'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }

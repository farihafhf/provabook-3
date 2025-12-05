"""
Serializers for OrderLine - handles style+color+CAD combinations
"""
from rest_framework import serializers
from .models_order_line import OrderLine, MillOffer


class MillOfferSerializer(serializers.ModelSerializer):
    """Serializer for MillOffer with camelCase conversion"""
    
    class Meta:
        model = MillOffer
        fields = ['id', 'order_line', 'mill_name', 'price', 'currency', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'orderLineId': str(data['order_line']),
            'millName': data.get('mill_name'),
            'price': float(data['price']) if data.get('price') else None,
            'currency': data.get('currency', 'USD'),
            'notes': data.get('notes'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'orderLineId': 'order_line',
            'millName': 'mill_name',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)


class OrderLineSerializer(serializers.ModelSerializer):
    """Serializer for OrderLine with camelCase conversion"""
    total_value = serializers.ReadOnlyField()
    total_cost = serializers.ReadOnlyField()
    total_commission = serializers.ReadOnlyField()
    profit = serializers.ReadOnlyField()
    line_label = serializers.ReadOnlyField()
    style_number = serializers.CharField(source='style.style_number', read_only=True)
    order_id = serializers.CharField(source='style.order.id', read_only=True)
    # Computed fields for delivery tracking
    total_delivered_quantity = serializers.SerializerMethodField()
    actual_delivery_date = serializers.SerializerMethodField()
    days_overdue_at_delivery = serializers.SerializerMethodField()
    # Mill offers for development stage - use SerializerMethodField for resilience
    mill_offers = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderLine
        fields = [
            'id', 'style', 'style_number', 'order_id',
            'color_code', 'color_name', 'cad_code', 'cad_name',
            'quantity', 'unit',
            'mill_name', 'mill_price', 'prova_price', 'commission', 'currency',
            'etd', 'eta', 'submission_date', 'approval_date',
            'approval_status', 'status', 'notes',
            'total_value', 'total_cost', 'total_commission', 'profit', 'line_label',
            'total_delivered_quantity', 'actual_delivery_date', 'days_overdue_at_delivery',
            # Local order production fields - greige/yarn calculation
            'process_loss_percent', 'mixed_fabric_type', 'mixed_fabric_percent', 'greige_quantity',
            'yarn_required', 'yarn_booked_date', 'yarn_received_date',
            'pp_yards', 'fit_cum_pp_submit_date', 'fit_cum_pp_comments_date',
            'knitting_start_date', 'knitting_complete_date',
            'dyeing_start_date', 'dyeing_complete_date',
            'bulk_size_set_date', 'cutting_start_date', 'cutting_complete_date',
            'print_send_date', 'print_received_date',
            'sewing_input_date', 'sewing_finish_date',
            'packing_complete_date', 'final_inspection_date', 'ex_factory_date',
            'mill_offers',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'style_number', 'order_id', 'created_at', 'updated_at',
            'total_value', 'total_cost', 'total_commission', 'profit', 'line_label'
        ]
    
    def get_total_delivered_quantity(self, obj):
        """Calculate total delivered quantity from supplier deliveries"""
        from .models_supplier_delivery import SupplierDelivery
        deliveries = SupplierDelivery.objects.filter(order_line=obj)
        return sum(d.delivered_quantity for d in deliveries) if deliveries.exists() else 0
    
    def get_actual_delivery_date(self, obj):
        """Get the latest delivery date from supplier deliveries"""
        from .models_supplier_delivery import SupplierDelivery
        latest = SupplierDelivery.objects.filter(order_line=obj).order_by('-delivery_date').first()
        return str(latest.delivery_date) if latest else None
    
    def get_days_overdue_at_delivery(self, obj):
        """Calculate days overdue when delivery was made"""
        from .models_supplier_delivery import SupplierDelivery
        latest = SupplierDelivery.objects.filter(order_line=obj).order_by('-delivery_date').first()
        if latest and obj.etd:
            delta = (latest.delivery_date - obj.etd).days
            return delta if delta > 0 else 0
        return None
    
    def get_mill_offers(self, obj):
        """Get mill offers for this order line - handles missing table gracefully"""
        try:
            mill_offers = obj.mill_offers.all()
            return MillOfferSerializer(mill_offers, many=True).data
        except Exception:
            # Return empty list if table doesn't exist (migration not yet run)
            return []
    
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
            'status': data.get('status'),
            'notes': data.get('notes'),
            'totalValue': data.get('total_value'),
            'totalCost': data.get('total_cost'),
            'totalCommission': data.get('total_commission'),
            'profit': data.get('profit'),
            'lineLabel': data.get('line_label'),
            'totalDeliveredQuantity': data.get('total_delivered_quantity'),
            'actualDeliveryDate': data.get('actual_delivery_date'),
            'daysOverdueAtDelivery': data.get('days_overdue_at_delivery'),
            # Local order production fields - greige/yarn calculation
            'processLossPercent': float(data['process_loss_percent']) if data.get('process_loss_percent') else None,
            'mixedFabricType': data.get('mixed_fabric_type'),
            'mixedFabricPercent': float(data['mixed_fabric_percent']) if data.get('mixed_fabric_percent') else None,
            'greigeQuantity': float(data['greige_quantity']) if data.get('greige_quantity') else None,
            'yarnRequired': float(data['yarn_required']) if data.get('yarn_required') else None,
            'yarnBookedDate': data.get('yarn_booked_date'),
            'yarnReceivedDate': data.get('yarn_received_date'),
            'ppYards': float(data['pp_yards']) if data.get('pp_yards') else None,
            'fitCumPpSubmitDate': data.get('fit_cum_pp_submit_date'),
            'fitCumPpCommentsDate': data.get('fit_cum_pp_comments_date'),
            'knittingStartDate': data.get('knitting_start_date'),
            'knittingCompleteDate': data.get('knitting_complete_date'),
            'dyeingStartDate': data.get('dyeing_start_date'),
            'dyeingCompleteDate': data.get('dyeing_complete_date'),
            'bulkSizeSetDate': data.get('bulk_size_set_date'),
            'cuttingStartDate': data.get('cutting_start_date'),
            'cuttingCompleteDate': data.get('cutting_complete_date'),
            'printSendDate': data.get('print_send_date'),
            'printReceivedDate': data.get('print_received_date'),
            'sewingInputDate': data.get('sewing_input_date'),
            'sewingFinishDate': data.get('sewing_finish_date'),
            'packingCompleteDate': data.get('packing_complete_date'),
            'finalInspectionDate': data.get('final_inspection_date'),
            'exFactoryDate': data.get('ex_factory_date'),
            'millOffers': data.get('mill_offers', []),
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
            # Local order production field mappings - greige/yarn calculation
            'processLossPercent': 'process_loss_percent',
            'mixedFabricType': 'mixed_fabric_type',
            'mixedFabricPercent': 'mixed_fabric_percent',
            'greigeQuantity': 'greige_quantity',
            'yarnRequired': 'yarn_required',
            'yarnBookedDate': 'yarn_booked_date',
            'yarnReceivedDate': 'yarn_received_date',
            'ppYards': 'pp_yards',
            'fitCumPpSubmitDate': 'fit_cum_pp_submit_date',
            'fitCumPpCommentsDate': 'fit_cum_pp_comments_date',
            'knittingStartDate': 'knitting_start_date',
            'knittingCompleteDate': 'knitting_complete_date',
            'dyeingStartDate': 'dyeing_start_date',
            'dyeingCompleteDate': 'dyeing_complete_date',
            'bulkSizeSetDate': 'bulk_size_set_date',
            'cuttingStartDate': 'cutting_start_date',
            'cuttingCompleteDate': 'cutting_complete_date',
            'printSendDate': 'print_send_date',
            'printReceivedDate': 'print_received_date',
            'sewingInputDate': 'sewing_input_date',
            'sewingFinishDate': 'sewing_finish_date',
            'packingCompleteDate': 'packing_complete_date',
            'finalInspectionDate': 'final_inspection_date',
            'exFactoryDate': 'ex_factory_date',
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
            'id', 'color_code', 'color_name', 'cad_code', 'cad_name',
            'quantity', 'unit',
            'mill_name', 'mill_price', 'prova_price', 'commission', 'currency',
            'etd', 'eta', 'submission_date', 'approval_date',
            'approval_status', 'status', 'notes',
            # Local order production fields - greige/yarn calculation
            'process_loss_percent', 'mixed_fabric_type', 'mixed_fabric_percent', 'greige_quantity',
            'yarn_required', 'yarn_booked_date', 'yarn_received_date',
            'pp_yards', 'fit_cum_pp_submit_date', 'fit_cum_pp_comments_date',
            'knitting_start_date', 'knitting_complete_date',
            'dyeing_start_date', 'dyeing_complete_date',
            'bulk_size_set_date', 'cutting_start_date', 'cutting_complete_date',
            'print_send_date', 'print_received_date',
            'sewing_input_date', 'sewing_finish_date',
            'packing_complete_date', 'final_inspection_date', 'ex_factory_date'
        ]
        # CRITICAL: Make 'id' writable so nested update logic can identify existing lines
        extra_kwargs = {
            'id': {'read_only': False, 'required': False}
        }
    
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
            # Local order production field mappings - greige/yarn calculation
            'processLossPercent': 'process_loss_percent',
            'mixedFabricType': 'mixed_fabric_type',
            'mixedFabricPercent': 'mixed_fabric_percent',
            'greigeQuantity': 'greige_quantity',
            'yarnRequired': 'yarn_required',
            'yarnBookedDate': 'yarn_booked_date',
            'yarnReceivedDate': 'yarn_received_date',
            'ppYards': 'pp_yards',
            'fitCumPpSubmitDate': 'fit_cum_pp_submit_date',
            'fitCumPpCommentsDate': 'fit_cum_pp_comments_date',
            'knittingStartDate': 'knitting_start_date',
            'knittingCompleteDate': 'knitting_complete_date',
            'dyeingStartDate': 'dyeing_start_date',
            'dyeingCompleteDate': 'dyeing_complete_date',
            'bulkSizeSetDate': 'bulk_size_set_date',
            'cuttingStartDate': 'cutting_start_date',
            'cuttingCompleteDate': 'cutting_complete_date',
            'printSendDate': 'print_send_date',
            'printReceivedDate': 'print_received_date',
            'sewingInputDate': 'sewing_input_date',
            'sewingFinishDate': 'sewing_finish_date',
            'packingCompleteDate': 'packing_complete_date',
            'finalInspectionDate': 'final_inspection_date',
            'exFactoryDate': 'ex_factory_date',
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

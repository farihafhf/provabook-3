"""
Financials serializers
"""
from rest_framework import serializers
from .models import ProformaInvoice, LetterOfCredit


class ProformaInvoiceSerializer(serializers.ModelSerializer):
    """Proforma Invoice serializer with camelCase"""
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    pi_number = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = ProformaInvoice
        fields = ['id', 'order', 'order_number', 'customer_name', 'pi_number', 'version',
                  'status', 'amount', 'currency', 'issue_date', 'created_by', 
                  'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'pi_number', 'version', 'created_by', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert to camelCase"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'orderId': str(data['order']),
            'orderNumber': data['order_number'],
            'customerName': data['customer_name'],
            'piNumber': data['pi_number'],
            'version': data['version'],
            'status': data['status'],
            'amount': float(data['amount']),
            'currency': data['currency'],
            'issueDate': data.get('issue_date'),
            'createdBy': str(data['created_by']) if data.get('created_by') else None,
            'createdByName': data.get('created_by_name'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        mapping = {
            'orderId': 'order',
            'issueDate': 'issue_date',
        }
        converted = {}
        for key, value in data.items():
            converted[mapping.get(key, key)] = value
        return super().to_internal_value(converted)


class LetterOfCreditSerializer(serializers.ModelSerializer):
    """Letter of Credit serializer with camelCase"""
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    lc_number = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = LetterOfCredit
        fields = ['id', 'order', 'order_number', 'customer_name', 'lc_number',
                  'status', 'amount', 'currency', 'issue_date', 'expiry_date', 
                  'issuing_bank', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'lc_number', 'created_by', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert to camelCase"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'orderId': str(data['order']),
            'orderNumber': data['order_number'],
            'customerName': data['customer_name'],
            'lcNumber': data['lc_number'],
            'status': data['status'],
            'amount': float(data['amount']),
            'currency': data['currency'],
            'issueDate': data['issue_date'],
            'expiryDate': data['expiry_date'],
            'issuingBank': data.get('issuing_bank'),
            'createdBy': str(data['created_by']) if data.get('created_by') else None,
            'createdByName': data.get('created_by_name'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        mapping = {
            'orderId': 'order',
            'lcNumber': 'lc_number',
            'issueDate': 'issue_date',
            'expiryDate': 'expiry_date',
            'issuingBank': 'issuing_bank',
        }
        converted = {}
        for key, value in data.items():
            converted[mapping.get(key, key)] = value
        return super().to_internal_value(converted)

"""
DeletionRequest serializers
"""
from rest_framework import serializers
from .models_deletion_request import DeletionRequest, DeletionRequestStatus
from apps.authentication.serializers import UserSerializer


class DeletionRequestSerializer(serializers.ModelSerializer):
    """Serializer for DeletionRequest model"""
    requester_details = UserSerializer(source='requester', read_only=True)
    approver_details = UserSerializer(source='approver', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_style = serializers.SerializerMethodField()
    
    class Meta:
        model = DeletionRequest
        fields = [
            'id', 'order', 'order_number', 'order_style',
            'requester', 'requester_details',
            'approver', 'approver_details',
            'status', 'reason', 'response_note',
            'responded_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'requester', 'approver', 'status', 'response_note', 
                           'responded_at', 'created_at', 'updated_at']
    
    def get_order_style(self, obj):
        """Get style number for display"""
        return obj.order.style_number or obj.order.base_style_number or ''
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        
        requester_details = data.get('requester_details')
        if requester_details:
            requester_details = {
                'id': str(requester_details['id']),
                'email': requester_details['email'],
                'fullName': requester_details['full_name'],
                'role': requester_details['role'],
            }
        
        approver_details = data.get('approver_details')
        if approver_details:
            approver_details = {
                'id': str(approver_details['id']),
                'email': approver_details['email'],
                'fullName': approver_details['full_name'],
                'role': approver_details['role'],
            }
        
        return {
            'id': str(data['id']),
            'orderId': str(data['order']),
            'orderNumber': data['order_number'],
            'orderStyle': data['order_style'],
            'requesterId': str(data['requester']),
            'requesterDetails': requester_details,
            'approverId': str(data['approver']),
            'approverDetails': approver_details,
            'status': data['status'],
            'reason': data.get('reason'),
            'responseNote': data.get('response_note'),
            'respondedAt': data.get('responded_at'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }


class DeletionRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating deletion requests"""
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def create(self, validated_data):
        order = self.context['order']
        requester = self.context['requester']
        
        # Check if there's already a pending request
        existing = DeletionRequest.objects.filter(
            order=order,
            status=DeletionRequestStatus.PENDING
        ).first()
        
        if existing:
            raise serializers.ValidationError(
                "A deletion request is already pending for this order."
            )
        
        # Create the deletion request
        deletion_request = DeletionRequest.objects.create(
            order=order,
            requester=requester,
            approver=order.created_by,
            reason=validated_data.get('reason', '')
        )
        
        return deletion_request


class DeletionRequestResponseSerializer(serializers.Serializer):
    """Serializer for approving/declining deletion requests"""
    response_note = serializers.CharField(required=False, allow_blank=True)

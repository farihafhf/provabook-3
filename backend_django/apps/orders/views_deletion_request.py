"""
DeletionRequest views - Handles order deletion approval workflow
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models_deletion_request import DeletionRequest, DeletionRequestStatus
from .serializers_deletion_request import (
    DeletionRequestSerializer,
    DeletionRequestCreateSerializer,
    DeletionRequestResponseSerializer
)
from apps.core.models import Notification


class DeletionRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing deletion requests.
    
    Endpoints:
    - GET /deletion-requests/ - List all deletion requests for current user
    - GET /deletion-requests/{id}/ - Get single deletion request
    - POST /deletion-requests/{id}/approve/ - Approve a deletion request
    - POST /deletion-requests/{id}/decline/ - Decline a deletion request
    """
    serializer_class = DeletionRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return deletion requests relevant to the current user"""
        user = self.request.user
        # Return requests where user is either the requester or approver
        return DeletionRequest.objects.filter(
            models__in=['requester', 'approver']
        ).distinct()
    
    def get_queryset(self):
        """Return deletion requests relevant to the current user"""
        from django.db.models import Q
        user = self.request.user
        return DeletionRequest.objects.filter(
            Q(requester=user) | Q(approver=user)
        ).select_related('order', 'requester', 'approver').order_by('-created_at')
    
    def list(self, request):
        """List deletion requests for current user"""
        queryset = self.get_queryset()
        
        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by role (as requester or approver)
        role = request.query_params.get('role')
        if role == 'approver':
            queryset = queryset.filter(approver=request.user)
        elif role == 'requester':
            queryset = queryset.filter(requester=request.user)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a deletion request"""
        try:
            deletion_request = DeletionRequest.objects.select_related(
                'order', 'requester', 'approver'
            ).get(pk=pk)
        except DeletionRequest.DoesNotExist:
            return Response(
                {'error': 'Deletion request not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is the approver
        if deletion_request.approver != request.user:
            return Response(
                {'error': 'Only the order creator can approve this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already processed
        if deletion_request.status != DeletionRequestStatus.PENDING:
            return Response(
                {'error': f'This request has already been {deletion_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get response note from request
        serializer = DeletionRequestResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response_note = serializer.validated_data.get('response_note', '')
        
        # Approve and delete the order
        deletion_request.approve(response_note=response_note)
        
        return Response({
            'message': 'Deletion request approved. Order has been deleted.',
            'status': 'approved'
        })
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline a deletion request"""
        try:
            deletion_request = DeletionRequest.objects.select_related(
                'order', 'requester', 'approver'
            ).get(pk=pk)
        except DeletionRequest.DoesNotExist:
            return Response(
                {'error': 'Deletion request not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is the approver
        if deletion_request.approver != request.user:
            return Response(
                {'error': 'Only the order creator can decline this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already processed
        if deletion_request.status != DeletionRequestStatus.PENDING:
            return Response(
                {'error': f'This request has already been {deletion_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get response note from request
        serializer = DeletionRequestResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response_note = serializer.validated_data.get('response_note', '')
        
        # Decline the request
        deletion_request.decline(response_note=response_note)
        
        return Response({
            'message': 'Deletion request declined.',
            'status': 'declined'
        })
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get pending deletion requests where current user is the approver"""
        queryset = DeletionRequest.objects.filter(
            approver=request.user,
            status=DeletionRequestStatus.PENDING
        ).select_related('order', 'requester', 'approver').order_by('-created_at')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

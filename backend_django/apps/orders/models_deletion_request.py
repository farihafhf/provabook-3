"""
DeletionRequest model - Handles order deletion approval workflow
"""
from django.db import models
from apps.core.models import TimestampedModel
from apps.authentication.models import User


class DeletionRequestStatus(models.TextChoices):
    """Deletion request status choices"""
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    DECLINED = 'declined', 'Declined'


class DeletionRequest(TimestampedModel):
    """
    DeletionRequest model - Tracks deletion approval requests for orders
    
    When a non-owner tries to delete an order, a request is created.
    The order owner must approve or decline the request.
    """
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='deletion_requests',
        help_text='Order that is requested to be deleted'
    )
    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='deletion_requests_made',
        help_text='User who requested the deletion'
    )
    approver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='deletion_requests_received',
        help_text='User who must approve the deletion (order owner)'
    )
    status = models.CharField(
        max_length=20,
        choices=DeletionRequestStatus.choices,
        default=DeletionRequestStatus.PENDING,
        db_index=True
    )
    reason = models.TextField(
        blank=True,
        null=True,
        help_text='Optional reason for deletion request'
    )
    response_note = models.TextField(
        blank=True,
        null=True,
        help_text='Optional note from approver when approving/declining'
    )
    responded_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text='When the request was approved or declined'
    )
    
    class Meta:
        db_table = 'deletion_requests'
        verbose_name = 'Deletion Request'
        verbose_name_plural = 'Deletion Requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['requester']),
            models.Index(fields=['approver']),
        ]
    
    def __str__(self):
        return f"Delete request for {self.order.order_number} by {self.requester.full_name}"
    
    def approve(self, response_note=None):
        """Approve the deletion request and delete the order"""
        from django.utils import timezone
        from apps.core.models import Notification
        
        self.status = DeletionRequestStatus.APPROVED
        self.response_note = response_note
        self.responded_at = timezone.now()
        self.save()
        
        # Store order info before deletion
        order_number = self.order.order_number
        style_number = self.order.style_number or self.order.base_style_number or ''
        
        # Update the original notification to the approver (mark as processed)
        Notification.objects.filter(
            user=self.approver,
            related_id=str(self.id),
            related_type='deletion_request',
            notification_type='deletion_request'
        ).update(
            notification_type='deletion_request_approved',
            message=f'You approved the deletion of Order #{order_number} - {style_number}.',
            title='Deletion Approved'
        )
        
        # Create success notification for the requester
        Notification.objects.create(
            user=self.requester,
            title='Deletion Request Approved',
            message=f'{self.approver.full_name} approved the deletion. Order #{order_number} - {style_number} has been removed.',
            notification_type='deletion_approved',
            related_id=str(self.id),
            related_type='deletion_request',
            severity='info'
        )
        
        # Delete the order
        self.order.delete()
        
        return True
    
    def decline(self, response_note=None):
        """Decline the deletion request"""
        from django.utils import timezone
        from apps.core.models import Notification
        
        self.status = DeletionRequestStatus.DECLINED
        self.response_note = response_note
        self.responded_at = timezone.now()
        self.save()
        
        # Store order info
        order_number = self.order.order_number
        style_number = self.order.style_number or self.order.base_style_number or ''
        
        # Update the original notification to the approver (mark as processed)
        Notification.objects.filter(
            user=self.approver,
            related_id=str(self.id),
            related_type='deletion_request',
            notification_type='deletion_request'
        ).update(
            notification_type='deletion_request_declined',
            message=f'You declined the deletion of Order #{order_number} - {style_number}.',
            title='Deletion Declined'
        )
        
        # Create notification for the requester
        Notification.objects.create(
            user=self.requester,
            title='Deletion Request Declined',
            message=f'{self.approver.full_name} declined your deletion request for Order #{order_number}.',
            notification_type='deletion_declined',
            related_id=str(self.order.id),
            related_type='order',
            severity='warning'
        )
        
        return True

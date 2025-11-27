"""
Signals for order-related events
"""
from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import Order
from apps.core.models import Notification


@receiver(pre_save, sender=Order)
def notify_merchandiser_assignment(sender, instance, **kwargs):
    """
    Send notification when an order is assigned to a merchandiser
    """
    # Skip if this is a new order (no pk yet)
    if not instance.pk:
        return
    
    # Get the old instance to compare
    try:
        old_instance = Order.objects.get(pk=instance.pk)
    except Order.DoesNotExist:
        return
    
    # Check if merchandiser has changed
    old_merchandiser = old_instance.merchandiser
    new_merchandiser = instance.merchandiser
    
    # If merchandiser changed and there's a new merchandiser assigned
    if old_merchandiser != new_merchandiser and new_merchandiser is not None:
        # Create notification for the new merchandiser
        Notification.objects.create(
            user=new_merchandiser,
            title='Order Assigned to You',
            message=f'Order {instance.order_number} ({instance.customer_name}) has been assigned to you.',
            notification_type='order_assigned',
            related_id=str(instance.id),
            related_type='order',
            severity='info'
        )

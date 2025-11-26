"""
Management command to check for ETD reminders
Run this as a scheduled task (cron/celery) to check for orders with passed ETD but no deliveries
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date
from apps.orders.models import Order
from apps.orders.models_supplier_delivery import SupplierDelivery
from apps.core.models import Notification


class Command(BaseCommand):
    help = 'Check for orders with passed ETD but no deliveries and create notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=0,
            help='Number of days past ETD to check (default: 0 - today)',
        )

    def handle(self, *args, **options):
        days_past = options['days']
        today = date.today()
        
        # Find orders with ETD in the past (or equal to today) that have no deliveries
        orders_without_delivery = Order.objects.filter(
            etd__lte=today,
            etd__isnull=False
        ).exclude(
            supplier_deliveries__isnull=False
        ).select_related('merchandiser')
        
        reminder_count = 0
        
        for order in orders_without_delivery:
            # Check if we already sent a reminder for this order today
            existing_reminder = Notification.objects.filter(
                user=order.merchandiser,
                notification_type='etd_reminder',
                related_id=str(order.id),
                created_at__date=today
            ).exists()
            
            if not existing_reminder and order.merchandiser:
                # Calculate days overdue
                days_overdue = (today - order.etd).days
                
                # Create notification
                Notification.objects.create(
                    user=order.merchandiser,
                    title='ETD Passed - No Delivery Recorded',
                    message=f'Order {order.order_number} ({order.customer_name}) has passed its ETD ({order.etd}) by {days_overdue} day(s) but no delivery has been recorded yet.',
                    notification_type='etd_reminder',
                    related_id=str(order.id),
                    related_type='order',
                    severity='critical'
                )
                reminder_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created reminder for order {order.order_number} (ETD: {order.etd})')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {reminder_count} ETD reminder notification(s)')
        )

"""
Management command to check for ETD alerts and create notifications
Run this as a scheduled task (cron/celery) daily to check for orders approaching ETD or past ETD
Creates notifications from 10 days before ETD until delivery is confirmed
Yellow alert (warning): 10+ days before ETD
Red alert (critical): 5 days or less before ETD
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from apps.orders.models import Order
from apps.core.models import Notification, NotificationSeverity


class Command(BaseCommand):
    help = 'Check for orders approaching or past ETD and create daily notifications until delivery confirmed'

    def handle(self, *args, **options):
        today = date.today()
        ten_days_ahead = today + timedelta(days=10)
        
        # Find orders with ETD within next 10 days OR past ETD, that are not delivered yet
        orders_needing_alerts = Order.objects.filter(
            etd__isnull=False
        ).exclude(
            current_stage='Delivered'
        ).filter(
            etd__lte=ten_days_ahead
        ).select_related('merchandiser')
        
        alert_count = 0
        
        for order in orders_needing_alerts:
            # Skip if no merchandiser
            if not order.merchandiser:
                continue
            
            # Check if we already sent an alert for this order today
            existing_alert = Notification.objects.filter(
                user=order.merchandiser,
                notification_type='etd_alert',
                related_id=str(order.id),
                created_at__date=today
            ).exists()
            
            if existing_alert:
                continue
            
            # Calculate days until ETD
            days_until_etd = (order.etd - today).days
            
            # Determine severity and message
            if days_until_etd < 0:
                # Past ETD
                days_overdue = abs(days_until_etd)
                severity = NotificationSeverity.CRITICAL
                title = f'ETD Overdue - Order {order.order_number}'
                message = f'Order {order.order_number} ({order.customer_name}) ETD was {days_overdue} day(s) ago ({order.etd}). Delivery not yet confirmed.'
            elif days_until_etd <= 5:
                # Red alert: 5 days or less
                severity = NotificationSeverity.CRITICAL
                title = f'Urgent: ETD in {days_until_etd} day(s) - Order {order.order_number}'
                message = f'Order {order.order_number} ({order.customer_name}) ETD is in {days_until_etd} day(s) on {order.etd}. Please ensure timely delivery.'
            else:
                # Yellow alert: 6-10 days
                severity = NotificationSeverity.WARNING
                title = f'ETD Approaching - Order {order.order_number}'
                message = f'Order {order.order_number} ({order.customer_name}) ETD is in {days_until_etd} days on {order.etd}. Please monitor progress.'
            
            # Create notification
            Notification.objects.create(
                user=order.merchandiser,
                title=title,
                message=message,
                notification_type='etd_alert',
                severity=severity,
                related_id=str(order.id),
                related_type='order'
            )
            alert_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created {severity} alert for order {order.order_number} (ETD: {order.etd}, Days: {days_until_etd})'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {alert_count} ETD alert notification(s)')
        )

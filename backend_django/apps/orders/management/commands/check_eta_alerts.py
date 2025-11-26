"""Management command to create ETA alert notifications.
Run this as a scheduled task (cron/celery) to generate notifications
for orders whose ETA is within 10 days (or already passed) and not yet delivered.
"""

from datetime import date

from django.core.management.base import BaseCommand

from apps.core.models import Notification
from apps.orders.models import Order, OrderStatus, OrderCategory
from apps.orders.models_style_color import OrderStyle, OrderColor


class Command(BaseCommand):
    help = (
        "Create ETA alert notifications for orders that are "
        "within 10 days of ETA (or overdue) and not yet delivered."
    )

    def handle(self, *args, **options):
        today = date.today()

        base_qs = (
            Order.objects.filter(eta__isnull=False)
            .exclude(category=OrderCategory.ARCHIVED)
            .exclude(status=OrderStatus.COMPLETED)
            .select_related('merchandiser')
        )

        order_rows = list(base_qs.values_list('id', 'eta'))
        order_ids = [row[0] for row in order_rows]

        eta_sources: dict[str, list] = {}

        for order_id, order_eta in order_rows:
            if order_eta:
                eta_sources.setdefault(order_id, []).append(order_eta)

        if order_ids:
            # Style-level ETA
            style_rows = (
                OrderStyle.objects.filter(order_id__in=order_ids)
                .values_list('order_id', 'eta')
            )
            for order_id, style_eta in style_rows:
                if style_eta:
                    eta_sources.setdefault(order_id, []).append(style_eta)

            # Color-level ETA
            color_rows = (
                OrderColor.objects.filter(style__order_id__in=order_ids)
                .values_list('style__order_id', 'eta')
            )
            for order_id, color_eta in color_rows:
                if color_eta:
                    eta_sources.setdefault(order_id, []).append(color_eta)

        effective_eta: dict[str, date] = {}
        for order_id in order_ids:
            dates = eta_sources.get(order_id)
            if dates:
                effective_eta[order_id] = min(dates)

        created_count = 0

        for order in base_qs:
            if not order.merchandiser:
                continue

            eta_date = effective_eta.get(order.id)
            if not eta_date:
                continue

            days_until_eta = (eta_date - today).days

            # Start sending alerts from 10 days before ETA and continue daily afterwards
            if days_until_eta > 10:
                continue

            # Avoid duplicate notification for the same order/user on the same day
            exists = Notification.objects.filter(
                user=order.merchandiser,
                notification_type__in=['eta_alert_high', 'eta_alert_medium'],
                related_id=str(order.id),
                created_at__date=today,
            ).exists()

            if exists:
                continue

            if days_until_eta <= 5:
                notification_type = 'eta_alert_high'
                severity = 'critical'
            else:
                notification_type = 'eta_alert_medium'
                severity = 'warning'

            if days_until_eta >= 0:
                title = 'Upcoming ETA Alert'
                message = (
                    f"Order {order.order_number} ({order.customer_name}) "
                    f"is {days_until_eta} day(s) away from its ETA ({eta_date})."
                )
            else:
                days_overdue = abs(days_until_eta)
                title = 'ETA Passed - Delivery Pending'
                message = (
                    f"Order {order.order_number} ({order.customer_name}) "
                    f"has passed its ETA ({eta_date}) by {days_overdue} day(s), "
                    "but delivery has not been marked as completed."
                )

            Notification.objects.create(
                user=order.merchandiser,
                title=title,
                message=message,
                notification_type=notification_type,
                related_id=str(order.id),
                related_type='order',
                severity=severity,
            )

            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {notification_type} for order {order.order_number} (ETA: {eta_date})"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created {created_count} ETA alert notification(s)"
            )
        )

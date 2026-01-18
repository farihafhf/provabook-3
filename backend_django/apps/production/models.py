"""Production app models"""
from datetime import date

from django.db import models

from apps.core.models import TimestampedModel
from apps.orders.models import Order


class ProductionMetric(TimestampedModel):
    """Daily production metrics linked to an order"""

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='production_metrics',
    )
    date = models.DateField(default=date.today)
    knitted_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    dyed_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    finished_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'production_metrics'
        ordering = ['-date']

    def __str__(self) -> str:  # pragma: no cover - simple representation
        return f"{self.order.order_number} - {self.date}"

"""
Shipments models
"""
from django.db import models
from apps.core.models import TimestampedModel
from apps.orders.models import Order
from apps.authentication.models import User


# TODO: Define your models here
# Example:
# class shipment(TimestampedModel):
#     name = models.CharField(max_length=255)
#     description = models.TextField(blank=True)
#     created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
#     
#     class Meta:
#         db_table = 'shipments'


class Shipment(TimestampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('returned', 'Returned'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='shipments',
    )
    carrier_name = models.CharField(max_length=255)
    awb_number = models.CharField(max_length=100)
    shipping_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
    )
    documents = models.FileField(
        upload_to='shipments/docs/',
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'shipments'
        ordering = ['-shipping_date', '-created_at']

    def __str__(self):
        return f"{self.carrier_name} - {self.awb_number} ({self.order.order_number})"

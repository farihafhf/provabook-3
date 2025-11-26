"""
SupplierDelivery model - Records actual delivery entries against orders
"""
from django.db import models
from apps.core.models import TimestampedModel
from apps.authentication.models import User


class SupplierDelivery(TimestampedModel):
    """
    SupplierDelivery model - Records actual supplier deliveries against orders
    Each order can have multiple delivery entries
    """
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='supplier_deliveries',
        db_index=True
    )
    
    # Style and Color references (optional)
    style = models.ForeignKey(
        'orders.OrderStyle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deliveries',
        help_text='Optional: Style this delivery is for'
    )
    color = models.ForeignKey(
        'orders.OrderColor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deliveries',
        help_text='Optional: Color this delivery is for'
    )
    
    # Delivery details
    delivery_date = models.DateField(
        help_text='Actual delivery date (defaults to ETD)'
    )
    delivered_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Quantity delivered by supplier'
    )
    unit = models.CharField(
        max_length=20,
        default='meters',
        help_text='Unit of measurement'
    )
    
    # Optional note
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes about this delivery'
    )
    
    # Tracking
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_deliveries',
        db_column='created_by_id'
    )
    
    class Meta:
        db_table = 'supplier_deliveries'
        verbose_name = 'Supplier Delivery'
        verbose_name_plural = 'Supplier Deliveries'
        ordering = ['-delivery_date', '-created_at']
        indexes = [
            models.Index(fields=['order', 'delivery_date']),
            models.Index(fields=['delivery_date']),
        ]
    
    def __str__(self):
        return f"{self.order.order_number} - {self.delivered_quantity} {self.unit} on {self.delivery_date}"
    
    def clean(self):
        """Validate delivery quantity"""
        from django.core.exceptions import ValidationError
        
        if self.delivered_quantity and self.delivered_quantity <= 0:
            raise ValidationError({
                'delivered_quantity': 'Delivered quantity must be greater than 0'
            })

"""
ProductionEntry model - Records knitting, dyeing, finishing entries for local orders
Similar to SupplierDelivery but for production tracking
"""
from django.db import models
from apps.core.models import TimestampedModel
from apps.authentication.models import User


class ProductionEntryType(models.TextChoices):
    """Types of production entries"""
    KNITTING = 'knitting', 'Knitting'
    DYEING = 'dyeing', 'Dyeing'
    FINISHING = 'finishing', 'Finishing'


class ProductionEntry(TimestampedModel):
    """
    ProductionEntry model - Records production progress (knitting, dyeing, finishing) for local orders
    Each order/order_line can have multiple production entries of each type
    """
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='production_entries',
        db_index=True
    )
    
    # OrderLine reference (optional) - for specific style+color+CAD tracking
    order_line = models.ForeignKey(
        'orders.OrderLine',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='production_entries',
        help_text='Optional: Specific order line (style+color+CAD) this entry is for'
    )
    
    # Entry type (knitting, dyeing, finishing)
    entry_type = models.CharField(
        max_length=20,
        choices=ProductionEntryType.choices,
        db_index=True,
        help_text='Type of production entry'
    )
    
    # Entry details
    entry_date = models.DateField(
        help_text='Date of this production entry'
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Quantity processed'
    )
    unit = models.CharField(
        max_length=20,
        default='kg',
        help_text='Unit of measurement (kg, yards, meters, etc.)'
    )
    
    # Optional note
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes about this entry'
    )
    
    # Tracking
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_production_entries',
        db_column='created_by_id'
    )
    
    class Meta:
        db_table = 'production_entries'
        verbose_name = 'Production Entry'
        verbose_name_plural = 'Production Entries'
        ordering = ['-entry_date', '-created_at']
        indexes = [
            models.Index(fields=['order', 'entry_type']),
            models.Index(fields=['order', 'entry_date']),
            models.Index(fields=['entry_type', 'entry_date']),
            models.Index(fields=['order_line', 'entry_type']),
        ]
    
    def __str__(self):
        line_info = f" - {self.order_line.line_label}" if self.order_line else ""
        return f"{self.order.order_number}{line_info} - {self.get_entry_type_display()} - {self.quantity} {self.unit} on {self.entry_date}"
    
    def clean(self):
        """Validate entry quantity"""
        from django.core.exceptions import ValidationError
        
        if self.quantity and self.quantity <= 0:
            raise ValidationError({
                'quantity': 'Quantity must be greater than 0'
            })

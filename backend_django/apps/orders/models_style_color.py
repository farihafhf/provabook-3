"""
OrderStyle and OrderColor models
"""
from django.db import models
from apps.core.models import TimestampedModel
from .models import Order


class OrderStyle(TimestampedModel):
    """
    OrderStyle model - Represents a style variant within an order
    Each order can have multiple styles, auto-numbered as style-01, style-02, etc.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='styles',
        db_index=True
    )
    
    # Auto-generated style number with increment (e.g., STYLE-01, STYLE-02)
    # Uses order.base_style_number as the base
    style_number = models.CharField(max_length=150, db_index=True)
    
    # Style-specific details
    description = models.TextField(blank=True, null=True, help_text='Style description')
    fabric_type = models.CharField(max_length=255, blank=True, null=True)
    fabric_specifications = models.TextField(blank=True, null=True)
    fabric_composition = models.CharField(max_length=255, blank=True, null=True)
    gsm = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    finish_type = models.CharField(max_length=100, blank=True, null=True)
    construction = models.TextField(blank=True, null=True, help_text='Construction details including width and other info')
    cuttable_width = models.CharField(max_length=100, blank=True, null=True, help_text='Cuttable width specification')
    
    # Style-level dates
    etd = models.DateField(blank=True, null=True, help_text='Estimated Time of Departure')
    eta = models.DateField(blank=True, null=True, help_text='Estimated Time of Arrival')
    submission_date = models.DateField(blank=True, null=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'order_styles'
        verbose_name = 'Order Style'
        verbose_name_plural = 'Order Styles'
        ordering = ['style_number']
        constraints = [
            # Ensure style_number is unique within an order
            models.UniqueConstraint(
                fields=['order', 'style_number'],
                name='unique_style_per_order'
            )
        ]
        indexes = [
            models.Index(fields=['order', 'style_number']),
        ]
    
    def __str__(self):
        return f"{self.order.order_number} - {self.style_number}"
    
    def save(self, *args, **kwargs):
        """Auto-generate style_number if not provided"""
        if not self.style_number and self.order_id:
            # Get base style number from order
            base_style = self.order.base_style_number or 'STYLE'
            # Count existing styles for this order
            existing_count = OrderStyle.objects.filter(order=self.order).count()
            # Generate style number: base_style_number-01, base_style_number-02, etc.
            self.style_number = f"{base_style}-{str(existing_count + 1).zfill(2)}"
        super().save(*args, **kwargs)


class OrderColor(TimestampedModel):
    """
    OrderColor model - Represents a color variant within a style
    Each style can have multiple colors with unique color codes
    """
    style = models.ForeignKey(
        OrderStyle,
        on_delete=models.CASCADE,
        related_name='colors',
        db_index=True
    )
    
    # Color code (compulsory, unique within order)
    color_code = models.CharField(max_length=100, db_index=True)
    
    # Color name (optional)
    color_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Quantity
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='meters')
    
    # Color-specific dates
    etd = models.DateField(blank=True, null=True, help_text='Estimated Time of Departure')
    eta = models.DateField(blank=True, null=True, help_text='Estimated Time of Arrival')
    submission_date = models.DateField(blank=True, null=True)
    approval_date = models.DateField(blank=True, null=True)
    
    # Pricing (per color)
    mill_name = models.CharField(max_length=255, blank=True, null=True)
    mill_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    prova_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    commission = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text='Commission amount or percentage')
    currency = models.CharField(max_length=10, default='USD')
    
    # Approval status (JSON for different approval types)
    approval_status = models.JSONField(blank=True, null=True, default=dict)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'order_colors'
        verbose_name = 'Order Color'
        verbose_name_plural = 'Order Colors'
        ordering = ['color_code']
        constraints = [
            # Ensure color_code is unique within a style
            models.UniqueConstraint(
                fields=['style', 'color_code'],
                name='unique_color_code_per_style'
            )
        ]
        indexes = [
            models.Index(fields=['style', 'color_code']),
        ]
    
    def __str__(self):
        return f"{self.style.style_number} - {self.color_code} ({self.color_name})"
    
    @property
    def total_value(self):
        """Calculate total value for this color"""
        if self.prova_price and self.quantity:
            return float(self.prova_price) * float(self.quantity)
        return 0
    
    @property
    def total_cost(self):
        """Calculate total cost (mill price) for this color"""
        if self.mill_price and self.quantity:
            return float(self.mill_price) * float(self.quantity)
        return 0
    
    @property
    def total_commission(self):
        """Calculate total commission for this color"""
        if self.commission and self.quantity:
            return float(self.commission) * float(self.quantity)
        return 0

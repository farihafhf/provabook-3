"""
OrderLine model - Represents style+color+CAD combinations with all commercial and approval data
Each line is an independent combination that can have:
- Style only (no color, no CAD)
- Style + Color (no CAD)
- Style + CAD (no color)
- Style + Color + CAD

All commercial data (quantities, prices, dates, approvals) live at the line level.
"""
from django.db import models
from apps.core.models import TimestampedModel
from .models import Order, OrderStatus
from .models_style_color import OrderStyle


class OrderLine(TimestampedModel):
    """
    OrderLine model - Atomic unit of an order representing a specific combination
    
    Each line represents one of these combinations:
    - (Style, Color, CAD)
    - (Style, Color, no CAD)
    - (Style, no Color, CAD)
    - (Style, no Color, no CAD) - style-only line
    
    All quantities, prices, dates, and approval statuses live here.
    """
    # Required: Every line belongs to a style
    style = models.ForeignKey(
        OrderStyle,
        on_delete=models.CASCADE,
        related_name='lines',
        db_index=True,
        help_text='Parent style for this line'
    )
    
    # Optional: Color code (null if this is a CAD-only or style-only line)
    color_code = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
        help_text='Color code for this line (optional)'
    )
    color_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Color name (optional)'
    )
    
    # Optional: CAD code (null if this is a color-only or style-only line)
    cad_code = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
        help_text='CAD code for this line (optional)'
    )
    cad_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='CAD name or description (optional)'
    )
    
    # Quantity (required for every line)
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Quantity for this specific line'
    )
    unit = models.CharField(max_length=20, default='meters')
    
    # Pricing (per line)
    mill_name = models.CharField(max_length=255, blank=True, null=True)
    mill_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text='Mill price per unit for this line'
    )
    prova_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text='Prova price per unit for this line'
    )
    commission = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text='Commission amount per unit for this line'
    )
    currency = models.CharField(max_length=10, default='USD')
    
    # Dates (per line)
    etd = models.DateField(
        blank=True,
        null=True,
        help_text='Estimated Time of Departure for this line'
    )
    eta = models.DateField(
        blank=True,
        null=True,
        help_text='Estimated Time of Arrival for this line'
    )
    submission_date = models.DateField(
        blank=True,
        null=True,
        help_text='Submission date for this line'
    )
    approval_date = models.DateField(
        blank=True,
        null=True,
        help_text='Overall approval date for this line'
    )
    
    # Approval status (JSON for different approval types at line level)
    # Keys: labDip, strikeOff, handloom, aop, qualityTest, quality, bulkSwatch, price, ppSample
    # Values: submission, resubmission, approved, rejected
    approval_status = models.JSONField(
        blank=True,
        null=True,
        default=dict,
        help_text='Approval status for each gate at this line level'
    )
    
    # Status (per line)
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.UPCOMING,
        db_index=True,
        help_text='Status of this specific order line'
    )
    
    # Notes specific to this line
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'order_lines'
        verbose_name = 'Order Line'
        verbose_name_plural = 'Order Lines'
        ordering = ['style', 'color_code', 'cad_code']
        constraints = [
            # Ensure unique combination of style+color+cad
            models.UniqueConstraint(
                fields=['style', 'color_code', 'cad_code'],
                name='unique_line_combination',
                # This handles NULL values properly in most DBs
            )
        ]
        indexes = [
            models.Index(fields=['style', 'color_code']),
            models.Index(fields=['style', 'cad_code']),
            models.Index(fields=['style', 'color_code', 'cad_code']),
        ]
    
    def __str__(self):
        parts = [str(self.style.style_number)]
        if self.color_code:
            parts.append(f"Color: {self.color_code}")
        if self.cad_code:
            parts.append(f"CAD: {self.cad_code}")
        return " | ".join(parts)
    
    @property
    def order(self):
        """Convenience property to get the order through style"""
        return self.style.order
    
    @property
    def total_value(self):
        """Calculate total value for this line"""
        if self.prova_price and self.quantity:
            return float(self.prova_price) * float(self.quantity)
        return 0
    
    @property
    def total_cost(self):
        """Calculate total cost (mill price) for this line"""
        if self.mill_price and self.quantity:
            return float(self.mill_price) * float(self.quantity)
        return 0
    
    @property
    def total_commission(self):
        """Calculate total commission for this line"""
        if self.commission and self.quantity:
            return float(self.commission) * float(self.quantity)
        return 0
    
    @property
    def profit(self):
        """Calculate profit for this line"""
        return self.total_value - self.total_cost - self.total_commission
    
    @property
    def line_label(self):
        """Human-readable label for this line"""
        parts = []
        if self.color_code:
            color_label = self.color_name or self.color_code
            parts.append(f"Color: {color_label}")
        if self.cad_code:
            cad_label = self.cad_name or self.cad_code
            parts.append(f"CAD: {cad_label}")
        if not parts:
            return "Base line"
        return " | ".join(parts)

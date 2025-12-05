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
    
    # Quantity (optional)
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text='Quantity for this specific line'
    )
    unit = models.CharField(max_length=20, default='yards')
    
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
    
    # ========== Local Order Production Fields ==========
    # These fields are only relevant for local orders (order.order_type == 'local')
    
    # Process Loss & Mixed Fabric Fields (for calculating greige and yarn)
    process_loss_percent = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True,
        help_text='Process loss percentage from finished fabric to greige (e.g., 10 for 10%)'
    )
    mixed_fabric_type = models.CharField(
        max_length=100, blank=True, null=True,
        help_text='Name of mixed fabric (e.g., lycra, spandex)'
    )
    mixed_fabric_percent = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True,
        help_text='Percentage of mixed fabric in greige (e.g., 4 for 4%)'
    )
    greige_quantity = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True,
        help_text='Calculated greige quantity (finished fabric + process loss)'
    )
    
    # Yarn Fields
    yarn_required = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True,
        help_text='Calculated yarn required (greige minus mixed fabric portion)'
    )
    yarn_booked_date = models.DateField(
        blank=True, null=True,
        help_text='Date when yarn was booked'
    )
    yarn_received_date = models.DateField(
        blank=True, null=True,
        help_text='Date when yarn was received'
    )
    
    # PP Fields
    pp_yards = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True,
        help_text='PP Yards'
    )
    fit_cum_pp_submit_date = models.DateField(
        blank=True, null=True,
        help_text='FIT CUM PP Submit Date'
    )
    fit_cum_pp_comments_date = models.DateField(
        blank=True, null=True,
        help_text='FIT CUM PP Comments Date'
    )
    
    # Knitting Fields (calculated from yarn_received_date but editable)
    knitting_start_date = models.DateField(
        blank=True, null=True,
        help_text='Knitting Start Date (Yarn Received + 11 days)'
    )
    knitting_complete_date = models.DateField(
        blank=True, null=True,
        help_text='Knitting Complete Date (Knitting Start + 18 days)'
    )
    
    # Dyeing Fields
    dyeing_start_date = models.DateField(
        blank=True, null=True,
        help_text='Dyeing Start Date (Knitting Start + 5 days)'
    )
    dyeing_complete_date = models.DateField(
        blank=True, null=True,
        help_text='Date when dyeing was completed'
    )
    
    # Cutting Fields
    bulk_size_set_date = models.DateField(
        blank=True, null=True,
        help_text='Bulk Size Set Date'
    )
    cutting_start_date = models.DateField(
        blank=True, null=True,
        help_text='Cutting Start Date'
    )
    cutting_complete_date = models.DateField(
        blank=True, null=True,
        help_text='Cutting Complete Date'
    )
    
    # Print Fields (Optional)
    print_send_date = models.DateField(
        blank=True, null=True,
        help_text='Print Send Date (optional)'
    )
    print_received_date = models.DateField(
        blank=True, null=True,
        help_text='Print Received Date (optional)'
    )
    
    # Sewing Fields
    sewing_input_date = models.DateField(
        blank=True, null=True,
        help_text='Sewing Input Date'
    )
    sewing_finish_date = models.DateField(
        blank=True, null=True,
        help_text='Sewing Finish Date'
    )
    
    # Final Stage Fields
    packing_complete_date = models.DateField(
        blank=True, null=True,
        help_text='Packing Complete Date'
    )
    final_inspection_date = models.DateField(
        blank=True, null=True,
        help_text='Final Inspection Date'
    )
    ex_factory_date = models.DateField(
        blank=True, null=True,
        help_text='Ex-Factory Date'
    )
    
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
    
    def _calculate_greige_and_yarn(self):
        """
        Calculate greige_quantity and yarn_required based on finished fabric quantity,
        process loss percentage, and mixed fabric percentage.
        
        Standard textile industry formula:
        1. Greige = Finished Fabric * (1 + ProcessLoss%)
        2. Yarn = Greige * (1 - MixedFabric%)
        
        Example: 1000 kg finished, 10% process loss, 4% lycra
        - Greige = 1000 * 1.10 = 1100 kg
        - Yarn = 1100 * 0.96 = 1056 kg
        """
        from decimal import Decimal
        
        if not self.quantity:
            return
        
        finished = Decimal(str(self.quantity))
        
        # Get process loss (default 0 if not set)
        loss_percent = Decimal(str(self.process_loss_percent or 0)) / Decimal('100')
        
        # Calculate greige: finished * (1 + loss)
        self.greige_quantity = finished * (Decimal('1') + loss_percent)
        
        # Get mixed fabric percent (default 0 if not set)
        mixed_percent = Decimal(str(self.mixed_fabric_percent or 0)) / Decimal('100')
        
        # Calculate yarn: greige * (1 - mixed)
        self.yarn_required = self.greige_quantity * (Decimal('1') - mixed_percent)
    
    def save(self, *args, **kwargs):
        """Auto-calculate local order fields"""
        # Only auto-calculate for local orders
        if self.style and self.style.order and self.style.order.order_type == 'local':
            # Calculate greige and yarn requirements
            self._calculate_greige_and_yarn()
            
            # Auto-calculate production dates based on yarn_received_date
            if self.yarn_received_date:
                from datetime import timedelta
                
                # Calculate Knitting Start (Yarn Received + 11 days) if not already set
                if not self.knitting_start_date:
                    self.knitting_start_date = self.yarn_received_date + timedelta(days=11)
                
                # Calculate Knitting Complete (Knitting Start + 18 days) if not already set
                if not self.knitting_complete_date and self.knitting_start_date:
                    self.knitting_complete_date = self.knitting_start_date + timedelta(days=18)
                
                # Calculate Dyeing Start (Knitting Start + 5 days) if not already set
                if not self.dyeing_start_date and self.knitting_start_date:
                    self.dyeing_start_date = self.knitting_start_date + timedelta(days=5)
        
        super().save(*args, **kwargs)
    
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


class MillOffer(TimestampedModel):
    """
    MillOffer model - Represents a price quote from a mill for a specific order line.
    
    When an order is in 'In Development' stage, multiple mills may offer different prices
    to produce the fabric. This model stores those quotes for comparison.
    
    Example:
    - First Concept: $1.05/yard
    - Shanchey: $1.10/yard
    - CompX: $1.00/yard
    """
    order_line = models.ForeignKey(
        OrderLine,
        on_delete=models.CASCADE,
        related_name='mill_offers',
        db_index=True,
        help_text='Order line this mill offer belongs to'
    )
    
    mill_name = models.CharField(
        max_length=255,
        help_text='Name of the mill offering the price'
    )
    
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Price per unit offered by the mill'
    )
    
    currency = models.CharField(
        max_length=10,
        default='USD',
        help_text='Currency of the price'
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes about this offer'
    )
    
    class Meta:
        db_table = 'mill_offers'
        verbose_name = 'Mill Offer'
        verbose_name_plural = 'Mill Offers'
        ordering = ['mill_name']
    
    def __str__(self):
        return f"{self.mill_name} - {self.currency} {self.price}"
    
    @property
    def formatted_display(self):
        """Format for display: 'Mill Name - $Price'"""
        return f"{self.mill_name} - ${self.price:.2f}"

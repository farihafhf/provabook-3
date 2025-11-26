"""
Orders models - Matches NestJS Order entity structure
"""
import uuid
from django.db import models
from apps.core.models import TimestampedModel
from apps.authentication.models import User
from .models_document import Document

class OrderStatus(models.TextChoices):
    """Order status choices"""
    UPCOMING = 'upcoming', 'Upcoming'
    IN_DEVELOPMENT = 'in_development', 'In Development'
    RUNNING = 'running', 'Running Order'
    BULK = 'bulk', 'Bulk'
    COMPLETED = 'completed', 'Completed'
    ARCHIVED = 'archived', 'Archived'


class OrderCategory(models.TextChoices):
    """Order category choices"""
    UPCOMING = 'upcoming', 'Upcoming'
    RUNNING = 'running', 'Running'
    ARCHIVED = 'archived', 'Archived'


class Order(TimestampedModel):
    """
    Order model - Main order entity
    Matches the orders table from NestJS TypeORM entity
    
    Note: order_number is now PO (Purchase Order) number and can have duplicates.
    Internal uid is used for unique identification.
    """
    # Internal Unique Identifier (hidden from users)
    uid = models.UUIDField(unique=True, editable=False, db_index=True, help_text='Internal unique identifier for this order')
    
    # Basic Information
    order_number = models.CharField(max_length=50, db_index=True, help_text='PO (Purchase Order) number - can have duplicates')
    customer_name = models.CharField(max_length=255)
    buyer_name = models.CharField(max_length=255, blank=True, null=True)
    base_style_number = models.CharField(max_length=100, blank=True, null=True, help_text='Base style number for auto-generating style variants')
    style_number = models.CharField(max_length=100, blank=True, null=True)
    cad = models.CharField(max_length=255, blank=True, null=True, help_text='CAD reference or identifier')
    
    # Fabric Details
    fabric_type = models.CharField(max_length=255)
    fabric_specifications = models.TextField(blank=True, null=True)
    fabric_composition = models.CharField(max_length=255, blank=True, null=True)
    gsm = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    finish_type = models.CharField(max_length=100, blank=True, null=True)
    construction = models.CharField(max_length=100, blank=True, null=True)
    
    # Pricing
    mill_name = models.CharField(max_length=255, blank=True, null=True)
    mill_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    prova_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=10, default='USD')
    
    # Quantity
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='meters')
    color_quantity_breakdown = models.JSONField(blank=True, null=True, default=list)
    colorways = models.JSONField(blank=True, null=True, default=list)
    
    # Dates
    etd = models.DateField(blank=True, null=True, help_text='Estimated Time of Departure')
    eta = models.DateField(blank=True, null=True, help_text='Estimated Time of Arrival')
    order_date = models.DateField(blank=True, null=True)
    expected_delivery_date = models.DateField(blank=True, null=True)
    actual_delivery_date = models.DateField(blank=True, null=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.UPCOMING,
        db_index=True
    )
    category = models.CharField(
        max_length=20,
        choices=OrderCategory.choices,
        default=OrderCategory.UPCOMING,
        db_index=True
    )
    
    # Approval Gates
    approval_status = models.JSONField(blank=True, null=True, default=dict)
    current_stage = models.CharField(max_length=50, default='Design')
    
    # Additional Information
    notes = models.TextField(blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True, default=dict)
    
    # Relationships
    merchandiser = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        db_column='merchandiser_id'
    )
    
    class Meta:
        db_table = 'orders'
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['uid']),
            models.Index(fields=['order_number']),
            models.Index(fields=['status']),
            models.Index(fields=['category']),
            models.Index(fields=['created_at']),
            models.Index(fields=['merchandiser']),
        ]
    
    def __str__(self):
        return f"{self.order_number} - {self.customer_name}"
    
    def save(self, *args, **kwargs):
        """Auto-generate order number and uid if not provided"""
        if not self.uid:
            self.uid = uuid.uuid4()
        if not self.order_number:
            from apps.core.utils import generate_order_number
            self.order_number = generate_order_number()
        super().save(*args, **kwargs)
    
    @property
    def total_value(self):
        """Calculate total order value (revenue)
        Aggregates value from all color variants across all styles
        Formula: sum(color.prova_price * color.quantity) for all colors
        Falls back to order-level pricing if no styles/colors exist
        """
        # Try to calculate from color variants first
        total_value = 0.0
        has_colors = False
        
        for style in self.styles.all():
            for color in style.colors.all():
                if color.prova_price and color.quantity:
                    has_colors = True
                    total_value += float(color.prova_price) * float(color.quantity)
        
        if has_colors:
            return total_value
        
        # Fallback to order-level pricing
        if self.prova_price and self.quantity:
            return float(self.prova_price) * float(self.quantity)
        
        return 0.0
    
    @property
    def total_delivered_quantity(self):
        """Calculate total delivered quantity from all supplier deliveries"""
        from django.db.models import Sum
        result = self.supplier_deliveries.aggregate(total=Sum('delivered_quantity'))
        return float(result['total']) if result['total'] else 0.0
    
    @property
    def shortage_excess_quantity(self):
        """Calculate shortage (negative) or excess (positive) quantity
        Formula: delivered - ordered
        """
        return self.total_delivered_quantity - float(self.quantity)
    
    @property
    def potential_profit(self):
        """Calculate potential profit based on ordered quantity
        Aggregates profit from all color variants across all styles
        Formula: sum((color.prova_price - color.mill_price) * color.quantity) for all colors
        Falls back to order-level pricing if no styles/colors exist
        """
        # Try to calculate from color variants first
        total_profit = 0.0
        has_colors = False
        
        for style in self.styles.all():
            for color in style.colors.all():
                if color.prova_price and color.mill_price and color.quantity:
                    has_colors = True
                    unit_profit = float(color.prova_price) - float(color.mill_price)
                    total_profit += unit_profit * float(color.quantity)
        
        if has_colors:
            return total_profit
        
        # Fallback to order-level pricing
        if self.prova_price and self.mill_price and self.quantity:
            unit_profit = float(self.prova_price) - float(self.mill_price)
            return unit_profit * float(self.quantity)
        
        return 0.0
    
    @property
    def realized_profit(self):
        """Calculate realized profit based on delivered quantity with auto-adjustment
        If delivered < ordered: profit based on delivered quantity
        If delivered >= ordered: profit based on ordered quantity (no extra profit)
        
        For orders with color variants: applies delivery ratio to each color's profit
        For simple orders: uses order-level pricing
        """
        delivered = self.total_delivered_quantity
        ordered = float(self.quantity)
        
        # Calculate delivery ratio
        if ordered > 0:
            delivery_ratio = min(1.0, delivered / ordered)  # Cap at 100%
        else:
            delivery_ratio = 0.0
        
        # Try to calculate from color variants first
        total_profit = 0.0
        has_colors = False
        
        for style in self.styles.all():
            for color in style.colors.all():
                if color.prova_price and color.mill_price and color.quantity:
                    has_colors = True
                    unit_profit = float(color.prova_price) - float(color.mill_price)
                    color_potential_profit = unit_profit * float(color.quantity)
                    # Apply delivery ratio to this color's profit
                    total_profit += color_potential_profit * delivery_ratio
        
        if has_colors:
            return total_profit
        
        # Fallback to order-level pricing
        if self.prova_price and self.mill_price:
            unit_profit = float(self.prova_price) - float(self.mill_price)
            effective_quantity = min(ordered, delivered)
            return unit_profit * effective_quantity
        
        return 0.0
    
    @property
    def realized_value(self):
        """Calculate realized value (revenue) based on delivered quantity with auto-adjustment
        Formula: sum(color.prova_price * color.quantity) * delivery_ratio for all colors
        Falls back to order-level pricing if no styles/colors exist
        """
        delivered = self.total_delivered_quantity
        ordered = float(self.quantity)
        
        # Calculate delivery ratio
        if ordered > 0:
            delivery_ratio = min(1.0, delivered / ordered)  # Cap at 100%
        else:
            delivery_ratio = 0.0
        
        # Try to calculate from color variants first
        total_value = 0.0
        has_colors = False
        
        for style in self.styles.all():
            for color in style.colors.all():
                if color.prova_price and color.quantity:
                    has_colors = True
                    color_potential_value = float(color.prova_price) * float(color.quantity)
                    # Apply delivery ratio to this color's value
                    total_value += color_potential_value * delivery_ratio
        
        if has_colors:
            return total_value
        
        # Fallback to order-level pricing
        if self.prova_price:
            effective_quantity = min(ordered, delivered)
            return float(self.prova_price) * effective_quantity
        
        return 0.0
    
    def update_approval_status(self, approval_type, status_value):
        """Update a specific approval status"""
        if not self.approval_status:
            self.approval_status = {}
        self.approval_status[approval_type] = status_value
        self.save(update_fields=['approval_status', 'updated_at'])
    
    def change_stage(self, new_stage):
        """
        Change the current stage
        Auto-archives order and sets delivery date when marked as Delivered
        """
        from datetime import date
        
        self.current_stage = new_stage
        
        # Auto-archive when order is marked as Delivered
        if new_stage == 'Delivered':
            # mark as completed in status and archived in category
            self.status = OrderStatus.COMPLETED
            self.category = OrderCategory.ARCHIVED
            # Auto-populate actual_delivery_date if not already set
            if not self.actual_delivery_date:
                self.actual_delivery_date = date.today()
            self.save(update_fields=['current_stage', 'status', 'category', 'actual_delivery_date', 'updated_at'])
        else:
            self.save(update_fields=['current_stage', 'updated_at'])


class ApprovalHistory(TimestampedModel):
    """
    Approval History model - Tracks all approval changes for an order
    Stores multiple submission/resubmission dates and approval status changes
    """
    
    APPROVAL_TYPE_CHOICES = [
        ('labDip', 'Lab Dip'),
        ('strikeOff', 'Strike-Off'),
        ('handloom', 'Handloom'),
        ('ppSample', 'PP Sample'),
        ('quality', 'Quality'),
        ('price', 'Price'),
    ]
    
    STATUS_CHOICES = [
        ('submission', 'Submission'),
        ('resubmission', 'Re-submission'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='approval_history'
    )
    approval_type = models.CharField(max_length=20, choices=APPROVAL_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approval_changes'
    )
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'approval_history'
        ordering = ['-created_at']
        verbose_name = 'Approval History'
        verbose_name_plural = 'Approval Histories'
        indexes = [
            models.Index(fields=['order', 'approval_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.order.order_number} - {self.get_approval_type_display()} - {self.get_status_display()}"

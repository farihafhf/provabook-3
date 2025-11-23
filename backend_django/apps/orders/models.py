"""
Orders models - Matches NestJS Order entity structure
"""
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
    """
    # Basic Information
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    customer_name = models.CharField(max_length=255)
    buyer_name = models.CharField(max_length=255, blank=True, null=True)
    style_number = models.CharField(max_length=100, blank=True, null=True)
    
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
            models.Index(fields=['order_number']),
            models.Index(fields=['status']),
            models.Index(fields=['category']),
            models.Index(fields=['created_at']),
            models.Index(fields=['merchandiser']),
        ]
    
    def __str__(self):
        return f"{self.order_number} - {self.customer_name}"
    
    def save(self, *args, **kwargs):
        """Auto-generate order number if not provided"""
        if not self.order_number:
            from apps.core.utils import generate_order_number
            self.order_number = generate_order_number()
        super().save(*args, **kwargs)
    
    @property
    def total_value(self):
        """Calculate total order value"""
        if self.prova_price and self.quantity:
            return float(self.prova_price) * float(self.quantity)
        return 0
    
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

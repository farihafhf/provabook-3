"""
Samples models
"""
from django.db import models
from apps.core.models import TimestampedModel
from apps.orders.models import Order
from apps.authentication.models import User


class Sample(TimestampedModel):
    """Sample model for lab dips, strike-offs, etc."""
    
    TYPE_CHOICES = [
        ('lab_dip', 'Lab Dip'),
        ('strike_off', 'Strike-Off'),
        ('bulk_swatch', 'Bulk Swatch'),
        ('pp_sample', 'PP Sample'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='samples')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    version = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submission_date = models.DateField(null=True, blank=True)
    recipient = models.CharField(max_length=255, blank=True, null=True)
    courier_name = models.CharField(max_length=255, blank=True, null=True)
    awb_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'samples'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.get_type_display()} v{self.version} - {self.order.order_number}"

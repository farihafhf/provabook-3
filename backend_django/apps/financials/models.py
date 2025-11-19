"""
Financials models
"""
from django.db import models
from apps.core.models import TimestampedModel
from apps.orders.models import Order
from apps.authentication.models import User


class ProformaInvoice(TimestampedModel):
    """Proforma Invoice model"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='proforma_invoices')
    pi_number = models.CharField(max_length=100, unique=True)
    version = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    issue_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_pis')
    
    class Meta:
        db_table = 'proforma_invoices'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.pi_number} v{self.version}"


class LetterOfCredit(TimestampedModel):
    """Letter of Credit model"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('issued', 'Issued'),
        ('confirmed', 'Confirmed'),
        ('expired', 'Expired'),
    ]
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='letters_of_credit')
    lc_number = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    issue_date = models.DateField()
    expiry_date = models.DateField()
    issuing_bank = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_lcs')
    
    class Meta:
        db_table = 'letters_of_credit'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.lc_number}"

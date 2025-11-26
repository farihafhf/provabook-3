"""
Document model for storing order-related files
"""
import uuid
import os
from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import TimestampedModel

User = get_user_model()


def document_upload_path(instance, filename):
    """Generate upload path for documents"""
    # Extract file extension
    ext = filename.split('.')[-1]
    # Generate new filename: orders/{order_id}/{uuid}.{ext}
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('orders', str(instance.order.id), filename)


class Document(TimestampedModel):
    """Document model for order files"""
    
    class Category(models.TextChoices):
        SAMPLE = 'sample', 'Sample Photo'
        LC = 'lc', 'LC Document'
        PI = 'pi', 'PI Document'
        EMAIL = 'email', 'Email'
        OTHER = 'other', 'Other'
    
    class Subcategory(models.TextChoices):
        LAB_DIP = 'lab_dip', 'Lab Dip'
        STRIKE_OFF = 'strike_off', 'Strike-Off'
        QUALITY_TEST = 'quality_test', 'Quality Test'
        BULK_SWATCH = 'bulk_swatch', 'Bulk Swatch'
        PP_SAMPLE = 'pp_sample', 'PP Sample'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='documents')
    
    # Optional: Associate with specific order line
    order_line = models.ForeignKey(
        'orders.OrderLine',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents',
        help_text='Optional: Specific order line (style+color+CAD) this document is for'
    )
    
    # File fields
    file = models.FileField(upload_to=document_upload_path)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()  # Size in bytes
    
    # Metadata
    category = models.CharField(max_length=50, choices=Category.choices)
    subcategory = models.CharField(max_length=50, choices=Subcategory.choices, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    # User tracking
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')
    
    class Meta:
        db_table = 'order_documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order', 'category']),
            models.Index(fields=['uploaded_by']),
        ]
    
    def __str__(self):
        return f"{self.file_name} - {self.order.order_number}"
    
    @property
    def file_url(self):
        """Return the URL to access the file"""
        if self.file:
            return self.file.url
        return None
    
    def delete(self, *args, **kwargs):
        """Override delete to also delete the file from storage"""
        if self.file:
            # Delete the file from storage
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

"""
Core models - Base models and shared functionality
"""
import uuid
from django.db import models


class TimestampedModel(models.Model):
    """
    Abstract base model that provides self-updating
    'created_at' and 'updated_at' fields.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class NotificationSeverity(models.TextChoices):
    """Notification severity levels for alerts"""
    INFO = 'info', 'Info'
    WARNING = 'warning', 'Warning'  # Yellow alert (10 days before ETD)
    CRITICAL = 'critical', 'Critical'  # Red alert (5 days before ETD)


class Notification(TimestampedModel):
    """
    Notification model for user notifications
    """
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50)
    severity = models.CharField(
        max_length=20,
        choices=NotificationSeverity.choices,
        default=NotificationSeverity.INFO
    )
    related_id = models.CharField(max_length=255, blank=True, null=True)
    related_type = models.CharField(max_length=50, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        
    def __str__(self):
        return f'{self.title} - {self.user.full_name}'

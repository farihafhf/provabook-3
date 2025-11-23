"""
Task models for order-related task assignments
"""
from django.db import models
from apps.core.models import TimestampedModel
from apps.authentication.models import User
from .models import Order


class TaskStatus(models.TextChoices):
    """Task status choices"""
    PENDING = 'pending', 'Pending'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class TaskPriority(models.TextChoices):
    """Task priority choices"""
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class Task(TimestampedModel):
    """
    Task model for order-related task assignments
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='tasks',
        db_column='order_id'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
        db_column='assigned_to_id'
    )
    
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tasks',
        db_column='assigned_by_id'
    )
    
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING,
        db_index=True
    )
    
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM
    )
    
    due_date = models.DateField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    metadata = models.JSONField(blank=True, null=True, default=dict)
    
    class Meta:
        db_table = 'order_tasks'
        verbose_name = 'Order Task'
        verbose_name_plural = 'Order Tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['status']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.order.order_number}"
    
    def mark_completed(self):
        """Mark task as completed"""
        from django.utils import timezone
        self.status = TaskStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at', 'updated_at'])
    
    def mark_in_progress(self):
        """Mark task as in progress"""
        self.status = TaskStatus.IN_PROGRESS
        self.save(update_fields=['status', 'updated_at'])

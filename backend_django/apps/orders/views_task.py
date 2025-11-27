"""
Task views
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models_task import Task
from .serializers_task import (
    TaskSerializer, TaskCreateSerializer, TaskUpdateSerializer, TaskListSerializer
)
from apps.core.permissions import IsMerchandiser


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task CRUD operations
    
    Endpoints:
    - GET /tasks/ - List all tasks
    - POST /tasks/ - Create new task
    - GET /tasks/{id}/ - Get task details
    - PATCH /tasks/{id}/ - Update task
    - DELETE /tasks/{id}/ - Delete task
    - POST /tasks/{id}/mark_completed/ - Mark task as completed
    - POST /tasks/{id}/mark_in_progress/ - Mark task as in progress
    """
    queryset = Task.objects.select_related('order', 'assigned_to', 'assigned_by').all()
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['title', 'description', 'order__order_number']
    ordering_fields = ['created_at', 'due_date', 'priority', 'status']
    ordering = ['-created_at']
    pagination_class = None  # Disable pagination
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return TaskListSerializer
        elif self.action == 'create':
            return TaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        return TaskSerializer
    
    def get_queryset(self):
        """
        Filter tasks based on query parameters and user role
        By default, returns only tasks assigned to the current user
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # By default, show only tasks assigned to current user
        # Managers/Admins can see all tasks by passing ?show_all=true
        show_all = self.request.query_params.get('show_all', 'false').lower() == 'true'
        if not show_all:
            queryset = queryset.filter(assigned_to=user)
        
        # Filter by order_id if provided
        order_id = self.request.query_params.get('order_id')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        
        # Filter by assigned_to if provided (for managers viewing specific user's tasks)
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        
        # Filter by status if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by priority if provided
        priority_param = self.request.query_params.get('priority')
        if priority_param:
            queryset = queryset.filter(priority=priority_param)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set assigned_by to current user when creating task"""
        serializer.save(assigned_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create task with custom response and update order merchandiser"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = serializer.save(assigned_by=request.user)
        
        # Update the order's merchandiser field to match the task assignee
        if task.assigned_to and task.order:
            task.order.merchandiser = task.assigned_to
            task.order.save(update_fields=['merchandiser'])
        
        # Create notification for assigned user
        if task.assigned_to:
            try:
                from apps.core.models import Notification
                # Point notification directly to the related order so the assignee
                # can navigate to that order from the notification.
                Notification.objects.create(
                    user=task.assigned_to,
                    title='New Task Assigned',
                    message=f'You have been assigned a new task: "{task.title}" by {request.user.full_name}',
                    notification_type='task_assigned',
                    related_id=str(task.order_id),
                    related_type='order',
                )
            except Exception as e:
                # Log error but don't fail the request
                print(f'Failed to create notification: {e}')
        
        # Return full task data
        response_serializer = TaskSerializer(task)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update task with custom response"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full task data
        response_serializer = TaskSerializer(instance)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'], url_path='mark-completed')
    def mark_completed(self, request, pk=None):
        """
        POST /tasks/{id}/mark-completed/
        Mark task as completed
        """
        task = self.get_object()
        task.mark_completed()
        
        # Return updated task
        response_serializer = TaskSerializer(task)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'], url_path='mark-in-progress')
    def mark_in_progress(self, request, pk=None):
        """
        POST /tasks/{id}/mark-in-progress/
        Mark task as in progress
        """
        task = self.get_object()
        task.mark_in_progress()
        
        # Return updated task
        response_serializer = TaskSerializer(task)
        return Response(response_serializer.data)

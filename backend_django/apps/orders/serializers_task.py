"""
Task serializers
"""
from rest_framework import serializers
from .models_task import Task, TaskStatus, TaskPriority
from apps.authentication.serializers import UserSerializer


class TaskSerializer(serializers.ModelSerializer):
    """
    Complete Task serializer with all fields
    Returns camelCase for frontend
    """
    assigned_to_details = UserSerializer(source='assigned_to', read_only=True)
    assigned_by_details = UserSerializer(source='assigned_by', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'order', 'order_number', 'title', 'description',
            'assigned_to', 'assigned_to_details', 'assigned_by', 'assigned_by_details',
            'status', 'priority', 'due_date', 'completed_at',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        
        # Convert user details to camelCase
        assigned_to_details = data.get('assigned_to_details')
        if assigned_to_details:
            assigned_to_details = {
                'id': str(assigned_to_details['id']),
                'email': assigned_to_details['email'],
                'fullName': assigned_to_details['full_name'],
                'role': assigned_to_details['role'],
                'phone': assigned_to_details.get('phone'),
                'department': assigned_to_details.get('department'),
                'isActive': assigned_to_details['is_active'],
            }
        
        assigned_by_details = data.get('assigned_by_details')
        if assigned_by_details:
            assigned_by_details = {
                'id': str(assigned_by_details['id']),
                'email': assigned_by_details['email'],
                'fullName': assigned_by_details['full_name'],
                'role': assigned_by_details['role'],
                'phone': assigned_by_details.get('phone'),
                'department': assigned_by_details.get('department'),
                'isActive': assigned_by_details['is_active'],
            }
        
        return {
            'id': str(data['id']),
            'order': str(data['order']),
            'orderNumber': data.get('order_number'),
            'title': data['title'],
            'description': data.get('description'),
            'assignedTo': str(data['assigned_to']) if data.get('assigned_to') else None,
            'assignedToDetails': assigned_to_details,
            'assignedBy': str(data['assigned_by']) if data.get('assigned_by') else None,
            'assignedByDetails': assigned_by_details,
            'status': data['status'],
            'priority': data['priority'],
            'dueDate': data.get('due_date'),
            'completedAt': data.get('completed_at'),
            'metadata': data.get('metadata'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }


class TaskCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating tasks
    Accepts both camelCase (from frontend) and snake_case
    """
    class Meta:
        model = Task
        fields = [
            'order', 'title', 'description', 'assigned_to',
            'status', 'priority', 'due_date', 'metadata'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'assignedTo': 'assigned_to',
            'dueDate': 'due_date',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)
    
    def create(self, validated_data):
        """Create task with assigned_by set to current user"""
        # assigned_by will be set in the view
        return super().create(validated_data)


class TaskUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating tasks
    Accepts both camelCase (from frontend) and snake_case
    """
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'assigned_to',
            'status', 'priority', 'due_date', 'metadata'
        ]
    
    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'assignedTo': 'assigned_to',
            'dueDate': 'due_date',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)


class TaskListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing tasks
    Returns camelCase for frontend
    """
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'order', 'order_number', 'title', 'assigned_to',
            'assigned_to_name', 'status', 'priority', 'due_date', 'created_at'
        ]
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': str(data['id']),
            'order': str(data['order']),
            'orderNumber': data.get('order_number'),
            'title': data['title'],
            'assignedTo': str(data['assigned_to']) if data.get('assigned_to') else None,
            'assignedToName': data.get('assigned_to_name'),
            'status': data['status'],
            'priority': data['priority'],
            'dueDate': data.get('due_date'),
            'createdAt': data['created_at'],
        }

"""
Serializers for core app models
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'severity',
            'related_id', 'related_type', 'is_read',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert snake_case to camelCase for frontend"""
        data = super().to_representation(instance)
        return {
            'id': data['id'],
            'title': data['title'],
            'message': data['message'],
            'notificationType': data['notification_type'],
            'severity': data['severity'],
            'relatedId': data['related_id'],
            'relatedType': data['related_type'],
            'isRead': data['is_read'],
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }

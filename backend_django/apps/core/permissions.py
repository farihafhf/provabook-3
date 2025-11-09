"""
Custom permissions for role-based access control
"""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission check for Admin role
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsManager(permissions.BasePermission):
    """
    Permission check for Manager role (includes Admin)
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'manager']


class IsMerchandiser(permissions.BasePermission):
    """
    Permission check for Merchandiser role (includes Admin and Manager)
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'manager', 'merchandiser']


class IsAdminOrManager(permissions.BasePermission):
    """
    Permission check for Admin or Manager roles
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'manager']


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to only allow owners or admins to edit an object.
    """
    def has_object_permission(self, request, view, obj):
        # Admins can do anything
        if request.user.role == 'admin':
            return True
        
        # Check if object has merchandiser_id or user_id
        if hasattr(obj, 'merchandiser_id'):
            return obj.merchandiser_id == request.user.id
        elif hasattr(obj, 'user_id'):
            return obj.user_id == request.user.id
        elif hasattr(obj, 'created_by_id'):
            return obj.created_by_id == request.user.id
        
        return False


class ReadOnly(permissions.BasePermission):
    """
    Read-only permission for any request
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS

#!/usr/bin/env python
"""
Quick scaffolding script to generate Django app boilerplate
Usage: python generate_app_scaffolding.py <app_name>
Example: python generate_app_scaffolding.py orders
"""

import os
import sys

APP_TEMPLATE = {
    '__init__.py': '# {app_name_title} app\n',
    
    'apps.py': '''"""
{app_name_title} app configuration
"""
from django.apps import AppConfig


class {app_name_class}Config(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.{app_name}'
    verbose_name = '{app_name_title}'
''',
    
    'models.py': '''"""
{app_name_title} models
"""
from django.db import models
from apps.core.models import TimestampedModel
from apps.authentication.models import User


# TODO: Define your models here
# Example:
# class {app_name_singular}(TimestampedModel):
#     name = models.CharField(max_length=255)
#     description = models.TextField(blank=True)
#     created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
#     
#     class Meta:
#         db_table = '{app_name}'
#         verbose_name = '{app_name_singular}'
#         verbose_name_plural = '{app_name}'
#         ordering = ['-created_at']
#     
#     def __str__(self):
#         return self.name
''',
    
    'serializers.py': '''"""
{app_name_title} serializers
"""
from rest_framework import serializers
# from .models import {app_name_singular}


# TODO: Define your serializers here
# Example:
# class {app_name_singular}Serializer(serializers.ModelSerializer):
#     class Meta:
#         model = {app_name_singular}
#         fields = '__all__'
#         read_only_fields = ['id', 'created_at', 'updated_at']
''',
    
    'views.py': '''"""
{app_name_title} views
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
# from .models import {app_name_singular}
# from .serializers import {app_name_singular}Serializer
from apps.core.permissions import IsMerchandiser


# TODO: Define your ViewSets here
# Example:
# class {app_name_singular}ViewSet(viewsets.ModelViewSet):
#     queryset = {app_name_singular}.objects.all()
#     serializer_class = {app_name_singular}Serializer
#     permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
#     filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
#     filterset_fields = ['created_by', 'created_at']
#     search_fields = ['name', 'description']
#     ordering_fields = ['created_at', 'name']
#     ordering = ['-created_at']
#     
#     def perform_create(self, serializer):
#         serializer.save(created_by=self.request.user)
#     
#     @action(detail=True, methods=['post'])
#     def custom_action(self, request, pk=None):
#         instance = self.get_object()
#         # Your custom logic here
#         return Response({{'message': 'Action completed'}})
''',
    
    'urls.py': '''"""
{app_name_title} URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# from .views import {app_name_singular}ViewSet

app_name = '{app_name}'

router = DefaultRouter()
# TODO: Register your viewsets
# router.register(r'', {app_name_singular}ViewSet, basename='{app_name_singular_lower}')

urlpatterns = [
    path('', include(router.urls)),
]
''',
    
    'admin.py': '''"""
Django admin configuration for {app_name_title}
"""
from django.contrib import admin
# from .models import {app_name_singular}


# TODO: Register your models
# @admin.register({app_name_singular})
# class {app_name_singular}Admin(admin.ModelAdmin):
#     list_display = ['id', 'name', 'created_by', 'created_at']
#     list_filter = ['created_at', 'created_by']
#     search_fields = ['name', 'description']
#     ordering = ['-created_at']
#     readonly_fields = ['id', 'created_at', 'updated_at']
''',
    
    'filters.py': '''"""
{app_name_title} filters
"""
from django_filters import rest_framework as filters
# from .models import {app_name_singular}


# TODO: Define custom filters if needed
# class {app_name_singular}Filter(filters.FilterSet):
#     name = filters.CharFilter(lookup_expr='icontains')
#     created_after = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
#     created_before = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
#     
#     class Meta:
#         model = {app_name_singular}
#         fields = ['name', 'created_by']
''',
}


def create_app_structure(app_name):
    """Create Django app directory structure with boilerplate code"""
    
    # Convert app name to different formats
    app_name_lower = app_name.lower()
    app_name_title = app_name.replace('_', ' ').title()
    app_name_class = ''.join(word.title() for word in app_name.split('_'))
    app_name_singular = app_name.rstrip('s')
    app_name_singular_lower = app_name_singular.lower()
    
    # Create app directory
    app_path = f'apps/{app_name_lower}'
    os.makedirs(app_path, exist_ok=True)
    
    # Create files
    for filename, content in APP_TEMPLATE.items():
        filepath = os.path.join(app_path, filename)
        formatted_content = content.format(
            app_name=app_name_lower,
            app_name_title=app_name_title,
            app_name_class=app_name_class,
            app_name_singular=app_name_singular,
            app_name_singular_lower=app_name_singular_lower,
        )
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(formatted_content)
    
    print(f"✅ App '{app_name}' created successfully at {app_path}/")
    print(f"\n📝 Next steps:")
    print(f"1. Add 'apps.{app_name_lower}' to INSTALLED_APPS in config/settings.py")
    print(f"2. Define your models in {app_path}/models.py")
    print(f"3. Create migrations: python manage.py makemigrations {app_name_lower}")
    print(f"4. Run migrations: python manage.py migrate")
    print(f"5. Define serializers in {app_path}/serializers.py")
    print(f"6. Define views in {app_path}/views.py")
    print(f"7. Register URLs in config/urls.py")
    print(f"8. Test your endpoints!")


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_app_scaffolding.py <app_name>")
        print("Example: python generate_app_scaffolding.py orders")
        sys.exit(1)
    
    app_name = sys.argv[1]
    
    # Validate app name
    if not app_name.replace('_', '').isalnum():
        print("Error: App name must contain only letters, numbers, and underscores")
        sys.exit(1)
    
    create_app_structure(app_name)


if __name__ == '__main__':
    main()

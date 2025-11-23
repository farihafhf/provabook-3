"""
Orders URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet
from .views_task import TaskViewSet

app_name = 'orders'

# Configure router to work without trailing slashes for frontend compatibility
router = DefaultRouter(trailing_slash=False)
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]

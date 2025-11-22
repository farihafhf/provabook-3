"""Production URL configuration"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ProductionMetricViewSet, ProductionSummaryView


app_name = 'production'

router = DefaultRouter(trailing_slash=True)
router.register(r'', ProductionMetricViewSet, basename='production-metric')

urlpatterns = [
    path('summary/<uuid:order_id>/', ProductionSummaryView.as_view(), name='production-summary'),
    path('', include(router.urls)),
]

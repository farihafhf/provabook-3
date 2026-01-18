"""
Financials URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProformaInvoiceViewSet, LetterOfCreditViewSet, FinancialAnalyticsView, OrderProfitsView

app_name = 'financials'

router = DefaultRouter(trailing_slash=True)
router.register(r'pis', ProformaInvoiceViewSet, basename='proforma-invoice')
router.register(r'lcs', LetterOfCreditViewSet, basename='letter-of-credit')

urlpatterns = [
    path('analytics/pipeline/', FinancialAnalyticsView.as_view(), name='analytics-pipeline'),
    path('', include(router.urls)),
    path('order-profits/', OrderProfitsView.as_view(), name='order-profits'),
]

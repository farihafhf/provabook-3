"""
Financials URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProformaInvoiceViewSet, LetterOfCreditViewSet, FinancialAnalyticsView

app_name = 'financials'

router = DefaultRouter(trailing_slash=True)
router.register(r'pis', ProformaInvoiceViewSet, basename='pi')
router.register(r'lcs', LetterOfCreditViewSet, basename='lc')

urlpatterns = [
    path('analytics/pipeline/', FinancialAnalyticsView.as_view(), name='analytics-pipeline'),
    path('', include(router.urls)),
]

"""
Financials URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProformaInvoiceViewSet, LetterOfCreditViewSet

app_name = 'financials'

router = DefaultRouter(trailing_slash=False)
router.register(r'pis', ProformaInvoiceViewSet, basename='pi')
router.register(r'lcs', LetterOfCreditViewSet, basename='lc')

urlpatterns = [
    path('', include(router.urls)),
]

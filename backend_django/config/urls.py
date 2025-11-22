"""
URL configuration for Provabook project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from apps.orders.views import OrderViewSet

# Swagger/OpenAPI Schema
schema_view = get_schema_view(
    openapi.Info(
        title="Provabook API",
        default_version='v1',
        description="Textile Operations Management Platform API",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@provabook.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # API v1 endpoints
    path('api/v1/auth/', include('apps.authentication.urls')),
    # Orders API - base path with trailing slash so router can correctly map list and detail
    path(
        'api/v1/orders/<uuid:pk>/download-po/',
        OrderViewSet.as_view({'get': 'download_po'}),
        name='order-download-po',
    ),
    path('api/v1/orders/', include('apps.orders.urls')),
    # Operational alerts (explicit routes to avoid prefix issues)
    path(
        'api/v1/orders/alerts/upcoming-etd',
        OrderViewSet.as_view({'get': 'alerts_upcoming_etd'}),
        name='order-alerts-upcoming-etd',
    ),
    path(
        'api/v1/orders/alerts/stuck-approvals',
        OrderViewSet.as_view({'get': 'alerts_stuck_approvals'}),
        name='order-alerts-stuck-approvals',
    ),
    
    # Dashboard (temporary endpoint in core)
    path('api/v1/dashboard', lambda request: __import__('apps.core.views', fromlist=['dashboard_view']).dashboard_view(request)),
    
    # Samples API
    path('api/v1/samples/', include('apps.samples.urls')),
    
    # Financials
    path('api/v1/financials/', include('apps.financials.urls')),
    
    # Placeholder endpoints
    path('api/v1/orders/documents/<str:document_id>', lambda request, document_id: __import__('apps.core.views', fromlist=['document_delete_view']).document_delete_view(request, document_id)),
    
    # TODO: Uncomment as you create these apps
    # path('api/v1/production/', include('apps.production.urls')),
    # path('api/v1/incidents/', include('apps.incidents.urls')),
    # path('api/v1/shipments/', include('apps.shipments.urls')),
    # path('api/v1/notifications/', include('apps.notifications.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

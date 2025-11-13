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
    # Expose orders with and without trailing slash
    path('api/v1/orders', include('apps.orders.urls')),
    path('api/v1/orders/', include('apps.orders.urls')),
    
    # Dashboard (temporary endpoint in core)
    path('api/v1/dashboard', lambda request: __import__('apps.core.views', fromlist=['dashboard_view']).dashboard_view(request)),
    
    # Placeholder endpoints (return empty arrays until implemented)
    path('api/v1/samples', lambda request: __import__('apps.core.views', fromlist=['samples_list_view']).samples_list_view(request)),
    path('api/v1/financials', lambda request: __import__('apps.core.views', fromlist=['financials_list_view']).financials_list_view(request)),
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

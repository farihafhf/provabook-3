"""
Django admin configuration for Orders
"""
from django.contrib import admin
from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """
    Admin interface for Order model
    """
    list_display = [
        'order_number', 'customer_name', 'fabric_type', 'quantity', 
        'status', 'category', 'merchandiser', 'order_date', 'created_at'
    ]
    list_filter = [
        'status', 'category', 'current_stage', 'order_date', 
        'created_at', 'merchandiser'
    ]
    search_fields = [
        'order_number', 'customer_name', 'buyer_name', 
        'fabric_type', 'style_number'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    readonly_fields = ['id', 'order_number', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'id', 'order_number', 'customer_name', 'buyer_name', 
                'style_number', 'merchandiser'
            )
        }),
        ('Fabric Details', {
            'fields': (
                'fabric_type', 'fabric_specifications', 'fabric_composition',
                'gsm', 'finish_type', 'construction'
            )
        }),
        ('Pricing', {
            'fields': (
                'mill_name', 'mill_price', 'prova_price', 'currency'
            )
        }),
        ('Quantity', {
            'fields': (
                'quantity', 'unit', 'color_quantity_breakdown', 'colorways'
            )
        }),
        ('Dates', {
            'fields': (
                'order_date', 'expected_delivery_date', 'actual_delivery_date',
                'etd', 'eta'
            )
        }),
        ('Status', {
            'fields': (
                'status', 'category', 'current_stage', 'approval_status'
            )
        }),
        ('Additional Information', {
            'fields': (
                'notes', 'metadata'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': (
                'created_at', 'updated_at'
            )
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with select_related"""
        queryset = super().get_queryset(request)
        return queryset.select_related('merchandiser')
    
    actions = ['mark_as_running', 'mark_as_completed', 'mark_as_archived']
    
    @admin.action(description='Mark selected orders as Running')
    def mark_as_running(self, request, queryset):
        """Bulk action to mark orders as running"""
        updated = queryset.update(category='running', status='running')
        self.message_user(request, f'{updated} order(s) marked as Running.')
    
    @admin.action(description='Mark selected orders as Completed')
    def mark_as_completed(self, request, queryset):
        """Bulk action to mark orders as completed"""
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} order(s) marked as Completed.')
    
    @admin.action(description='Mark selected orders as Archived')
    def mark_as_archived(self, request, queryset):
        """Bulk action to mark orders as archived"""
        updated = queryset.update(category='archived')
        self.message_user(request, f'{updated} order(s) marked as Archived.')

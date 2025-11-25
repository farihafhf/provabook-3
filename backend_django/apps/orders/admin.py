"""
Django admin configuration for Orders
"""
from django.contrib import admin
from .models import Order
from .models_task import Task
from .models_style_color import OrderStyle, OrderColor


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


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """
    Admin interface for Task model
    """
    list_display = [
        'title', 'order', 'assigned_to', 'assigned_by', 
        'status', 'priority', 'due_date', 'created_at'
    ]
    list_filter = [
        'status', 'priority', 'due_date', 'created_at'
    ]
    search_fields = [
        'title', 'description', 'order__order_number',
        'assigned_to__full_name', 'assigned_by__full_name'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    readonly_fields = ['id', 'created_at', 'updated_at', 'completed_at']
    
    fieldsets = (
        ('Task Information', {
            'fields': (
                'id', 'order', 'title', 'description'
            )
        }),
        ('Assignment', {
            'fields': (
                'assigned_to', 'assigned_by'
            )
        }),
        ('Status & Priority', {
            'fields': (
                'status', 'priority', 'due_date', 'completed_at'
            )
        }),
        ('Additional Information', {
            'fields': (
                'metadata',
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
        return queryset.select_related('order', 'assigned_to', 'assigned_by')


class OrderColorInline(admin.TabularInline):
    """Inline admin for OrderColor"""
    model = OrderColor
    extra = 1
    fields = [
        'color_code', 'color_name', 'quantity', 'unit',
        'mill_price', 'prova_price', 'commission', 'currency',
        'etd', 'eta', 'submission_date', 'approval_date'
    ]


@admin.register(OrderStyle)
class OrderStyleAdmin(admin.ModelAdmin):
    """Admin interface for OrderStyle model"""
    list_display = [
        'style_number', 'order', 'fabric_type', 'etd', 'created_at'
    ]
    list_filter = ['etd', 'created_at']
    search_fields = [
        'style_number', 'order__order_number', 'description'
    ]
    ordering = ['-created_at']
    
    readonly_fields = ['id', 'style_number', 'created_at', 'updated_at']
    
    inlines = [OrderColorInline]
    
    fieldsets = (
        ('Style Information', {
            'fields': (
                'id', 'order', 'style_number', 'description'
            )
        }),
        ('Fabric Details', {
            'fields': (
                'fabric_type', 'fabric_specifications', 'fabric_composition',
                'gsm', 'finish_type', 'construction', 'cuttable_width'
            )
        }),
        ('Dates', {
            'fields': (
                'etd', 'eta', 'submission_date'
            )
        }),
        ('Additional Information', {
            'fields': (
                'notes',
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
        return queryset.select_related('order')


@admin.register(OrderColor)
class OrderColorAdmin(admin.ModelAdmin):
    """Admin interface for OrderColor model"""
    list_display = [
        'color_code', 'color_name', 'style', 'quantity', 
        'prova_price', 'commission', 'etd', 'created_at'
    ]
    list_filter = ['etd', 'created_at', 'currency']
    search_fields = [
        'color_code', 'color_name', 'style__style_number',
        'style__order__order_number'
    ]
    ordering = ['-created_at']
    
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Color Information', {
            'fields': (
                'id', 'style', 'color_code', 'color_name'
            )
        }),
        ('Quantity', {
            'fields': (
                'quantity', 'unit'
            )
        }),
        ('Pricing', {
            'fields': (
                'mill_name', 'mill_price', 'prova_price', 
                'commission', 'currency'
            )
        }),
        ('Dates', {
            'fields': (
                'etd', 'eta', 'submission_date', 'approval_date'
            )
        }),
        ('Approval Status', {
            'fields': (
                'approval_status',
            )
        }),
        ('Additional Information', {
            'fields': (
                'notes',
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
        return queryset.select_related('style', 'style__order')

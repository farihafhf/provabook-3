from django.contrib import admin
from .models import Sample


@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    list_display = ['id', 'type', 'version', 'order', 'status', 'submission_date', 'created_at']
    list_filter = ['type', 'status', 'created_at']
    search_fields = ['order__order_number', 'order__customer_name', 'awb_number']
    readonly_fields = ['created_at', 'updated_at']
